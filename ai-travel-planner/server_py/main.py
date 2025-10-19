import os
import json
import asyncio
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, Path, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set. Create server_py/.env from .env.example")

SYNC_API_KEY = os.getenv("SYNC_API_KEY", "")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_IPS = os.getenv("ALLOWED_IPS", "").strip()

pool: Optional[asyncpg.Pool] = None

app = FastAPI(title="AI Travel Planner Sync API (Python)")

# CORS：支持白名单
if ALLOWED_ORIGINS and ALLOWED_ORIGINS != "*":
    origins = [o.strip() for o in ALLOWED_ORIGINS.split(",") if o.strip()]
else:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False if origins == ["*"] else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- 数据模型（尽量宽松，对接前端现有结构） ----------
class TravelPlanModel(BaseModel):
    id: str
    user_id: str
    title: str
    destination: str
    start_date: str
    end_date: str
    budget: float
    travelers: int
    preferences: List[Any] = Field(default_factory=list)
    itinerary: List[Any] = Field(default_factory=list)
    expenses: List[Any] = Field(default_factory=list)
    created_at: str
    updated_at: str

class ExpenseModel(BaseModel):
    id: str
    travel_plan_id: str
    category: str
    amount: float
    description: str
    date: str
    location: Optional[Dict[str, Any]] = None

# ---------- 启动与建表 ----------
CREATE_TRAVEL_PLANS_SQL = """
create table if not exists public.travel_plans (
  id text primary key,
  user_id text not null,
  title text not null,
  destination text not null,
  start_date text not null,
  end_date text not null,
  budget numeric not null,
  travelers int not null,
  preferences jsonb not null,
  itinerary jsonb not null,
  expenses jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
"""

CREATE_EXPENSES_SQL = """
create table if not exists public.expenses (
  id text primary key,
  travel_plan_id text not null references public.travel_plans(id) on delete cascade,
  category text not null,
  amount numeric not null,
  description text not null,
  date text not null,
  location jsonb
);
"""

async def ensure_tables(conn: asyncpg.Connection):
    await conn.execute(CREATE_TRAVEL_PLANS_SQL)
    await conn.execute(CREATE_EXPENSES_SQL)

@app.on_event("startup")
async def on_startup():
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5, command_timeout=30)
    async with pool.acquire() as conn:
        await ensure_tables(conn)

@app.on_event("shutdown")
async def on_shutdown():
    global pool
    if pool:
        await pool.close()
        pool = None

# ---------- 帮助函数 ----------
def _json(v: Any) -> str:
    return json.dumps(v, ensure_ascii=False)

def require_pool() -> asyncpg.Pool:
    if pool is None:
        # 这里抛出 500，表示服务未就绪
        raise RuntimeError("Database pool is not initialized")
    return pool

def _client_ip(request: Request) -> str:
    # 简单获取客户端 IP，若有反代可读取 X-Forwarded-For 第一段
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else ""

@app.middleware("http")
async def auth_and_whitelist(request: Request, call_next):
    path = request.url.path or ""
    if path.startswith("/api/"):
        # 鉴权：当 SYNC_API_KEY 设置时必须匹配 X-API-KEY
        if SYNC_API_KEY:
            provided = request.headers.get("x-api-key", "")
            if provided != SYNC_API_KEY:
                return JSONResponse({"error": "unauthorized"}, status_code=401)

        # IP 白名单（可选）：ALLOWED_IPS 非空时启用
        if ALLOWED_IPS:
            allowed_ips = [ip.strip() for ip in ALLOWED_IPS.split(",") if ip.strip()]
            cip = _client_ip(request)
            if allowed_ips and cip not in allowed_ips:
                return JSONResponse({"error": "forbidden"}, status_code=403)
    return await call_next(request)

# ---------- 路由：健康检查 ----------
@app.get("/health")
async def health():
    return {"ok": True}

# ---------- 路由：Travel Plans ----------
@app.get("/api/travel_plans")
async def list_plans(user_id: str = Query(..., description="用户ID")):
    try:
        async with require_pool().acquire() as conn:
            rows = await conn.fetch(
                "select * from public.travel_plans where user_id = $1",
                user_id,
            )
            # asyncpg Record -> dict（jsonb 已是原生 dict/list）
            return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail="server_error")

