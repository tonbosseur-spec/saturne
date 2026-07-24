import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'custom_supabase_url';
const STORAGE_ANON_KEY = 'custom_supabase_anon_key';

export function getSupabaseCredentials() {
  const customUrl = localStorage.getItem(STORAGE_URL_KEY)?.trim() || '';
  const customKey = localStorage.getItem(STORAGE_ANON_KEY)?.trim() || '';

  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const isEnvValid = Boolean(
    envUrl &&
    !envUrl.includes('placeholder') &&
    !envUrl.includes('YOUR_SUPABASE') &&
    envKey &&
    !envKey.includes('placeholder') &&
    !envKey.includes('YOUR_SUPABASE')
  );

  const url = (isEnvValid ? envUrl : '') || customUrl;
  const key = (isEnvValid ? envKey : '') || customKey;

  const isConfigured = Boolean(url && key && url.startsWith('http'));

  return { url, key, isConfigured, source: isEnvValid ? 'env' : (customUrl ? 'local' : 'none') };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseCredentials().isConfigured;
}

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  const { url, key, isConfigured } = getSupabaseCredentials();
  
  const finalUrl = isConfigured ? url : 'https://placeholder.supabase.co';
  const finalKey = isConfigured ? key : 'placeholder-anon-key';

  if (!clientInstance) {
    clientInstance = createClient(finalUrl, finalKey);
  }
  return clientInstance;
}

export function saveSupabaseCredentials(url: string, key: string) {
  const cleanUrl = url.trim();
  const cleanKey = key.trim();

  if (cleanUrl) {
    localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
  } else {
    localStorage.removeItem(STORAGE_URL_KEY);
  }

  if (cleanKey) {
    localStorage.setItem(STORAGE_ANON_KEY, cleanKey);
  } else {
    localStorage.removeItem(STORAGE_ANON_KEY);
  }

  // Reset cached instance
  const { url: newUrl, key: newKey, isConfigured } = getSupabaseCredentials();
  const finalUrl = isConfigured ? newUrl : 'https://placeholder.supabase.co';
  const finalKey = isConfigured ? newKey : 'placeholder-anon-key';

  clientInstance = createClient(finalUrl, finalKey);
}

export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<{ success: boolean; message: string }> {
  try {
    const creds = getSupabaseCredentials();
    const url = customUrl?.trim() || creds.url;
    const key = customKey?.trim() || creds.key;

    if (!url || !key || !url.startsWith('http')) {
      return { success: false, message: 'URL ou Clé API invalide. L\'URL doit commencer par https://' };
    }

    const testClient = createClient(url, key);
    const { error } = await testClient.from('questionnaires').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        return { success: true, message: 'Connexion Supabase réussie ! (Remarque : La table "questionnaires" doit encore être créée avec le script SQL).' };
      }
      return { success: false, message: `Erreur Supabase: ${error.message}` };
    }

    return { success: true, message: 'Connexion Supabase établie avec succès !' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Erreur lors du test de connexion' };
  }
}

// Proxy to delegate dynamically to current clientInstance
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const val = (client as any)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  }
});

