-- Substitua o UUID abaixo pelo ID do usuário criado no Supabase Auth.
-- Não execute esta versão sem ajustar o UUID.

update public.profiles
set
  role = 'admin',
  updated_at = now()
where id = '00000000-0000-0000-0000-000000000000';
