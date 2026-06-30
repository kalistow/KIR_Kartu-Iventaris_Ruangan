// assets/js/auth.js
// Supabase client (same as in script.js)
const SUPABASE_URL = "https://dxkznpplvwetunzvudfv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4a3pucHBsdndldHVuenZ1ZGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzMyNDYsImV4cCI6MjA5Njg0OTI0Nn0.-u2Zx_s1LvBy2G1WqH8BOkuvcJXKGCe_rH6lkv6lMRc";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    errorMsg.textContent = error.message;
    errorMsg.classList.remove('hidden');
    return;
  }
  // Store session locally (optional)
  if (data.session) localStorage.setItem('supabase.session', JSON.stringify(data.session));
  // Redirect to dashboard after successful login
  window.location.href = 'index.html';
});
