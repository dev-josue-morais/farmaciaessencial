# Backend

Execute os scripts de `sql/` no Supabase SQL Editor.

Antes de operar:

1. Configure as variáveis públicas no frontend.
2. Crie uma conta de cliente pela página Minha conta. Contas novas recebem o papel `customer`.
3. Para habilitar o painel, promova somente a conta administrativa pretendida usando `sql/003_admin.sql`, substituindo o UUID de exemplo pelo ID real do usuário em Supabase Auth.
4. Crie o bucket `product-images` e configure limites de tipo e tamanho.
5. Em **Authentication → URL Configuration**, configure o endereço HTTPS publicado no Render e adicione-o às Redirect URLs.
6. Implementar Edge Functions protegidas para:
   - criar pedidos validando todos os preços e estoque no servidor;
   - recalcular a taxa e o mínimo do bairro no servidor;
   - criar preferências Mercado Pago;
   - receber e validar webhooks;
   - registrar status e impedir pagamentos duplicados.
7. Nunca exponha `service_role`, access tokens Mercado Pago ou segredos em `VITE_*`.

O fluxo de checkout e o webhook devem confirmar pedidos apenas por regras validadas no backend.
