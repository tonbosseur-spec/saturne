import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseCredentials() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const isEnvValid = Boolean(
    envUrl &&
    !envUrl.includes('placeholder') &&
    !envUrl.includes('YOUR_SUPABASE') &&
    envKey &&
    !envKey.includes('placeholder') &&
    !envKey.includes('YOUR_SUPABASE') &&
    envUrl.startsWith('http')
  );

  return { 
    url: isEnvValid ? envUrl : '', 
    key: isEnvValid ? envKey : '', 
    isConfigured: isEnvValid, 
    source: isEnvValid ? 'env' : 'none' 
  };
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

export function saveSupabaseCredentials(_url: string, _key: string) {
  // No-op: Credentials are managed exclusively via environment variables (.env)
  localStorage.removeItem('custom_supabase_url');
  localStorage.removeItem('custom_supabase_anon_key');
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const creds = getSupabaseCredentials();
    if (!creds.isConfigured) {
      return { success: false, message: 'Supabase n\'est pas configuré dans le fichier d\'environnement (.env).' };
    }

    const testClient = createClient(creds.url, creds.key);
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


