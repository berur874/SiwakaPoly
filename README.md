# SiwakaPoly

## Backend setup (Windows PowerShell)

From the repository root, create and activate a virtual environment, install dependencies, and create the local environment file:

```powershell
cd Backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `Backend\.env` (not `.env.example`) and set:

- `SECRET_KEY` to a random value. Generate one with `py -c "import secrets; print(secrets.token_hex(32))"`.
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from your Supabase project.

Keep the Supabase service key private and do not put it in frontend code. Then start the backend from the `Backend` directory:

```powershell
py app.py
```

Start the frontend in a separate terminal from the repository root with `npm run dev`.
