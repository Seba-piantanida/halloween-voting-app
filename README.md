# 🎃 Halloween Costume Voting Mobile App

Web app mobile semplice e performante per votare il miglior costume di Halloween!

## 🚀 Struttura del Progetto

```
halloween-voting-app/
├── backend/                  # FastAPI + SQLite3 + JWT
│   ├── main.py               # Entrypoint API (Rotte Admin, Votazione, Podio)
│   ├── database.py           # Inizializzazione SQLite e schemi tabelle
│   ├── auth.py               # Hashing password (bcrypt) e Token JWT
│   ├── requirements.txt      # Dipendenze Python
│   └── uploads/              # Foto dei costumi caricate dagli utenti/admin
└── frontend/                 # React (Vite) - Mobile First
    ├── src/
    │   ├── App.jsx           # Componente principale (Carosello, Corone, Podio)
    │   ├── api.js            # Axios client con token JWT
    │   ├── index.css         # Styling dark mode Halloween
    │   └── main.jsx          # Mount React
    ├── package.json
    └── vite.config.js        # Proxy API verso FastAPI (port 8000)
```

---

## 🛠️ Come Avviare l'Applicazione

### 1. Avviare il Backend Python (FastAPI)

Dalla cartella `backend/`:

```bash
cd backend
python3 main.py
# oppure con uvicorn:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- **API Documentation (Swagger UI)**: `http://localhost:8000/docs`
- **Credenziali Admin di Default**:
  - **Username**: `admin`
  - **Password**: `admin123`

---

### 2. Avviare il Frontend React (Mobile-First)

Dalla cartella `frontend/`:

```bash
cd frontend
npm install
npm run dev
```

Apri sul browser dello smartphone o del computer (con la modalità mobile dei DevTools): `http://localhost:3000`

---

## 📱 Funzionalità Implementate

1. **🔒 Autenticazione Admin (JWT)**: Login protetto con password hashata in DB.
2. **📸 Caricamento Foto & Partecipanti**: L'admin può scattare o caricare le foto dei costumi direttamente dallo smartphone.
3. **⚡ Avvio/Stop Votazioni**: L'admin controlla l'apertura e chiusura delle votazioni in tempo reale.
4. **👑 Votazione con 3 Corone (Oro 🥇, Argento 🥈, Bronzo 🥉)**:
   - Carosello di scorrimento delle foto.
   - Gli utenti possono assegnare fino a 3 corone tra i vari partecipanti.
   - Pulsante di spunta in alto a destra per confermare e inviare il voto.
5. **🚫 Blocco Doppio Voto**: Tracciamento tramite Cookie + Device Token + Indirizzo IP per impedire voti multipli dallo stesso telefono.
6. **🏆 Podio dei Vincitori**: Quando l'admin interrompe le votazioni, l'app mostra automaticamente il podio con i 3 migliori costumi classificati.
