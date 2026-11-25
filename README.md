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
- `render.yaml`: configuração de implantação no Render.

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

O frontend usa `BrowserRouter`; o servidor Node encaminha rotas desconhecidas ao `index.html`.

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. Execute `supabase/migrations/20261122000001_initial_schema.sql` no SQL Editor.
3. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.local`.
4. Configure as mesmas variáveis públicas no Render.
5. Execute as migrações do Supabase, incluindo a migração de checkout e estoque.
6. Em Supabase, crie o bucket `product-images` e mantenha limite de tamanho e tipos permitidos.

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


## Aplicativo Android

1. Abra a pasta `android` no Android Studio.
2. Atualize `SITE_URL` e `ALLOWED_HOST` em `android/app/src/main/java/br/com/farmaciaessencial/app/AppConfig.kt`.
3. Use somente HTTPS.
4. Sincronize o Gradle e gere o APK ou AAB.
5. A sessão é mantida pelo armazenamento WebView e pela persistência do Supabase no navegador embutido.

Links externos são encaminhados para outro aplicativo controlado. A navegação interna é restrita ao host autorizado.

## Render

O projeto inclui `render.yaml` e um servidor Node embutido que serve `dist` e expõe `GET /health`.

1. Crie um Web Service no Render conectado ao repositório.
2. Use o Blueprint `render.yaml`.
3. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Configure as migrações do Supabase, incluindo `20261122000002_checkout_and_inventory.sql`.
5. O domínio gratuito ou personalizado deve usar HTTPS.

O Render não recebe credenciais privadas. Mercado Pago e `SUPABASE_SERVICE_ROLE_KEY` devem permanecer fora do frontend.

## Estado atual

Implementado no código:

- catálogo e loja carregados do Supabase;
- busca normalizada com acentuação;
- carrinho persistente com revalidação de estoque e preço no banco;
- autenticação, perfil e endereços;
- criação de pedido por função PostgreSQL transacional e idempotente;
- baixa e reversão de estoque;
- painel administrativo protegido e dashboard com dados reais;
- painel operacional para farmacêutico;
- servidor Render e `/health`;
- projeto Android em WebView.

Pendente por configuração externa:

- URL, chave pública e dados reais do Supabase;
- atribuição do primeiro usuário administrativo;
- Storage e imagens;
- credenciais Mercado Pago;
- Edge Function de criação de cobrança e webhook autenticado;
- domínio oficial e configuração final do Android.
