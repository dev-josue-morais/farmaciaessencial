alter table public.categories
  add column if not exists description text not null default '',
  add column if not exists image_url text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.products
  add column if not exists minimum_stock integer not null default 0 check (minimum_stock >= 0),
  add column if not exists available_for_sale boolean not null default true,
  add column if not exists internal_notes text not null default '',
  add column if not exists regulatory_class text not null default 'common';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_promotional_price_not_above_price'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_promotional_price_not_above_price
      check (promotional_price is null or promotional_price <= price);
  end if;
end $$;

create table if not exists public.store_settings (
  id boolean primary key default true check (id),
  pharmacy_name text not null default 'Farmácia Essencial',
  logo_url text,
  phone text,
  whatsapp text,
  email text,
  business_address text,
  opening_hours text,
  institutional_text text,
  store_notice text,
  delivery_info text,
  closed_message text not null default 'A loja está temporariamente fechada.',
  store_open boolean not null default true,
  purchases_enabled boolean not null default true,
  featured_enabled boolean not null default true,
  show_out_of_stock boolean not null default true,
  promotions_enabled boolean not null default true,
  default_delivery_fee numeric(12,2) not null default 0 check (default_delivery_fee >= 0),
  payment_environment text not null default 'test' check (payment_environment in ('test', 'production')),
  enabled_payment_methods text[] not null default array['cash']::text[],
  payment_account_reference text,
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (true)
on conflict (id) do nothing;

create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;
alter table public.admin_audit enable row level security;

drop policy if exists "Public read store settings" on public.store_settings;
create policy "Public read store settings"
  on public.store_settings for select using (true);

drop policy if exists "Admins manage store settings" on public.store_settings;
create policy "Admins manage store settings"
  on public.store_settings for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists "Staff read admin audit" on public.admin_audit;
create policy "Staff read admin audit"
  on public.admin_audit for select
  using (public.current_user_role() in ('admin', 'pharmacist'));

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_quantity_delta integer,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock integer;
begin
  if public.current_user_role() not in ('admin', 'pharmacist') then
    raise exception 'Not authorized';
  end if;
  if p_quantity_delta = 0 then raise exception 'Movement quantity required'; end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception 'Reason required'; end if;

  update public.products
  set stock = stock + p_quantity_delta,
      updated_at = now()
  where id = p_product_id
  returning stock into v_stock;

  if v_stock is null then raise exception 'Product not found'; end if;
  if v_stock < 0 then raise exception 'Stock cannot be negative'; end if;

  insert into public.stock_movements(product_id, quantity_delta, reason, created_by)
  values (p_product_id, p_quantity_delta, p_reason, auth.uid());

  insert into public.admin_audit(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'stock_movement', 'product', p_product_id::text,
          jsonb_build_object('quantity_delta', p_quantity_delta, 'reason', p_reason));
  return v_stock;
end;
$$;

grant execute on function public.adjust_stock(uuid, integer, text) to authenticated;

create or replace function public.update_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if public.current_user_role() not in ('admin', 'pharmacist') then
    raise exception 'Not authorized';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'Order not found'; end if;

  if p_status = 'cancelled' then
    perform public.cancel_order(p_order_id);
  else
    update public.orders set status = p_status, updated_at = now() where id = p_order_id;
  end if;

  if p_status != 'cancelled' then
    insert into public.order_status_history(order_id, changed_by, from_status, to_status, notes)
    values (p_order_id, auth.uid(), v_order.status, p_status, p_notes);
  end if;
  return true;
end;
$$;

grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;

create or replace function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() != 'admin' then raise exception 'Not authorized'; end if;
  if p_role is null then raise exception 'Role required'; end if;
  update public.profiles set role = p_role, updated_at = now() where id = p_user_id;
  if not found then raise exception 'Profile not found'; end if;
  insert into public.admin_audit(user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'change_role', 'profile', p_user_id::text,
          jsonb_build_object('role', p_role::text));
  return true;
end;
$$;

grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;

create or replace function public.protect_order_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status is distinct from old.payment_status then
    if auth.uid() is not null and new.payment_status <> 'cancelled' then
      raise exception 'Payment status can only be changed by a validated payment integration';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_order_payment_status_trigger on public.orders;
create trigger protect_order_payment_status_trigger
  before update on public.orders
  for each row execute function public.protect_order_payment_status();
