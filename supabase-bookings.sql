-- HEART Trust – meeting bookings. Run once in Supabase SQL Editor (after supabase.sql).
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ticket text unique not null,
  slot_date date not null,
  slot_time time not null,                 -- India Standard Time (IST) wall-clock time
  name text not null,
  email text not null,
  phone text,
  note text,
  status text not null default 'confirmed',   -- confirmed | done | cancelled
  created_at timestamptz not null default now()
);

-- one meeting per time slot (a cancelled slot becomes free again)
create unique index bookings_slot_uq on public.bookings (slot_date, slot_time) where status <> 'cancelled';

alter table public.bookings enable row level security;

-- visitors can only ADD a booking; they can never read bookings back
create policy bookings_public_insert on public.bookings for insert to anon, authenticated
  with check (status = 'confirmed' and slot_date >= current_date and length(trim(name)) > 0 and length(email) > 3);
create policy bookings_staff_read   on public.bookings for select to authenticated using (public.staff_role() is not null);
create policy bookings_staff_update on public.bookings for update to authenticated
  using (public.staff_role() in ('programme_manager','field_coordinator'))
  with check (public.staff_role() in ('programme_manager','field_coordinator'));

-- the booking page asks only "which times are already taken on this date?" (no personal data)
create function public.taken_slots(d date) returns setof time
language sql security definer set search_path = public stable
as $$ select slot_time from public.bookings where slot_date = d and status <> 'cancelled' $$;
grant execute on function public.taken_slots(date) to anon, authenticated;