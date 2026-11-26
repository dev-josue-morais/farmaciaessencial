alter table public.store_settings
  add column if not exists opening_schedule jsonb;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'store_settings_opening_schedule_object'
      and conrelid = 'public.store_settings'::regclass
  ) then
    alter table public.store_settings
      add constraint store_settings_opening_schedule_object
      check (opening_schedule is null or jsonb_typeof(opening_schedule) = 'object');
  end if;
end $$;

create or replace function public.is_store_open_now()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_settings public.store_settings%rowtype;
  v_local timestamp;
  v_day_name text;
  v_day jsonb;
  v_current_time time;
  v_open_time time;
  v_close_time time;
begin
  select * into v_settings from public.store_settings where id = true;
  if not found then return false; end if;
  if not v_settings.store_open or not v_settings.purchases_enabled then return false; end if;

  if v_settings.opening_schedule is null then return true; end if;

  v_local := timezone('America/Sao_Paulo', now());
  v_day_name := case extract(isodow from v_local)::integer
    when 1 then 'monday'
    when 2 then 'tuesday'
    when 3 then 'wednesday'
    when 4 then 'thursday'
    when 5 then 'friday'
    when 6 then 'saturday'
    else 'sunday'
  end;
  v_day := v_settings.opening_schedule -> v_day_name;
  if coalesce((v_day ->> 'enabled')::boolean, false) = false then return false; end if;

  v_open_time := (v_day ->> 'open')::time;
  v_close_time := (v_day ->> 'close')::time;
  if v_open_time >= v_close_time then return false; end if;
  v_current_time := v_local::time;
  return v_current_time >= v_open_time and v_current_time < v_close_time;
end;
$$;

create or replace function public.enforce_store_open_for_orders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_store_open_now() then
    raise exception 'Store is closed or unavailable for purchases';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_store_open_for_orders_trigger on public.orders;
create trigger enforce_store_open_for_orders_trigger
  before insert on public.orders
  for each row execute function public.enforce_store_open_for_orders();
