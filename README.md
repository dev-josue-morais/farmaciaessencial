# Farmácia Essencial

Base inicial da plataforma de vendas da Farmácia Essencial. O repositório contém uma loja responsiva, painel administrativo, migração inicial do Supabase e um aplicativo Android em WebView.

## Estrutura

- `src/pages/store`: páginas da loja.
- `src/pages/admin`: painel administrativo.
- `src/components`: componentes reutilizáveis.
- `src/services`: integração com Supabase e dados iniciais.
- `src/types`: tipos compartilhados.
- `src/styles`: identidade visual organizada por área.
- `sql`: scripts para configurar schema, Storage e verificar o Supabase.
- `supabase/migrations`: estrutura PostgreSQL e políticas RLS.
- `android`: projeto independente Android/Kotlin.
- `.github/workflows/deploy.yml`: publicação no GitHub Pages.

## Requisitos

- Node.js 20 ou superior.
- Conta e projeto Supabase.
- Android Studio para abrir o aplicativo Android.

## Instalação e execução

```bash
npm install
cp .env.example .env.local
npm run dev
```

Preencha `.env.local` somente com a URL pública e a `anon key` do Supabase.

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

As páginas usam `HashRouter`, portanto funcionam no endereço padrão do GitHub Pages sem configurar regras adicionais de rewrites.

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. Execute `supabase/migrations/20261122000001_initial_schema.sql` no SQL Editor.
3. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.local`.
4. Para o GitHub Actions, cadastre os mesmos valores como **repository variables** ou como variáveis do ambiente `github-pages`, com os nomes `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. Execute o disparo manual ou faça push na branch `main`.
6. Em Supabase, crie o bucket `product-images` e configure limite de tamanho e tipos permitidos.

Nunca coloque a `service_role key` ou credenciais de Mercado Pago no frontend.

## Segurança e dados

A migração inicial cria perfis, categorias, produtos, bairros, endereços, pedidos, itens, pagamentos e histórico de status. As políticas RLS permitem que clientes acessem apenas seus próprios dados e concedem acesso operacional a perfis `pharmacist` e administrativo a perfis `admin`.

O Supabase deve criar automaticamente o perfil de novos usuários. Alteração manual de papéis deve ser feita pelo painel SQL ou por uma operação administrativa de servidor.

Produtos controlados ou sujeitos a receita devem começar como regras desabilitadas até haver validação jurídica e fluxo específico.

## Pagamentos

Mercado Pago ainda não está integrado. Antes da ativação é necessário:

- credenciais Mercado Pago armazenadas somente no backend;
- Edge Function para criação do pagamento;
- validação do valor, estoque, bairro e endereço no servidor;
- webhook com assinatura/validação própria;
- idempotência para evitar cobranças duplicadas;
- atualização do pedido apenas após confirmação segura;
- registro do identificador e do histórico do pagamento.

Não considerar a tela de retorno do navegador como aprovação.

## GitHub Pages

No repositório do GitHub:

1. Acesse **Settings > Pages**.
2. Selecione **GitHub Actions** como fonte.
3. Configure as variáveis públicas indicadas acima.
4. Faça push na branch `main`.

O workflow gera `dist` e publica o artefato. Um domínio personalizado pode ser configurado posteriormente; atualize a configuração base e a URL do Android quando necessário.

## Aplicativo Android

1. Abra a pasta `android` no Android Studio.
2. Atualize `SITE_URL` e `ALLOWED_HOST` em `android/app/src/main/java/br/com/farmaciaessencial/app/AppConfig.kt`.
3. Use somente HTTPS.
4. Sincronize o Gradle e gere o APK ou AAB.
5. A sessão é mantida pelo armazenamento WebView e pela persistência do Supabase no navegador embutido.

Links externos são encaminhados para outro aplicativo controlado. A navegação interna é restrita ao host autorizado.

## Estado desta base

Implementado:

- loja pública navegável;
- catálogo com filtro e busca;
- carrinho armazenado localmente;
- páginas de conta e checkout em preparação;
- painel administrativo inicial;
- identidade visual responsiva;
- configuração Supabase opcional;
- esquema PostgreSQL e RLS inicial;
- workflow GitHub Pages;
- projeto Android com WebView, offline, carregamento, atualização e bloqueio externo.

Ainda exige configuração externa:

- URL e chave pública do Supabase;
- dados reais e storage;
- políticas administrativas adicionais do primeiro usuário;
- credenciais e integração Mercado Pago;
- Edge Functions de checkout e webhook;
- domínio oficial para o Android;
- validação de medicamentos sujeitos a receita/controlados.
