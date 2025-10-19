# Supabase 设置指南

本指南将帮助您正确设置 Supabase 以启用 AI 旅行规划师应用的用户认证和数据存储功能。

## 为什么需要 Supabase？

Supabase 是一个开源的 Firebase 替代品，为我们的应用提供：
- 用户认证（注册、登录、密码重置）
- 数据库存储（旅行计划、费用记录等）
- 实时数据同步
- 安全的 API 访问

## 创建 Supabase 项目

1. 访问 [Supabase 官网](https://supabase.com/) 并注册/登录账户
2. 点击 "New Project" 创建新项目
3. 填写项目信息：
   - 项目名称：AI Travel Planner
   - 数据库密码：设置一个安全的密码
   - 选择离您最近的地区
4. 点击 "Create New Project" 并等待创建完成（通常需要 1-2 分钟）

## 获取项目凭证

项目创建完成后，您需要获取两个重要凭证：

1. 在项目控制面板中，点击左侧的 "Project Settings"（齿轮图标）
2. 在 "API" 选项卡中找到以下信息：
   - **Project URL**：您的项目 URL
   - **Project API keys**：
     - `anon` `public`：匿名用户访问密钥（用于客户端）
     - `service_role` `secret`：服务端访问密钥（不要在客户端使用）

## 配置环境变量

将获取到的凭证添加到您的 `.env` 文件中：

```env
# Supabase 配置
VITE_SUPABASE_URL=您的项目URL
VITE_SUPABASE_ANON_KEY=您的anon public密钥
```

例如：
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-public-anon-key
```

## 设置数据库表（可选）

如果您想要自定义数据库结构，可以在 Supabase SQL 编辑器中运行以下 SQL 语句创建必要的表：

```sql
-- 旅行计划表
create table travel_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  destination text not null,
  budget numeric(10,2),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 费用记录表
create table expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  plan_id uuid references travel_plans(id),
  title text not null,
  amount numeric(10,2) not null,
  category text not null,
  date date not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 为用户表启用行级安全
alter table travel_plans enable row level security;
alter table expenses enable row level security;

-- 创建行级安全策略
create policy "用户只能查看自己的旅行计划" on travel_plans
  for select using (auth.uid() = user_id);

create policy "用户只能插入自己的旅行计划" on travel_plans
  for insert with check (auth.uid() = user_id);

create policy "用户只能更新自己的旅行计划" on travel_plans
  for update using (auth.uid() = user_id);

create policy "用户只能删除自己的旅行计划" on travel_plans
  for delete using (auth.uid() = user_id);

create policy "用户只能查看自己的费用记录" on expenses
  for select using (auth.uid() = user_id);

create policy "用户只能插入自己的费用记录" on expenses
  for insert with check (auth.uid() = user_id);

create policy "用户只能更新自己的费用记录" on expenses
  for update using (auth.uid() = user_id);

create policy "用户只能删除自己的费用记录" on expenses
  for delete using (auth.uid() = user_id);
```

## 本地开发测试

配置完成后，重新启动开发服务器：

```bash
npm run dev
```

现在您应该能够正常使用用户注册、登录和认证保护的路由功能。

## 故障排除

### 1. "Failed to fetch" 错误
- 检查 `.env` 文件中的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 是否正确
- 确保 URL 以 `https://` 开头
- 确保 API 密钥没有多余的空格或引号

### 2. 用户认证失败
- 检查 Supabase 项目中的 "Authentication" 设置
- 确保启用了 "Email" 登录提供商
- 检查网络连接是否正常

### 3. 数据库访问问题
- 确保已正确设置行级安全策略
- 检查数据库表结构是否正确

## 安全注意事项

1. 永远不要在客户端代码中使用 `service_role` 密钥
2. `.env` 文件不应提交到版本控制系统（已在 `.gitignore` 中忽略）
3. 定期轮换 API 密钥以提高安全性
4. 使用行级安全策略保护用户数据

## 更多资源

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase React 集成指南](https://supabase.com/docs/guides/getting-started/tutorials/with-react)
- [行级安全策略](https://supabase.com/docs/guides/auth/row-level-security)