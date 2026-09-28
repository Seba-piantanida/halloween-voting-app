"""SQLite database setup and schema contract for the voting application."""

import os
import sqlite3
from pathlib import Path
from typing import Optional


# The API only uses these English, plural table names. `validate_schema`
# makes an accidental table/column mismatch fail at boot rather than later.
SCHEMA_VERSION = 2
EXPECTED_COLUMNS = {
    "users": {"id", "username", "password_hash"},
    "costumes": {"id", "name", "image_url", "created_at"},
    "settings": {"key", "value"},
    "votes": {
        "id",
        "device_token",
        "ip_address",
        "gold_costume_id",
        "silver_costume_id",
        "bronze_costume_id",
        "created_at",
    },
}

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "halloween.db"
DB_PATH = Path(os.getenv("HALLOWEEN_DB_PATH", DEFAULT_DB_PATH))


def get_db() -> sqlite3.Connection:
    """Return a SQLite connection with foreign keys enabled."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def validate_schema(conn: sqlite3.Connection) -> None:
    """Fail early when the database does not match the backend query contract."""
    for table, expected_columns in EXPECTED_COLUMNS.items():
        row = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (table,)
        ).fetchone()
        if row is None:
            raise RuntimeError(f"Database schema error: missing table '{table}'.")

        actual_columns = {
            column["name"] for column in conn.execute(f"PRAGMA table_info({table})")
        }
        missing = expected_columns - actual_columns
        if missing:
            missing_names = ", ".join(sorted(missing))
            raise RuntimeError(
                f"Database schema error: table '{table}' is missing: {missing_names}."
            )


def fetch_ranking(conn: sqlite3.Connection, limit: Optional[int] = None) -> list[dict]:
    """Calculate ranking values in one query against the canonical schema."""
    query = """
        SELECT
            c.id,
            c.name,
            c.image_url,
            SUM(CASE WHEN v.gold_costume_id = c.id THEN 1 ELSE 0 END) AS gold,
            SUM(CASE WHEN v.silver_costume_id = c.id THEN 1 ELSE 0 END) AS silver,
            SUM(CASE WHEN v.bronze_costume_id = c.id THEN 1 ELSE 0 END) AS bronze,
            SUM(CASE
                WHEN v.gold_costume_id = c.id THEN 3
                WHEN v.silver_costume_id = c.id THEN 2
                WHEN v.bronze_costume_id = c.id THEN 1
                ELSE 0
            END) AS score
        FROM costumes AS c
        LEFT JOIN votes AS v
            ON c.id IN (v.gold_costume_id, v.silver_costume_id, v.bronze_costume_id)
        GROUP BY c.id, c.name, c.image_url
        ORDER BY score DESC, gold DESC, silver DESC, bronze DESC, c.id ASC
    """
    params = ()
    if limit is not None:
        query += " LIMIT ?"
        params = (limit,)
    return [dict(row) for row in conn.execute(query, params).fetchall()]


def _votes_have_foreign_keys(conn: sqlite3.Connection) -> bool:
    foreign_key_columns = {
        row["from"] for row in conn.execute("PRAGMA foreign_key_list(votes)")
    }
    return {
        "gold_costume_id",
        "silver_costume_id",
        "bronze_costume_id",
    }.issubset(foreign_key_columns)


def _migrate_votes_foreign_keys(conn: sqlite3.Connection) -> None:
    """Rebuild the legacy `votes` table once to add its FK constraints."""
    if _votes_have_foreign_keys(conn):
        return

    invalid_vote = conn.execute(
        """
        SELECT id FROM votes
        WHERE (gold_costume_id IS NOT NULL AND gold_costume_id NOT IN (SELECT id FROM costumes))
           OR (silver_costume_id IS NOT NULL AND silver_costume_id NOT IN (SELECT id FROM costumes))
           OR (bronze_costume_id IS NOT NULL AND bronze_costume_id NOT IN (SELECT id FROM costumes))
        LIMIT 1
        """
    ).fetchone()
    if invalid_vote:
        raise RuntimeError(
            f"Cannot migrate votes: vote {invalid_vote['id']} references a missing costume."
        )

    conn.execute("ALTER TABLE votes RENAME TO votes_legacy")
    conn.execute(
        """
        CREATE TABLE votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_token TEXT UNIQUE NOT NULL,
            ip_address TEXT NOT NULL,
            gold_costume_id INTEGER REFERENCES costumes(id) ON DELETE RESTRICT,
            silver_costume_id INTEGER REFERENCES costumes(id) ON DELETE RESTRICT,
            bronze_costume_id INTEGER REFERENCES costumes(id) ON DELETE RESTRICT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.execute(
        """
        INSERT INTO votes (
            id, device_token, ip_address, gold_costume_id,
            silver_costume_id, bronze_costume_id, created_at
        )
        SELECT
            id, device_token, ip_address, gold_costume_id,
            silver_costume_id, bronze_costume_id, created_at
        FROM votes_legacy
        """
    )
    conn.execute("DROP TABLE votes_legacy")


def init_db() -> None:
    """Apply the canonical schema and validate it before serving requests.

    Existing canonical tables are never dropped or rewritten. This makes startup
    safe while surfacing incompatible legacy databases explicitly.
    """
    conn = get_db()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS costumes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                image_url TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_token TEXT UNIQUE NOT NULL,
                ip_address TEXT NOT NULL,
                gold_costume_id INTEGER REFERENCES costumes(id) ON DELETE RESTRICT,
                silver_costume_id INTEGER REFERENCES costumes(id) ON DELETE RESTRICT,
                bronze_costume_id INTEGER REFERENCES costumes(id) ON DELETE RESTRICT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            """
        )
        validate_schema(conn)
        _migrate_votes_foreign_keys(conn)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_votes_ip_address ON votes(ip_address)")
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
            ("status", "NON_INIZIATA"),
        )
        conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    init_db()
    print("Database SQLite inizializzato e verificato con successo!")
