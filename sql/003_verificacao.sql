select
  'profiles' as table_name,
  count(*) as rows
from public.profiles

union all
select 'categories', count(*) from public.categories
union all
select 'products', count(*) from public.products
union all
select 'neighborhoods', count(*) from public.neighborhoods
union all
select 'addresses', count(*) from public.addresses
union all
select 'orders', count(*) from public.orders
union all
select 'payments', count(*) from public.payments;

select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'product-images';
