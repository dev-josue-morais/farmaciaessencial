import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { appConfig } from '../config/appConfig'

export const isSupabaseConfigured =
  Boolean(appConfig.supabaseUrl) && Boolean(appConfig.supabasePublishableKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(appConfig.supabaseUrl, appConfig.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
