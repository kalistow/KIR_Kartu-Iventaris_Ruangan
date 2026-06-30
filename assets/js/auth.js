// assets/js/auth.js
// Supabase client (same as in script.js)
const SUPABASE_URL = typeof ENV !== 'undefined' ? ENV.SUPABASE_URL : "";
const SUPABASE_ANON_KEY = typeof ENV !== 'undefined' ? ENV.SUPABASE_ANON_KEY : "";
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
