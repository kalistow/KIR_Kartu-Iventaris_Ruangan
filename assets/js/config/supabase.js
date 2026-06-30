// assets/js/config/supabase.js
const SUPABASE_URL = "https://dxkznpplvwetunzvudfv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4a3pucHBsdndldHVuenZ1ZGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzMyNDYsImV4cCI6MjA5Njg0OTI0Nn0.-u2Zx_s1LvBy2G1WqH8BOkuvcJXKGCe_rH6lkv6lMRc";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
