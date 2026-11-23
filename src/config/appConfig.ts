export const appConfig = {
  name: 'Farmácia Essencial',
  publicDomain: '',
  defaultCurrency: 'BRL',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
  routePaths: {
    store: '/',
    catalog: '/produtos',
    cart: '/carrinho',
    account: '/conta',
    admin: '/admin',
  },
} as const
