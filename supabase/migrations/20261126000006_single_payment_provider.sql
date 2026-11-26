alter table public.store_settings
  add column if not exists active_payment_provider text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'store_settings_active_payment_provider_fkey'
      and conrelid = 'public.store_settings'::regclass
  ) then
    alter table public.store_settings
      add constraint store_settings_active_payment_provider_fkey
      foreign key (active_payment_provider)
      references public.payment_provider_settings(provider);
  end if;
end $$;
