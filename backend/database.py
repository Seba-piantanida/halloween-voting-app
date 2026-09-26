import sqlite3
import os

DB_PATH = "halloween.db"

def get_db():
    """Restituisce una connessione al database SQLite."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Consente di accedere alle colonne per nome (dict-like)
    return conn

def init_db():
    """Crea le tabelle del database se non esistono già."""
    conn = get_db()
    cursor = conn.cursor()

    # 1. Tabella Admin
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS utenti (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    """)

    # 2. Tabella Costumi
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS costumi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            image_url TEXT NOT NULL,
            time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 3. Tabella Impostazioni (Stato Votazione)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)
    # Inizializza lo stato votazioni a 'false' se non esiste
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('status', 'NON_INIZIATA')")

    # 4. Tabella Voti
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS voti (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            costume_id INTEGER REFERENCES costumi(id),
            gold_count INTEGER,
            silver_count INTEGER,
            bronze_count INTEGER
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS urers_vote (
            vote_id INTEGER PRIMARY KEY,
            device_token TEXT UNIQUE NOT NULL,
            gold_id INTEGER REFERENCES costumi(id),
            siler_id INTEGER REFERENCES costumi(id),
            bornze_id INTEGER REFERENCES costumi(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """

    )

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database SQLite inizializzato con successo!")
