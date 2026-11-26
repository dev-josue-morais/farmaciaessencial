create table if not exists public.payment_provider_settings (
  provider text primary key check (provider in ('mercado_pago', 'infinitepay', 'picpay', 'next', 'nubank')),
  environment text not null default 'test' check (environment in ('test', 'production')),
  account_reference text,
  credentials_configured boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.payment_provider_settings(provider) values
  ('mercado_pago'),
  ('infinitepay'),
  ('picpay'),
  ('next'),
  ('nubank')
on conflict (provider) do nothing;

create table if not exists public.payment_method_settings (
  method text primary key check (method in ('pix', 'card')),
  enabled boolean not null default false,
  provider text references public.payment_provider_settings(provider),
  adjustment_type text not null default 'none' check (adjustment_type in ('none', 'surcharge', 'discount')),
  adjustment_unit text not null default 'fixed' check (adjustment_unit in ('fixed', 'percent')),
  adjustment_value numeric(12,2) not null default 0 check (
    adjustment_value >= 0
    and (adjustment_unit != 'percent' or adjustment_value <= 100)
  ),
  updated_at timestamptz not null default now(),
  check (not enabled or provider is not null)
);

insert into public.payment_method_settings(method) values ('pix'), ('card')
on conflict (method) do nothing;

create table if not exists public.payment_provider_secrets (
  provider text primary key references public.payment_provider_settings(provider) on delete cascade,
  encrypted_credentials text not null,
  updated_at timestamptz not null default now()
);

alter table public.payment_provider_settings enable row level security;
alter table public.payment_method_settings enable row level security;
alter table public.payment_provider_secrets enable row level security;

drop policy if exists "Admins manage payment provider settings" on public.payment_provider_settings;
create policy "Admins manage payment provider settings"
  on public.payment_provider_settings for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists "Admins manage payment method settings" on public.payment_method_settings;
create policy "Admins manage payment method settings"
  on public.payment_method_settings for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
