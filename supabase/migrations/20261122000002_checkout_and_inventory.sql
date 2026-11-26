alter table public.addresses add column if not exists is_primary boolean not null default false;
alter table public.products
  add column if not exists available_for_sale boolean not null default true;
alter table public.orders
  add column if not exists idempotency_key text,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists delivery_address jsonb not null default '{}',
  add column if not exists observations text;

create unique index if not exists orders_user_idempotency_uidx
  on public.orders(user_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  quantity_delta integer not null,
  reason text not null,
  order_id uuid references public.orders(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.stock_movements enable row level security;
create policy "Staff read stock movements"
  on public.stock_movements for select
  using (public.current_user_role() in ('admin', 'pharmacist'));

create or replace function public.create_order(
  p_address_id uuid,
  p_items jsonb,
  p_idempotency_key text,
  p_observations text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_address record;
  v_item record;
  v_product record;
  v_order_id uuid;
  v_subtotal numeric(12,2) := 0;
  v_delivery_fee numeric(12,2);
  v_total numeric(12,2);
  v_quantity integer;
  v_product_id uuid;
  v_store record;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;
  select * into v_store from public.store_settings where id = true;
  if coalesce(v_store.store_open, true) = false
     or coalesce(v_store.purchases_enabled, true) = false then
    raise exception 'Purchases are temporarily unavailable';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'Idempotency key required';
  end if;

  select id into v_order_id
  from public.orders
  where user_id = v_user and idempotency_key = p_idempotency_key;
  if v_order_id is not null then
    return v_order_id;
  end if;

  select a.*, n.name as neighborhood_name, n.delivery_fee, n.minimum_order, n.available
  into v_address
  from public.addresses a
  join public.neighborhoods n on n.id = a.neighborhood_id
  where a.id = p_address_id and a.user_id = v_user
  for update;

  if v_address.id is null then raise exception 'Invalid delivery address';
  end if;
  if not v_address.available then raise exception 'Delivery is unavailable for this neighborhood';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty';
  end if;

  for v_item in
    select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item.value->>'product_id')::uuid;
    v_quantity := (v_item.value->>'quantity')::integer;
    if v_quantity is null or v_quantity < 1 then raise exception 'Invalid quantity';
    end if;

    select * into v_product
    from public.products
    where id = v_product_id
      and status = 'active'
      and available_for_sale = true
    for update;
    if v_product.id is null then raise exception 'Product unavailable';
    end if;
    if v_product.stock < v_quantity then raise exception 'Insufficient stock';
    end if;
    if v_product.requires_prescription or v_product.controlled then
      raise exception 'This product requires professional validation';
    end if;
    v_subtotal := v_subtotal + (
      coalesce(v_product.promotional_price, v_product.price) * v_quantity
    );
  end loop;

  if v_subtotal < v_address.minimum_order then
    v_delivery_fee := v_address.delivery_fee;
  else
    v_delivery_fee := 0;
  end if;
  v_total := v_subtotal + v_delivery_fee;

  insert into public.orders (
    user_id, address_id, status, subtotal, delivery_fee, total, internal_notes,
    idempotency_key, payment_status, delivery_address, observations
  ) values (
    v_user, p_address_id, 'waiting_payment', v_subtotal, v_delivery_fee, v_total, null,
    p_idempotency_key, 'pending',
    jsonb_build_object(
      'recipient_name', v_address.recipient_name,
      'postal_code', v_address.postal_code,
      'street', v_address.street,
      'number', v_address.number,
      'complement', v_address.complement,
      'neighborhood', v_address.neighborhood_name,
      'reference_point', v_address.reference_point
    ),
    p_observations
  ) returning id into v_order_id;

  for v_item in
    select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item.value->>'product_id')::uuid;
    v_quantity := (v_item.value->>'quantity')::integer;
    select * into v_product from public.products where id = v_product_id for update;

    insert into public.order_items (order_id, product_id, quantity, unit_price, line_total)
    values (
      v_order_id,
      v_product_id,
      v_quantity,
      coalesce(v_product.promotional_price, v_product.price),
      coalesce(v_product.promotional_price, v_product.price) * v_quantity
    );

    update public.products set stock = stock - v_quantity, updated_at = now()
    where id = v_product_id;
    insert into public.stock_movements (product_id, quantity_delta, reason, order_id, created_by)
    values (v_product_id, -v_quantity, 'order_checkout', v_order_id, v_user);
  end loop;

  insert into public.order_status_history (order_id, changed_by, from_status, to_status, notes)
  values (v_order_id, v_user, null, 'waiting_payment', 'Pedido criado');

  return v_order_id;
end;
$$;

grant execute on function public.create_order(uuid, jsonb, text, text) to authenticated;

create or replace function public.cancel_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if v_order.id is null then raise exception 'Order not found';
  end if;
  if public.current_user_role() not in ('admin', 'pharmacist')
     and v_order.user_id != auth.uid() then
    raise exception 'Not authorized';
  end if;
  if v_order.status = 'cancelled' then return true;
  end if;

  for v_item in select * from public.order_items where order_id = p_order_id
  loop
    update public.products
    set stock = stock + v_item.quantity, updated_at = now()
    where id = v_item.product_id;
    insert into public.stock_movements (product_id, quantity_delta, reason, order_id, created_by)
    values (v_item.product_id, v_item.quantity, 'order_cancelled', p_order_id, auth.uid());
  end loop;

  update public.orders
  set status = 'cancelled',
      payment_status = 'cancelled',
      updated_at = now()
  where id = p_order_id;

  insert into public.order_status_history (order_id, changed_by, from_status, to_status, notes)
  values (p_order_id, auth.uid(), v_order.status, 'cancelled', 'Pedido cancelado');
  return true;
end;
$$;

grant execute on function public.cancel_order(uuid) to authenticated;
