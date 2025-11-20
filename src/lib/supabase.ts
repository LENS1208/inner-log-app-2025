import { createClient } from '@supabase/supabase-js';
import { validateEnvironment } from './env-validator';

// Get environment variables from Vite's import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

// Validate environment (will log warnings but won't throw)
try {
  validateEnvironment();
} catch (e) {
  console.warn('Environment validation warning:', e);
}

console.log('✅ Supabase client initialized successfully');
console.log('📍 Using database:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Prefer': 'return=representation',
    },
  },
});

export type Database = {
  public: {
    Tables: {
      trades: {
        Row: {
          id: string;
          ticket: string;
          item: string;
          side: string;
          size: number;
          open_time: string;
          open_price: number;
          close_time: string;
          close_price: number;
          commission: number;
          swap: number;
          profit: number;
          pips: number;
          sl: number | null;
          tp: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trades']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['trades']['Insert']>;
      };
      daily_notes: {
        Row: {
          id: string;
          date_key: string;
          title: string;
          good: string;
          improve: string;
          next_promise: string;
          free: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['daily_notes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['daily_notes']['Insert']>;
      };
      trade_notes: {
        Row: {
          id: string;
          ticket: string;
          entry_emotion: string;
          entry_basis: string[];
          tech_set: string[];
          market_set: string[];
          fund_set: string[];
          fund_note: string;
          exit_triggers: string[];
          exit_emotion: string;
          note_right: string;
          note_wrong: string;
          note_next: string;
          note_free: string;
          tags: string[];
          images: Array<{ id: string; url: string }>;
          ai_advice: string;
          ai_advice_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trade_notes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['trade_notes']['Insert']>;
      };
    };
  };
};
