# Backend

Execute as migrações em `supabase/migrations/` na ordem numérica, incluindo as migrações de controle administrativo, horário semanal e configuração de pagamentos. Execute também `sql/002_storage.sql` para criar o bucket público `product-images` e restringir uploads a administradores.

Antes de operar:

1. Configure as variáveis públicas no frontend.
2. Crie uma conta de cliente pela página Minha conta. Contas novas recebem o papel `customer`.
3. Para habilitar o painel, promova somente a conta administrativa pretendida usando `sql/003_admin.sql`, substituindo o UUID de exemplo pelo ID real do usuário em Supabase Auth.
4. A migração de Storage configura o bucket `product-images` (JPG, PNG e WEBP, até 5 MB) e suas políticas de acesso.
5. Em **Authentication → URL Configuration**, configure o endereço HTTPS publicado no Render e adicione-o às Redirect URLs.
6. Implementar Edge Functions protegidas para:
   - criar pedidos validando todos os preços e estoque no servidor;
   - recalcular a taxa e o mínimo do bairro no servidor;
   - criar preferências Mercado Pago;
   - receber e validar webhooks;
   - registrar status e impedir pagamentos duplicados.
7. Nunca exponha `service_role`, access tokens Mercado Pago ou segredos em `VITE_*`.

O logotipo é enviado pelo painel para `product-images/store-logo/` e exibido automaticamente na navegação da loja. O horário semanal é salvo em `store_settings.opening_schedule` e pedidos fora dos horários configurados são recusados no banco, usando o fuso de Brasília.

As credenciais dos provedores são criptografadas pela Edge Function `admin-payment-settings`; elas não são lidas de volta pelo frontend. Antes de salvar credenciais:

1. Gere uma chave aleatória de 32 bytes codificada em Base64.
2. Configure-a como segredo `PAYMENT_CONFIG_ENCRYPTION_KEY` nas Edge Function Secrets do Supabase. A chave não deve ser commitada no repositório.
3. Faça deploy com `supabase functions deploy admin-payment-settings`.

Os campos de Pix, cartão, ambiente, acréscimos e descontos são apenas configuração administrativa. A cobrança real só deve ser habilitada depois de implementar e validar a integração e os webhooks dos provedores; esta interface não simula pagamento aprovado.

O fluxo de checkout e o webhook devem confirmar pedidos apenas por regras validadas no backend.
