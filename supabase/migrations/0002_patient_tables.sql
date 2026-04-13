-- Patient-facing B2C tables

-- Daily check-ins
create table checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skin_feel text not null,
  breakouts text not null,
  routine_followed text not null,
  picking text not null,
  mood text not null,
  derm_note text,
  created_at timestamptz not null default now()
);

-- Product library
create table patient_products (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  category text,
  key_ingredients text[],
  flags text[],
  status text not null default 'active' check (status in ('active', 'stopped')),
  start_date date,
  stop_date date,
  stop_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Routine steps
create table routine_steps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  step_name text not null,
  time_of_day text not null check (time_of_day in ('am', 'pm')),
  frequency text not null default 'daily',
  product_id uuid references patient_products(id) on delete set null,
  sort_order integer not null default 0,
  is_paused boolean not null default false,
  usage_notes text not null default '',
  created_at timestamptz not null default now()
);

-- Derm notes
create table derm_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  context text,
  created_at timestamptz not null default now()
);

-- RLS
alter table checkins enable row level security;
alter table patient_products enable row level security;
alter table routine_steps enable row level security;
alter table derm_notes enable row level security;

create policy "checkins_own" on checkins for all using (user_id = auth.uid());
create policy "patient_products_own" on patient_products for all using (user_id = auth.uid());
create policy "routine_steps_own" on routine_steps for all using (user_id = auth.uid());
create policy "derm_notes_own" on derm_notes for all using (user_id = auth.uid());

-- Updated_at trigger for products
create trigger patient_products_updated_at before update on patient_products
  for each row execute function set_updated_at();
