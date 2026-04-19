-- Run this in your Supabase SQL Editor

-- 1. Enable pgvector
create extension if not exists vector;

-- 2. Create foundational tables if they don't exist
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  content text,
  embedding vector(1536)
);

create table if not exists user_chats (
  id uuid primary key default gen_random_uuid(),
  user_id text not null, -- Initialized as text
  title text not null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_hidden boolean default false not null
);

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id text not null, -- Initialized as text
  key text unique not null,
  name text not null default 'Production Key',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Clerk + Supabase Integration Helper
create or replace function requesting_user_id()
returns text
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$;

-- 4. DROP DEPENDENT POLICIES FIRST
-- We must drop the policies that depend on the user_id column BEFORE we alter its type.
DROP POLICY IF EXISTS "Users can view their own chats" ON user_chats;
DROP POLICY IF EXISTS "Users can insert their own chats" ON user_chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON user_chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON user_chats;

DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON api_keys;

-- 5. MIGRATION: Now safely cast them to text and drop the auth.users foreign key
ALTER TABLE IF EXISTS user_chats DROP CONSTRAINT IF EXISTS user_chats_user_id_fkey;
ALTER TABLE IF EXISTS user_chats ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE IF EXISTS api_keys DROP CONSTRAINT IF EXISTS api_keys_user_id_fkey;
ALTER TABLE IF EXISTS api_keys ALTER COLUMN user_id TYPE text USING user_id::text;

-- 6. Enable RLS and Create New Policies matching Clerk's requesting_user_id()
alter table user_chats enable row level security;
alter table api_keys enable row level security;

create policy "Users can view their own chats" on user_chats for select using (requesting_user_id() = user_id);
create policy "Users can insert their own chats" on user_chats for insert with check (requesting_user_id() = user_id);
create policy "Users can update their own chats" on user_chats for update using (requesting_user_id() = user_id);
create policy "Users can delete their own chats" on user_chats for delete using (requesting_user_id() = user_id);

create policy "Users can view their own API keys" on api_keys for select using (requesting_user_id() = user_id);
create policy "Users can insert their own API keys" on api_keys for insert with check (requesting_user_id() = user_id);
create policy "Users can delete their own API keys" on api_keys for delete using (requesting_user_id() = user_id);

-- 7. Reset and configure Realtime publication
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table user_chats;

-- 8. Helper Functions
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;
