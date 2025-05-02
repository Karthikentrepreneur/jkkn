-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade,
  full_name text,
  role text check (role in ('student', 'mentor', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Create services table
create table services (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  mentor_id uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create counselling_sessions table
create table counselling_sessions (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references profiles(id),
  mentor_id uuid references profiles(id),
  date_time timestamp with time zone not null,
  status text check (status in ('scheduled', 'completed', 'cancelled')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create requests table
create table requests (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references profiles(id),
  service_id uuid references services(id),
  status text check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;
alter table services enable row level security;
alter table counselling_sessions enable row level security;
alter table requests enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Services policies
create policy "Services are viewable by everyone."
  on services for select
  using ( true );

create policy "Mentors can create services."
  on services for insert
  with check ( auth.uid() in (select id from profiles where role = 'mentor') );

create policy "Mentors can update their own services."
  on services for update
  using ( mentor_id = auth.uid() );

-- Counselling sessions policies
create policy "Users can view their own counselling sessions."
  on counselling_sessions for select
  using ( student_id = auth.uid() or mentor_id = auth.uid() );

create policy "Students can create counselling sessions."
  on counselling_sessions for insert
  with check ( auth.uid() in (select id from profiles where role = 'student') );

create policy "Mentors can update counselling sessions they're involved in."
  on counselling_sessions for update
  using ( mentor_id = auth.uid() );

-- Requests policies
create policy "Users can view their own requests."
  on requests for select
  using ( student_id = auth.uid() );

create policy "Students can create requests."
  on requests for insert
  with check ( auth.uid() in (select id from profiles where role = 'student') );

create policy "Mentors can update requests for their services."
  on requests for update
  using ( service_id in (select id from services where mentor_id = auth.uid()) );

-- Create updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger handle_updated_at
  before update on profiles
  for each row
  execute procedure public.handle_updated_at();

create trigger handle_updated_at
  before update on services
  for each row
  execute procedure public.handle_updated_at();

create trigger handle_updated_at
  before update on counselling_sessions
  for each row
  execute procedure public.handle_updated_at();

create trigger handle_updated_at
  before update on requests
  for each row
  execute procedure public.handle_updated_at(); 