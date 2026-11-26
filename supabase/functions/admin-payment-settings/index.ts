/* global Deno */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supportedProviders = new Set(['mercado_pago', 'infinitepay', 'picpay', 'next', 'nubank'])
const credentialFields = new Set(['api_token', 'client_id', 'client_secret', 'webhook_secret', 'public_key'])

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

function encodeBase64(value: Uint8Array) {
  let binary = ''
  value.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

async function encryptionKey() {
  const encodedKey = Deno.env.get('PAYMENT_CONFIG_ENCRYPTION_KEY')
  if (!encodedKey) throw new Error('Payment encryption is not configured.')
  const rawKey = decodeBase64(encodedKey)
  if (rawKey.byteLength !== 32) throw new Error('Payment encryption key must decode to 32 bytes.')
  return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function encryptCredentials(credentials: Record<string, string>) {
  const key = await encryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(credentials)),
  ))
  const payload = new Uint8Array(iv.length + ciphertext.length)
  payload.set(iv)
  payload.set(ciphertext, iv.length)
  return encodeBase64(payload)
}

async function decryptCredentials(value: string): Promise<Record<string, string>> {
  const key = await encryptionKey()
  const payload = decodeBase64(value)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: payload.slice(0, 12) },
    key,
    payload.slice(12),
  )
  return JSON.parse(new TextDecoder().decode(plaintext)) as Record<string, string>
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return jsonResponse({ error: 'Authentication required.' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Payment credential storage is not configured.' }, 503)
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: authError } = await callerClient.auth.getUser()
  if (authError || !user) return jsonResponse({ error: 'Authentication required.' }, 401)

  const { data: profile, error: profileError } = await callerClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError || profile?.role !== 'admin') return jsonResponse({ error: 'Administrator access required.' }, 403)

  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400)
  }

  const provider = body.provider
  const action = body.action
  if (typeof provider !== 'string' || !supportedProviders.has(provider)) {
    return jsonResponse({ error: 'Unsupported payment provider.' }, 400)
  }
  if (action !== 'save' && action !== 'clear') return jsonResponse({ error: 'Unsupported action.' }, 400)

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  if (action === 'clear') {
    const { error: deleteError } = await serviceClient
      .from('payment_provider_secrets')
      .delete()
      .eq('provider', provider)
    if (deleteError) return jsonResponse({ error: 'Could not remove provider credentials.' }, 500)
    const { data: providerRow, error: updateError } = await serviceClient
      .from('payment_provider_settings')
      .update({ credentials_configured: false, updated_at: new Date().toISOString() })
      .eq('provider', provider)
      .select('provider')
      .maybeSingle()
    if (updateError || !providerRow) return jsonResponse({ error: 'Could not update provider status.' }, 500)
    return jsonResponse({ configured: false })
  }

  if (!body.credentials || typeof body.credentials !== 'object' || Array.isArray(body.credentials)) {
    return jsonResponse({ error: 'Credentials are required.' }, 400)
  }
  const credentials: Record<string, string> = {}
  for (const [field, value] of Object.entries(body.credentials)) {
    if (!credentialFields.has(field)) return jsonResponse({ error: 'Unsupported credential field.' }, 400)
    if (typeof value !== 'string' || value.length > 10000) {
      return jsonResponse({ error: 'Credential values must be text no longer than 10,000 characters.' }, 400)
    }
    if (value.trim()) credentials[field] = value.trim()
  }
  if (Object.keys(credentials).length === 0) return jsonResponse({ error: 'Enter at least one credential value.' }, 400)
  if (!credentials.api_token && !credentials.client_secret) {
    return jsonResponse({ error: 'Enter a private API token or client secret.' }, 400)
  }

  try {
    const { data: savedSecret, error: readError } = await serviceClient
      .from('payment_provider_secrets')
      .select('encrypted_credentials')
      .eq('provider', provider)
      .maybeSingle()
    if (readError) return jsonResponse({ error: 'Could not read existing provider credentials.' }, 500)

    const previousCredentials = savedSecret
      ? await decryptCredentials(savedSecret.encrypted_credentials)
      : {}
    const encryptedCredentials = await encryptCredentials({ ...previousCredentials, ...credentials })
    const { error: saveError } = await serviceClient
      .from('payment_provider_secrets')
      .upsert({
        provider,
        encrypted_credentials: encryptedCredentials,
        updated_at: new Date().toISOString(),
      })
    if (saveError) return jsonResponse({ error: 'Could not save provider credentials.' }, 500)

    const { data: providerRow, error: updateError } = await serviceClient
      .from('payment_provider_settings')
      .update({ credentials_configured: true, updated_at: new Date().toISOString() })
      .eq('provider', provider)
      .select('provider')
      .maybeSingle()
    if (updateError || !providerRow) return jsonResponse({ error: 'Could not update provider status.' }, 500)
    return jsonResponse({ configured: true })
  } catch {
    return jsonResponse({ error: 'Could not securely process provider credentials.' }, 500)
  }
})
