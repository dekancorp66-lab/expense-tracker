# Expense Tracker Web Application

Full-stack expense tracking application for a software engineering internship project.

**Stack:** React (Vite) + FastAPI + SQLAlchemy + PostgreSQL

## Features

- Authentication: register, login, logout, JWT, bcrypt password hashing, protected routes
- Dashboard: income/expenses totals, balance, savings rate, charts, recent transactions, period selector
- Transactions: full CRUD, filters (type/date/search), categories, payment methods, notes
- Budgets: monthly category budgets, progress indicators, warnings at 80% and exceeded
- Reports: summaries, category breakdowns, monthly trends, CSV export
- Security: users only access own data; server-side validation; no plaintext passwords

## Structure

```
expense-tracker/
├── backend/          # FastAPI
│   ├── app/api/      # auth, transactions, categories, budgets, reports
│   ├── app/core/     # config, security
│   ├── app/db/
│   ├── app/models/
│   ├── app/schemas/
│   ├── requirements.txt
│   └── .env.example
├── frontend/         # React + Vite
│   ├── src/api/
│   ├── src/components/
│   ├── src/context/
│   ├── src/pages/
│   └── package.json
└── README.md
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

## Database setup

```bash
sudo -u postgres psql -c "CREATE USER expenseuser WITH PASSWORD 'expensepass';"
sudo -u postgres psql -c "CREATE DATABASE expensetracker OWNER expenseuser;"
sudo -u postgres psql -d expensetracker -c "GRANT ALL ON SCHEMA public TO expenseuser;"
```

Tables are auto-created on backend start.

## Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit DATABASE_URL and SECRET_KEY
export PYTHONPATH=.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

Use `postgresql+psycopg2://user:pass@host:5432/dbname` for DATABASE_URL.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173  
Optional: `VITE_API_URL=http://127.0.0.1:8000/api/v1` in frontend `.env`.

## API (prefix `/api/v1`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | No | Register |
| POST | /auth/login | No | Login |
| GET | /auth/me | Yes | Current user |
| CRUD | /transactions | Yes | Transactions |
| CRUD | /categories | Yes | Categories |
| CRUD | /budgets | Yes | Budgets |
| GET | /budgets/progress | Yes | Budget progress |
| GET | /reports/summary | Yes | Financial summary |
| GET | /reports/export/csv | Yes | CSV export |

## Testing

Backend was verified in the build environment:

- PostgreSQL tables created
- Register + login (JWT + bcrypt)
- Default categories seeded
- Transaction create + report summary

Run on your machine:

```bash
# Register
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","username":"demo","password":"Demo1234"}'

TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Demo1234"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -s http://127.0.0.1:8000/api/v1/reports/summary -H "Authorization: Bearer $TOKEN"
```

UI checklist: register/login, CRUD transactions, budgets with warnings, reports + CSV, mobile layout, unauthorized redirect.

## Deployment

**Frontend (Vercel/Netlify):** `npm run build`, set `VITE_API_URL` to backend URL, deploy `dist/`.

**Backend (Render/Railway/VPS):** set `DATABASE_URL` and `SECRET_KEY`, run `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, restrict CORS.

## Screenshot checklist

- Login / Register
- Dashboard (cards + charts)
- Transactions table + modal
- Budgets progress
- Reports + export
- Mobile nav

MIT – educational use.
