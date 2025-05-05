-- Create mentor_availability table
create table mentor_availability (
  id uuid default uuid_generate_v4() primary key,
  mentor_id uuid references auth.users(id) not null,
  day_of_week integer check (day_of_week between 0 and 6) not null,
  start_time time not null,
  end_time time not null,
  is_available boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(mentor_id, day_of_week)
);

-- Enable Row Level Security
alter table mentor_availability enable row level security;

-- Create policies
create policy "Users can view any mentor's availability"
  on mentor_availability for select
  using (true);

create policy "Users can manage their own availability"
  on mentor_availability for all
  using (auth.uid() = mentor_id);

-- Create function to check time slot availability
create or replace function check_time_slot_availability(
  p_mentor_id uuid,
  p_date timestamp with time zone,
  p_start_time time,
  p_end_time time
) returns boolean as $$
declare
  v_day_of_week integer;
  v_available boolean;
  v_existing_sessions integer;
begin
  -- Get day of week (0-6, where 0 is Sunday)
  v_day_of_week := extract(dow from p_date);

  -- Check if mentor is available on this day
  select is_available into v_available
  from mentor_availability
  where mentor_id = p_mentor_id
    and day_of_week = v_day_of_week;

  if not v_available then
    return false;
  end if;

  -- Check if time slot is within mentor's working hours
  select exists (
    select 1
    from mentor_availability
    where mentor_id = p_mentor_id
      and day_of_week = v_day_of_week
      and start_time <= p_start_time
      and end_time >= p_end_time
  ) into v_available;

  if not v_available then
    return false;
  end if;

  -- Check for existing sessions
  select count(*)
  into v_existing_sessions
  from sessions
  where mentor_id = p_mentor_id
    and date::date = p_date::date
    and (
      (date::time, date::time + interval '1 hour') overlaps
      (p_start_time, p_end_time)
    )
    and status = 'upcoming';

  return v_existing_sessions = 0;
end;
$$ language plpgsql;

-- Create trigger to update updated_at
create trigger update_mentor_availability_updated_at
  before update on mentor_availability
  for each row
  execute function update_updated_at_column(); 