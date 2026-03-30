import { createClient } from '@supabase/supabase-js';
import Cookies from 'js-cookie';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabaseStorageKey = import.meta.env.VITE_SUPABASE_STORAGE_KEY || 'nobar-shared-auth-token';

const configuredCookieDomain = import.meta.env.VITE_SUPABASE_COOKIE_DOMAIN || '';
const isHttps = typeof window !== 'undefined' ? window.location.protocol === 'https:' : true;

// Konfigurasi Cookie lintas subdomain
const cookieOptions = {
  domain: configuredCookieDomain || undefined,
  path: '/',
  sameSite: 'Lax' as const,
  secure: isHttps,
};

// Custom Storage Adapter yang memaksa Supabase menggunakan js-cookie
// sehingga token dari web film.idho.eu.org otomatis terdeteksi di anime.idho.eu.org
const cookieAuthStorage = {
  getItem: (key: string) => {
    return Cookies.get(key) || null;
  },
  setItem: (key: string, value: string) => {
    Cookies.set(key, value, {
      ...cookieOptions,
      expires: 365, // Session bertahan 1 tahun
    });
  },
  removeItem: (key: string) => {
    Cookies.remove(key, cookieOptions);
  },
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storageKey: supabaseStorageKey,
    storage: cookieAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
