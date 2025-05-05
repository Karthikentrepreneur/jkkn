-- Create sessions table
create table sessions (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  date timestamp with time zone not null,
  mentor_id uuid references auth.users(id) not null,
  mentee_id uuid references auth.users(id) not null,
  status text check (status in ('upcoming', 'completed', 'cancelled')) default 'upcoming',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create progress table
create table progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  completed_lessons integer default 0,
  total_lessons integer default 10,
  current_streak integer default 0,
  last_activity_date timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create achievements table
create table achievements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  description text,
  icon text,
  created_at timestamp with time zone default now()
);

-- Create notifications table
create table notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  message text not null,
  type text check (type in ('session', 'achievement', 'system')) not null,
  read boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table sessions enable row level security;
alter table progress enable row level security;
alter table achievements enable row level security;
alter table notifications enable row level security;

-- Create policies
create policy "Users can view their own sessions"
  on sessions for select
  using (auth.uid() = mentor_id or auth.uid() = mentee_id);

create policy "Users can view their own progress"
  on progress for select
  using (auth.uid() = user_id);

create policy "Users can view their own achievements"
  on achievements for select
  using (auth.uid() = user_id);

create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

-- Create functions
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers
create trigger update_sessions_updated_at
  before update on sessions
  for each row
  execute function update_updated_at_column();

create trigger update_progress_updated_at
  before update on progress
  for each row
  execute function update_updated_at_column(); 