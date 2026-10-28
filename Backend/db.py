import os
from dotenv import load_dotenv
load_dotenv()
import psycopg2

def get_connection():
    # e.g. postgresql://user:password@localhost:5432/siwakapoly
    return psycopg2.connect(os.environ["DATABASE_URL"])