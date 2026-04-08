-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Clinics
create table clinics (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null,
  email text not null,
  address text not null default '',
  vapi_assistant_id text,
  twilio_phone_number text,
  created_at timestamptz not null default now()
);

-- Link auth users to clinics (one user = one clinic for now)
create table clinic_users (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  unique(user_id, clinic_id)
);

-- Patients
create table patients (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  date_of_birth date,
  notes text,
  gdpr_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Appointments
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  treatment text not null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60,
  status text not null default 'scheduled'
    check (status in ('scheduled','confirmed','cancelled','completed','no_show')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Call logs (from VAPI)
create table call_logs (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  vapi_call_id text not null unique,
  direction text not null check (direction in ('inbound','outbound')),
  from_number text not null,
  to_number text not null,
  duration_seconds integer,
  transcript text,
  summary text,
  status text not null default 'in_progress'
    check (status in ('in_progress','completed','failed')),
  started_at timestamptz not null,
  ended_at timestamptz
);

-- SMS logs (from Twilio)
create table sms_logs (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  twilio_sid text not null unique,
  direction text not null check (direction in ('inbound','outbound')),
  from_number text not null,
  to_number text not null,
  body text not null,
  status text not null default 'queued'
    check (status in ('queued','sent','delivered','failed','received')),
  sent_at timestamptz not null
);

-- Row-level security
alter table clinics enable row level security;
alter table clinic_users enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table call_logs enable row level security;
alter table sms_logs enable row level security;

-- Helper: get clinic_id for the current user
create or replace function auth_clinic_id()
returns uuid language sql security definer as $$
  select clinic_id from clinic_users where user_id = auth.uid() limit 1;
$$;

-- RLS policies (clinic isolation)
create policy "clinic_users_own" on clinic_users for all using (user_id = auth.uid());

create policy "clinics_own" on clinics for all using (id = auth_clinic_id());

create policy "patients_own" on patients for all using (clinic_id = auth_clinic_id());

create policy "appointments_own" on appointments for all using (clinic_id = auth_clinic_id());

create policy "call_logs_own" on call_logs for all using (clinic_id = auth_clinic_id());

create policy "sms_logs_own" on sms_logs for all using (clinic_id = auth_clinic_id());

-- Updated_at triggers
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger patients_updated_at before update on patients
  for each row execute function set_updated_at();

create trigger appointments_updated_at before update on appointments
  for each row execute function set_updated_at();
