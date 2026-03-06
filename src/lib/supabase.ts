import { createClient } from '@supabase/supabase-js';import Cookies from 'js-cookie';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Konfigurasi Cookie lintas subdomain
const cookieOptions = {
  domain: '.idho.eu.org',
  path: '/',
  sameSite: 'Lax' as const,
  secure: true, // Pastikan target web berjalan di HTTPS
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
