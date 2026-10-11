import os
import sqlite3
import shutil
import uuid
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from enum import Enum

from database import fetch_ranking, get_db, init_db
from auth import hash_password, verify_password, create_access_token, get_current_admin

app = FastAPI(title="Halloween Costume Voting API")

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]

# Permetti CORS per React (sviluppo locale e da rete mobile)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Assicurati che la cartella degli upload esista e montala come static storage
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
def startup_event():
    """Inizializza il database e crea l'utente admin di default se non esiste."""
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM users WHERE username = ?", ("admin",))
    if not cursor.fetchone():
        # Admin di default: admin / admin123 (Puoi cambiarla a piacere)
        cursor.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            ("admin", hash_password("admin123"))
        )
        conn.commit()
    conn.close()

# --- SCHEMI REQUEST ---
class LoginRequest(BaseModel):
    username: str
    password: str

class VoteRequest(BaseModel):
    gold_costume_id: Optional[int] = Field(default=None, gt=0)
    silver_costume_id: Optional[int] = Field(default=None, gt=0)
    bronze_costume_id: Optional[int] = Field(default=None, gt=0)

# --- STATI ---
class Status(Enum):
    NON_INIZIATA = 'NON_INIZIATA'
    APERTA = 'APERTA'
    CHIUSA = 'CHIUSA'
    RISULTATI = 'RISULTATI'


def get_client_ip(request: Request) -> str:
    """Read the browser IP forwarded by the local/reverse proxy when present."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", maxsplit=1)[0].strip()
    return request.client.host if request.client else "unknown"

# --- ROTTE ADMIN ---
@app.post("/api/admin/login")
def login(data: LoginRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (data.username,))
    user = cursor.fetchone()
    conn.close()

    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    token = create_access_token(data={"sub": user["username"]})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/api/admin/costumes")
def add_costume(
    name: str = Form(...),
    photo: UploadFile = File(...),
    admin: str = Depends(get_current_admin)
):
    # Genera un nome file univoco
    ext = os.path.splitext(photo.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join("uploads", filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)

    image_url = f"/uploads/{filename}"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO costumes (name, image_url) VALUES (?, ?)", (name, image_url))
    conn.commit()
    costume_id = cursor.lastrowid
    conn.close()

    return {"id": costume_id, "name": name, "image_url": image_url}

@app.delete("/api/admin/costumes/{costume_id}")
def delete_costume(costume_id: int, admin: str = Depends(get_current_admin)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM costumes WHERE id = ?", (costume_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Costume non trovato")
        conn.commit()
    except sqlite3.IntegrityError as error:
        conn.rollback()
        raise HTTPException(
            status_code=409,
            detail="Impossibile eliminare un costume che ha già ricevuto voti.",
        ) from error
    finally:
        conn.close()
    return {"status": "ok"}

@app.post("/api/admin/start-voting")
def start_voting(admin: str = Depends(get_current_admin)):
    conn = get_db()
    cursor = conn.cursor()
    new_status = Status.APERTA
    
    cursor.execute("UPDATE settings SET value = ? WHERE key = 'status'", (new_status.value,))
    conn.commit()
    conn.close()

    return {"status": Status.APERTA}

@app.post("/api/admin/stop-voting")
def stop_voting(admin: str = Depends(get_current_admin)):
    conn = get_db()
    cursor = conn.cursor()
    new_status = Status.CHIUSA
    
    cursor.execute("UPDATE settings SET value = ? WHERE key = 'status'", (new_status.value,))
    conn.commit()
    conn.close()

    return {"status": Status.CHIUSA.value}


@app.post("/api/admin/publish-results")
def publish_results(admin: str = Depends(get_current_admin)):
    """Make the results visible to the public voting page."""
    conn = get_db()
    try:
        conn.execute(
            "UPDATE settings SET value = ? WHERE key = 'status'", (Status.RISULTATI.value,)
        )
        conn.commit()
    finally:
        conn.close()
    return {"status": Status.RISULTATI.value}

@app.get("/api/admin/ranking")
def get_ranking(admin: str = Depends(get_current_admin)):
    conn = get_db()
    try:
        ranking = fetch_ranking(conn)
    finally:
        conn.close()
    return {"ranking": ranking}

@app.delete("/api/admin/votes")
def delete_all_votes(admin: str = Depends(get_current_admin)):
    """Remove every recorded vote; costume records remain untouched."""
    conn = get_db()
    try:
        cursor = conn.execute("DELETE FROM votes")
        deleted_count = cursor.rowcount
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return {"status": "ok", "deleted_count": deleted_count}
                        
    

# --- ROTTE PUBBLICHE (UTENTI) ---
@app.get("/api/status")
def get_status():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = 'status'")
    row = cursor.fetchone()
    conn.close()
    return {"status": row["value"] if row else Status.NON_INIZIATA.value}

@app.get("/api/costumes")
def list_costumes():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, image_url FROM costumes ORDER BY id ASC")
    costumes = [dict(row) for row in cursor.fetchall()]
    cursor.execute("SELECT value FROM settings WHERE key = 'status'")
    row = cursor.fetchone()
    conn.close()

    return {
        "costumes": costumes,
        "status": row["value"] if row else Status.NON_INIZIATA.value
    }

@app.post("/api/vote")
def submit_vote(vote: VoteRequest, request: Request):
    conn = get_db()
    cursor = conn.cursor()
    selected_ids = [
        costume_id
        for costume_id in (
            vote.gold_costume_id,
            vote.silver_costume_id,
            vote.bronze_costume_id,
        )
        if costume_id is not None
    ]
    if not selected_ids:
        conn.close()
        raise HTTPException(status_code=422, detail="Assegna almeno una corona.")
    if len(selected_ids) != len(set(selected_ids)):
        conn.close()
        raise HTTPException(status_code=422, detail="Un costume può ricevere una sola corona.")

    # Use an immediate transaction: another request cannot pass the duplicate
    # check between this request's check and insert.
    try:
        cursor.execute("BEGIN IMMEDIATE")
        cursor.execute("SELECT value FROM settings WHERE key = 'status'")
        row = cursor.fetchone()
        if not row or row["value"] != Status.APERTA.value:
            raise HTTPException(status_code=400, detail="Le votazioni sono attualmente chiuse.")

        placeholders = ", ".join("?" for _ in selected_ids)
        cursor.execute(
            f"SELECT COUNT(*) AS count FROM costumes WHERE id IN ({placeholders})",
            selected_ids,
        )
        if cursor.fetchone()["count"] != len(selected_ids):
            raise HTTPException(status_code=422, detail="Uno o più costumi non esistono.")

        device_token = uuid.uuid4().hex
        client_ip = get_client_ip(request)

        cursor.execute(
            """
            INSERT INTO votes (
                device_token, ip_address, gold_costume_id, silver_costume_id, bronze_costume_id
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                device_token,
                client_ip,
                vote.gold_costume_id,
                vote.silver_costume_id,
                vote.bronze_costume_id,
            ),
        )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except sqlite3.IntegrityError as error:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Voto già registrato.") from error
    finally:
        conn.close()

    return {
        "message": "Voto inviato con successo! Grazie per aver partecipato.",
        "assigned_crowns": len(selected_ids),
    }

@app.get("/api/results")
def get_results():
    conn = get_db()
    try:
        results = fetch_ranking(conn, limit=3)
    finally:
        conn.close()
    return {"results": results}
