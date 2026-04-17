-- Run this in your Supabase SQL Editor

-- Run this first to enable vector comparison
create extension if not exists vector;

-- Create table for storing document embeddings
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  content text,
  embedding vector(1536)
);

-- Drop the old conversations table if it exists as it lacked user_id
drop table if exists conversations;

-- Create table for proper user conversations
create table if not exists user_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security) so users only see their own chats
alter table user_chats enable row level security;

create policy "Users can view their own chats" on user_chats for select using (auth.uid() = user_id);
create policy "Users can insert their own chats" on user_chats for insert with check (auth.uid() = user_id);
create policy "Users can update their own chats" on user_chats for update using (auth.uid() = user_id);
create policy "Users can delete their own chats" on user_chats for delete using (auth.uid() = user_id);

-- Create a realtime publication for the user_chats table
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table user_chats;

-- Vector similarity search function for RAG
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

-- Create table for managing third-party Developer API Keys
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  key text unique not null,
  name text not null default 'Production Key',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for api_keys
alter table api_keys enable row level security;

create policy "Users can view their own API keys" on api_keys for select using (auth.uid() = user_id);
create policy "Users can insert their own API keys" on api_keys for insert with check (auth.uid() = user_id);
create policy "Users can delete their own API keys" on api_keys for delete using (auth.uid() = user_id);

-- Soft delete functionality for chats
alter table user_chats add column if not exists is_hidden boolean default false not null;

