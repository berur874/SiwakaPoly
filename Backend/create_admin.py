"""Run once from the Backend folder to create the first admin: python create_admin.py"""
import getpass

from dotenv import load_dotenv

load_dotenv()

from AuthService import AuthService

username = input("Admin username: ")
password = getpass.getpass("Password (min 8 characters): ")

AuthService().create_user(username, password, "admin")
print("Admin created.")