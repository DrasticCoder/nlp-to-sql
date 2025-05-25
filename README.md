# 🧠 NLP-to-SQL Todo Manager

Manage your todo list using plain English (or soon, voice commands)! This app takes your natural language, turns it into SQL using Groq AI, validates it via Gemini, and runs it on a Supabase-backed todo app.

> 🌐 Live Demo: [https://nlp2sql.drasticcoder.in](https://nlp2sql.drasticcoder.in)  
> 💻 GitHub Repo: [github.com/DrasticCoder/nlp-to-sql](https://github.com/DrasticCoder/nlp-to-sql)

---

## 📌 Overview

- Convert user input like _"add a task to call mom tomorrow"_ into valid SQL.
- Execute AI-generated SQL on a Supabase database.
- Powered by **Next.js**, **TypeScript**, **Tailwind**, and **AI APIs**.

---

## 🛠 Tech Stack

| Layer           | Tech                              | Purpose                     |
| --------------- | --------------------------------- | --------------------------- |
| Frontend        | Next.js (App Router) + TypeScript | UI + State Mgmt             |
| Styling         | Tailwind CSS + ShadCN UI          | Component Styling           |
| Database        | Supabase (PostgreSQL)             | Data Persistence            |
| AI (SQL Gen)    | Groq (LLaMA 3)                    | Natural Language → SQL      |
| AI (Validation) | Google Gemini                     | SQL Safety & Semantic Check |
| ORM             | Supabase JS Client + RPC          | SQL Execution               |

---

## 📂 Folder Structure

```bash
src/
├── app/
│   └── page.tsx               # Main page with chat and todo interface
├── components/
│   ├── chat-interface.tsx     # NLP chat input and response area
│   ├── todo-form.tsx          # Modal to add/edit todos
│   ├── todo-list.tsx          # Todo items display and control
├── lib/
│   └── supabaseClient.ts      # Supabase configuration
├── api/
│   └── query/route.ts         # API route: text → SQL → validated → executed
```

---

## ⚙️ Setup Guide

### 1. Clone & Install

```bash
git clone https://github.com/DrasticCoder/nlp-to-sql.git
cd nlp-to-sql
npm install
```

### 2. Environment Variables

Create a `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key
```

---

## 🧱 Supabase Setup

1. Create a `todos` table:

```sql
create table todos (
  id serial primary key,
  title text not null,
  completed boolean default false,
  created_at timestamp default now()
);
```

2. (Optional) Create an RPC function for raw SQL:

```sql
create or replace function raw_sql_runner(query text)
returns setof record
language plpgsql
as $$
begin
  return query execute query;
end;
$$;
```

---

## 🔍 Natural Language Flow

1. User types query (e.g. "Show me incomplete tasks")
2. Backend flow:

   - Preprocessing: lowercase, clean, tokenize
   - Intent Classification (CRUD)
   - **Groq API** → generates SQL
   - **Gemini API** → validates SQL
   - SQL is executed via Supabase RPC

3. Response is shown in frontend

---

## 🧩 Components

### ✅ `TodoList`

- Display all todos with checkboxes
- Edit/Delete options

### 📝 `TodoForm`

- Modal popup to add or edit tasks

### 💬 `ChatInterface`

- NLP input box
- Shows AI response and executed query

---

## ✔️ Features

| Feature                     | Status |
| --------------------------- | ------ |
| Add/Edit/Delete Todos       | ✅     |
| Complete/Incomplete toggle  | ✅     |
| Use NLP to control data     | ✅     |
| AI-based SQL generation     | ✅     |
| SQL validation via Gemini   | ✅     |
| Fully typed w/ TypeScript   | ✅     |
| Tailwind & ShadCN styled UI | ✅     |

---

## 🚫 Known Issues

- Gemini API may return 502 during high load (use fallback)
- Raw SQL execution via RPC must be sandboxed in prod
- Rate limits apply on Groq and Gemini APIs

---

## 🌱 Future Plans

- ✅ Voice command integration (Web Speech API)
- 🔒 Supabase Auth for login/logout
- 📜 Query history and undo
- ⚡ Optimistic UI updates
- 🧠 Local AI fallback (in case APIs fail)

---

## 📣 Credits

- 👨‍💻 Built by: [@DrasticCoder](https://github.com/DrasticCoder)
- 🧠 NLP-to-SQL inspiration: OpenGig interview with Mr. Sourabh Mishra

---
