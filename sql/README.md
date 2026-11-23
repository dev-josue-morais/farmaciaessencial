# Configuração SQL do Supabase

Execute os scripts no **SQL Editor** do Supabase nesta ordem:

1. `001_initial_schema.sql`
2. `002_storage.sql`
3. `003_verificacao.sql`

Não execute `003_admin.sql` até possuir o e-mail ou UUID do usuário que receberá o perfil administrativo.

## Valores já configurados no projeto local

- URL pública do projeto configurada em `.env.local`.
- Chave publicável configurada em `.env.local`.
- Ambas as variáveis possuem prefixo `VITE_` e podem ser usadas no frontend.

## Variáveis GitHub Actions

Cadastre como repository variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Não cadastre `service_role`, tokens Mercado Pago ou outras credenciais privadas como variables públicas.