@app.post("/api/travel_plans")
async def upsert_plan(plan: TravelPlanModel):
    try:
        async with require_pool().acquire() as conn:
            exists = await conn.fetchval(
                "select 1 from public.travel_plans where id = $1 limit 1",
                plan.id,
            )
            if exists:
                await conn.execute(
                    """
                    update public.travel_plans set
                      user_id = $1,
                      title = $2,
                      destination = $3,
                      start_date = $4,
                      end_date = $5,
                      budget = $6,
                      travelers = $7,
                      preferences = $8,
                      itinerary = $9,
                      expenses = $10,
                      created_at = $11,
                      updated_at = $12
                    where id = $13
                    """,
                    plan.user_id, plan.title, plan.destination, plan.start_date, plan.end_date,
                    plan.budget, plan.travelers, plan.preferences, plan.itinerary, plan.expenses,
                    plan.created_at, plan.updated_at, plan.id
                )
            else:
                await conn.execute(
                    """
                    insert into public.travel_plans (
                      id, user_id, title, destination, start_date, end_date, budget, travelers,
                      preferences, itinerary, expenses, created_at, updated_at
                    ) values (
                      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
                    )
                    """,
                    plan.id, plan.user_id, plan.title, plan.destination, plan.start_date, plan.end_date,
                    plan.budget, plan.travelers, plan.preferences, plan.itinerary, plan.expenses,
                    plan.created_at, plan.updated_at
                )
            return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="server_error")

@app.patch("/api/travel_plans/{plan_id}")
async def patch_plan(
    plan_id: str = Path(..., description="Plan ID"),
    updates: Dict[str, Any] = {},
):
    if not updates:
        return {"ok": True}
    # 仅允许已知字段
    allowed = {
        "user_id","title","destination","start_date","end_date","budget","travelers",
        "preferences","itinerary","expenses","created_at","updated_at"
    }
    fields = [k for k in updates.keys() if k in allowed]
    if not fields:
        return {"ok": True}
    sets = ", ".join([f"{k} = ${i+1}" for i, k in enumerate(fields)])
    values = [updates[k] for k in fields]
    try:
        async with require_pool().acquire() as conn:
            await conn.execute(
                f"update public.travel_plans set {sets} where id = ${len(fields)+1}",
                *values, plan_id
            )
            return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="server_error")

@app.delete("/api/travel_plans/{plan_id}")
async def delete_plan(plan_id: str):
    try:
        async with require_pool().acquire() as conn:
            await conn.execute("delete from public.travel_plans where id = $1", plan_id)
            return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="server_error")

# ---------- 路由：Expenses ----------
@app.get("/api/expenses")
async def list_expenses(travel_plan_id: str = Query(..., description="Plan ID")):
    try:
        async with require_pool().acquire() as conn:
            rows = await conn.fetch(
                "select * from public.expenses where travel_plan_id = $1",
                travel_plan_id
            )
            return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail="server_error")

@app.post("/api/expenses")
async def upsert_expense(expense: ExpenseModel):
    try:
        async with require_pool().acquire() as conn:
            exists = await conn.fetchval(
                "select 1 from public.expenses where id = $1 limit 1",
                expense.id
            )
            if exists:
                await conn.execute(
                    """
                    update public.expenses set
                      travel_plan_id = $1,
                      category = $2,
                      amount = $3,
                      description = $4,
                      date = $5,
                      location = $6
                    where id = $7
                    """,
                    expense.travel_plan_id, expense.category, expense.amount,
                    expense.description, expense.date, expense.location, expense.id
                )
            else:
                await conn.execute(
                    """
                    insert into public.expenses (
                      id, travel_plan_id, category, amount, description, date, location
                    ) values ($1,$2,$3,$4,$5,$6,$7)
                    """,
                    expense.id, expense.travel_plan_id, expense.category,
                    expense.amount, expense.description, expense.date, expense.location
                )
            return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="server_error")

@app.patch("/api/expenses/{expense_id}")
async def patch_expense(
    expense_id: str = Path(..., description="Expense ID"),
    updates: Dict[str, Any] = {},
):
    if not updates:
        return {"ok": True}
    allowed = {"travel_plan_id","category","amount","description","date","location"}
    fields = [k for k in updates.keys() if k in allowed]
    if not fields:
        return {"ok": True}
    sets = ", ".join([f"{k} = ${i+1}" for i, k in enumerate(fields)])
    values = [updates[k] for k in fields]
    try:
        async with require_pool().acquire() as conn:
            await conn.execute(
                f"update public.expenses set {sets} where id = ${len(fields)+1}",
                *values, expense_id
            )
            return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="server_error")

@app.delete("/api/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    try:
        async with require_pool().acquire() as conn:
            await conn.execute("delete from public.expenses where id = $1", expense_id)
            return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail="server_error")