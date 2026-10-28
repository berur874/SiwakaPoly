import hashlib
import hmac
import os
import psycopg2
from db import get_connection


class StudentService:
    def __init__(self, get_conn=get_connection):
        self.get_conn = get_conn  # injected, so tests can swap it

    @staticmethod
    def _hash_password(password, salt):
        return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)

    def register(self, student_id, name, password):
        salt = os.urandom(16)
        password_hash = self._hash_password(password, salt)
        conn = self.get_conn()
        try:
            with conn, conn.cursor() as cur:  # commits or rolls back
                cur.execute(
                    "INSERT INTO students (student_id, name, salt, password_hash) "
                    "VALUES (%s, %s, %s, %s)",
                    (student_id, name, salt, password_hash),
                )
            return True
        except psycopg2.errors.UniqueViolation:
            return False
        finally:
            conn.close()

    def login(self, student_id, password):
        conn = self.get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT salt, password_hash FROM students WHERE student_id = %s",
                    (student_id,),
                )
                row = cur.fetchone()
        finally:
            conn.close()

        if row is None:
            return False
        salt, stored_hash = bytes(row[0]), bytes(row[1])  # psycopg2 returns memoryview
        return hmac.compare_digest(stored_hash, self._hash_password(password, salt))