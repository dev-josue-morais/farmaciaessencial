create extension if not exists "pgcrypto";

create type public.user_role as enum ('customer', 'pharmacist', 'admin');
create type public.order_status as enum (
  'waiting_payment',
  'payment_approved',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  promotional_price numeric(12,2) check (promotional_price is null or promotional_price >= 0),
  category_id uuid references public.categories(id),
  code text not null unique,
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  gallery text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'inactive')),
  featured boolean not null default false,
  requires_prescription boolean not null default false,
  controlled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  minimum_order numeric(12,2) not null default 0 check (minimum_order >= 0),
  available boolean not null default true,
  estimated_delivery text,
  observations text,
  created_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null,
  postal_code text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood_id uuid not null references public.neighborhoods(id),
  reference_point text,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  address_id uuid not null references public.addresses(id),
  status public.order_status not null default 'waiting_payment',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null check (delivery_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  method text,
  status text not null,
  amount numeric(12,2) not null check (amount >= 0),
  provider_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  changed_by uuid references auth.users(id),
  from_status public.order_status,
  to_status public.order_status not null,
  notes text,
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_status_history enable row level security;

create policy "Public can read active categories"
  on public.categories for select using (active = true);
create policy "Public can read active products"
  on public.products for select using (status = 'active');
create policy "Public can read available neighborhoods"
  on public.neighborhoods for select using (available = true);

create policy "Users read own profile"
  on public.profiles for select using (id = auth.uid());
create policy "Users update own profile"
  on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "Users manage own addresses"
  on public.addresses for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users read own orders"
  on public.orders for select using (user_id = auth.uid());
create policy "Users read own order items"
  on public.order_items for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
create policy "Users read own payments"
  on public.payments for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "Staff read all profiles"
  on public.profiles for select using (public.current_user_role() in ('admin', 'pharmacist'));
create policy "Admins manage categories"
  on public.categories for all using (public.current_user_role() = 'admin');
create policy "Admins manage products"
  on public.products for all using (public.current_user_role() = 'admin');
create policy "Admins manage neighborhoods"
  on public.neighborhoods for all using (public.current_user_role() = 'admin');
create policy "Staff read all orders"
  on public.orders for select using (public.current_user_role() in ('admin', 'pharmacist'));
create policy "Staff update operational orders"
  on public.orders for update using (public.current_user_role() in ('admin', 'pharmacist'));
create policy "Staff read order items"
  on public.order_items for select using (public.current_user_role() in ('admin', 'pharmacist'));
create policy "Staff read payments"
  on public.payments for select using (public.current_user_role() in ('admin', 'pharmacist'));
create policy "Staff read order history"
  on public.order_status_history for select using (public.current_user_role() in ('admin', 'pharmacist'));
