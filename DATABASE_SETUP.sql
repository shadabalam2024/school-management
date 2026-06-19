-- ============================================================
-- SCHOOL MANAGEMENT SYSTEM — DATABASE SETUP
-- Run this SQL in your Supabase SQL Editor once
-- ============================================================

-- 1. STUDENTS TABLE
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  student_id text unique not null,
  name text not null,
  father_name text,
  class text not null,
  section text,
  phone text,
  address text,
  admission_date date,
  fee_type text default 'Monthly',   -- Monthly / Yearly
  monthly_fee numeric default 0,
  yearly_fee numeric default 0,
  status text default 'Active',      -- Active / Inactive
  created_at timestamptz default now()
);

-- 2. FEE PAYMENTS TABLE
create table if not exists fee_payments (
  id uuid primary key default gen_random_uuid(),
  receipt_no text unique not null,
  student_id text references students(student_id),
  student_name text,
  class text,
  month_year text,         -- e.g. "April 2024" or "2024-25"
  fee_type text,           -- Monthly / Yearly
  tuition_fee numeric default 0,
  transport_fee numeric default 0,
  other_fee numeric default 0,
  total_amount numeric default 0,
  paid_amount numeric default 0,
  status text default 'Unpaid',     -- Paid / Unpaid / Partial
  payment_mode text,                -- Cash / Online / Cheque
  payment_date date,
  notes text,
  created_at timestamptz default now()
);

-- 3. EXPENSES TABLE
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category text not null,   -- Electricity / Salary / Maintenance / etc.
  description text,
  vendor text,
  amount numeric not null default 0,
  payment_mode text,        -- Cash / Online / Cheque
  created_at timestamptz default now()
);

-- 4. PETTY CASH TABLE
create table if not exists petty_cash (
  id uuid primary key default gen_random_uuid(),
  cash_date date not null,
  type text not null,        -- IN / OUT
  amount numeric not null default 0,
  purpose text,
  recorded_by text,
  created_at timestamptz default now()
);

-- 5. STAFF TABLE
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  staff_id text unique not null,
  name text not null,
  designation text,
  department text,
  phone text,
  address text,
  joining_date date,
  basic_salary numeric default 0,
  allowances numeric default 0,
  status text default 'Active',     -- Active / Resigned
  created_at timestamptz default now()
);

-- 6. SALARY PAYMENTS TABLE
create table if not exists salary_payments (
  id uuid primary key default gen_random_uuid(),
  staff_id text references staff(staff_id),
  staff_name text,
  month_year text,
  basic_salary numeric default 0,
  allowances numeric default 0,
  deductions numeric default 0,
  net_salary numeric default 0,
  status text default 'Unpaid',     -- Paid / Unpaid
  payment_date date,
  payment_mode text,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY (makes data public for now)
-- For production, set up proper auth policies
-- ============================================================
alter table students enable row level security;
alter table fee_payments enable row level security;
alter table expenses enable row level security;
alter table petty_cash enable row level security;
alter table staff enable row level security;
alter table salary_payments enable row level security;

-- Allow all operations (update when you add auth)
create policy "allow_all_students" on students for all using (true) with check (true);
create policy "allow_all_fees" on fee_payments for all using (true) with check (true);
create policy "allow_all_expenses" on expenses for all using (true) with check (true);
create policy "allow_all_petty" on petty_cash for all using (true) with check (true);
create policy "allow_all_staff" on staff for all using (true) with check (true);
create policy "allow_all_salary" on salary_payments for all using (true) with check (true);
