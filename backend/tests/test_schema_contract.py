"""Regression tests for the SQLite schema/query contract.

Run from the repository root with:
    python3 -m unittest discover -s backend/tests
"""

import sys
import tempfile
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import database  # noqa: E402


class SchemaContractTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_db_path = database.DB_PATH
        database.DB_PATH = Path(self.temp_dir.name) / "test.db"
        database.init_db()

    def tearDown(self):
        database.DB_PATH = self.original_db_path
        self.temp_dir.cleanup()

    def test_canonical_tables_and_columns_are_created(self):
        conn = database.get_db()
        try:
            database.validate_schema(conn)
            vote_foreign_keys = {
                row["from"] for row in conn.execute("PRAGMA foreign_key_list(votes)")
            }
            actual_tables = {
                row["name"]
                for row in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                )
            }
        finally:
            conn.close()

        self.assertTrue(set(database.EXPECTED_COLUMNS).issubset(actual_tables))
        self.assertEqual(
            vote_foreign_keys,
            {"gold_costume_id", "silver_costume_id", "bronze_costume_id"},
        )

    def test_ranking_query_uses_the_vote_columns_from_the_contract(self):
        conn = database.get_db()
        try:
            conn.executemany(
                "INSERT INTO costumes (name, image_url) VALUES (?, ?)",
                [("Mummia", "/mummia.jpg"), ("Vampiro", "/vampiro.jpg")],
            )
            conn.execute(
                """
                INSERT INTO votes (
                    device_token, ip_address, gold_costume_id,
                    silver_costume_id, bronze_costume_id
                ) VALUES (?, ?, ?, ?, ?)
                """,
                ("device-1", "192.0.2.1", 2, 1, None),
            )
            conn.commit()

            ranking = database.fetch_ranking(conn)
        finally:
            conn.close()

        self.assertEqual([entry["name"] for entry in ranking], ["Vampiro", "Mummia"])
        self.assertEqual([entry["score"] for entry in ranking], [3, 2])


if __name__ == "__main__":
    unittest.main()
