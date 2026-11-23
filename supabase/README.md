# Backend

Execute os scripts de `sql/` no Supabase SQL Editor.

Antes de operar:

1. Configure as variáveis públicas no frontend.
2. Crie o perfil do usuário administrador pelo banco com papel `admin`.
3. Crie o bucket `product-images` e configure limites de tipo e tamanho.
4. Implementar Edge Functions protegidas para:
   - criar pedidos validando todos os preços e estoque no servidor;
   - recalcular a taxa e o mínimo do bairro no servidor;
   - criar preferências Mercado Pago;
   - receber e validar webhooks;
   - registrar status e impedir pagamentos duplicados.
5. Nunca exponha `service_role`, access tokens Mercado Pago ou segredos em `VITE_*`.

O fluxo de checkout e o webhook devem confirmar pedidos apenas por regras validadas no backend.
