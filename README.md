# Quiz-2 — Repo prepared for GitHub

This repository contains a quiz platform (FastAPI backend + React frontend). The repo has been prepared for publishing to GitHub: added `.gitignore` and `app/backend/.env.example`.

Quick steps to push to GitHub and run locally

1) Initialize Git and make initial commit

```bash
cd "d:/Quiz-2"
git init
git add .
git commit -m "Initial commit: prepare repo for GitHub"
```

2) Create a repository on GitHub (via web UI). Then add remote and push:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

3) Set secrets locally before running (copy `app/backend/.env.example` to `app/backend/.env` and fill values). Important: rotate the `JWT_SECRET`.

4) Run locally (Windows)

Backend (create venv and install):

```powershell
cd d:\Quiz-2\app\backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Seed and run backend:

```powershell
python seed.py
uvicorn server:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd d:\Quiz-2\app\frontend
npm install
npm start
```

Or use the provided `start-app.ps1` script (adjust paths if needed).

Notes
- Do NOT commit secrets. The current `app/backend/.env` contains a sample JWT secret — replace it and do not push.
- Remove the checked-in virtual environment from Git history if already committed. Recommended commands (run after git init and commit):

```bash
git rm -r --cached app/backend/.venv
echo "app/backend/.venv/" >> .gitignore
git add .gitignore
git commit -m "Remove venv from repo and ignore it"
```
