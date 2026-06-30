// assets/js/config/supabase.js
const SUPABASE_URL = typeof ENV !== 'undefined' ? ENV.SUPABASE_URL : "";
const SUPABASE_ANON_KEY = typeof ENV !== 'undefined' ? ENV.SUPABASE_ANON_KEY : "";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
