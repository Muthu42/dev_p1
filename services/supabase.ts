import { createClient } from '@supabase/supabase-js';

// Prefer Vite env vars, but fall back to the provided public URL/anon key
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://fotojtuomievsvveuutd.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdG9qdHVvbWlldnN2dmV1dXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzE5NTAsImV4cCI6MjA4NjQwNzk1MH0.dN_QKyJbQWMzhun-A5Jy8u5PFhvCqXrPqVFxlPK7gfM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

