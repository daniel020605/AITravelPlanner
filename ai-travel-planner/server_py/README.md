# AI Travel Planner Python Sync Server

A minimal FastAPI + asyncpg service that talks directly to Supabase Postgres via DATABASE_URL.

## Setup

1) cd ai-travel-planner/server_py
2) python -m venv .venv && source .venv/bin/activate  (Windows: .venv\Scripts\activate)
3) pip install -r requirements.txt
4) cp .env.example .env  and set DATABASE_URL
5) uvicorn main:app --host 0.0.0.0 --port ${UVICORN_PORT:-8000} --reload

On first run, it auto-creates tables:
- public.travel_plans
- public.expenses

## Endpoints

- GET    /health
- GET    /api/travel_plans?user_id=...
- POST   /api/travel_plans        (upsert by id)
- PATCH  /api/travel_plans/{id}
- DELETE /api/travel_plans/{id}

- GET    /api/expenses?travel_plan_id=...
- POST   /api/expenses            (upsert by id)
- PATCH  /api/expenses/{id}
- DELETE /api/expenses/{id}

## Frontend

In app Settings -> Data Sync, set "同步服务地址" to http://localhost:8000