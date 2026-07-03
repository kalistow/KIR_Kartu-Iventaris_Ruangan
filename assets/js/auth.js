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

// Modal Lupa Password Logic
const forgotModal = document.getElementById('forgot-password-modal');
const forgotPanel = document.getElementById('forgot-password-panel');
const forgotEmailInput = document.getElementById('forgot-email');
const forgotErrorMsg = document.getElementById('forgot-error-msg');
const submitForgotBtn = document.getElementById('submit-forgot-btn');
const cancelForgotBtn = document.getElementById('cancel-forgot-btn');
const forgotIcon = document.getElementById('forgot-icon');
const forgotTitle = document.getElementById('forgot-title');
const forgotDesc = document.getElementById('forgot-desc');
const forgotInputWrapper = document.getElementById('forgot-input-wrapper');

let isForgotSuccess = false;

window.handleForgotPassword = () => {
    const mainEmail = document.getElementById('email').value.trim();
    forgotEmailInput.value = mainEmail;
    
    // Reset status modal ke kondisi awal
    isForgotSuccess = false;
    forgotIcon.textContent = '🔑';
    forgotTitle.textContent = 'Lupa Password?';
    forgotDesc.innerHTML = 'Masukkan email Anda untuk menerima tautan pemulihan kata sandi.';
    forgotInputWrapper.classList.remove('hidden');
    submitForgotBtn.textContent = 'Kirim Tautan';
    cancelForgotBtn.classList.remove('hidden');
    forgotErrorMsg.classList.add('hidden');
    forgotErrorMsg.textContent = '';
    
    // Tampilkan modal dengan transisi
    forgotModal.classList.remove('hidden');
    setTimeout(() => {
        forgotModal.classList.remove('opacity-0');
        forgotPanel.classList.remove('scale-95');
        forgotPanel.classList.add('scale-100');
    }, 10);
};

window.closeForgotPasswordModal = () => {
    forgotModal.classList.add('opacity-0');
    forgotPanel.classList.remove('scale-100');
    forgotPanel.classList.add('scale-95');
    
    setTimeout(() => {
        forgotModal.classList.add('hidden');
    }, 300);
};

submitForgotBtn.addEventListener('click', async () => {
    if (isForgotSuccess) {
        window.closeForgotPasswordModal();
        return;
    }

    const email = forgotEmailInput.value.trim();
    if (!email) {
        forgotErrorMsg.textContent = 'Silakan masukkan alamat email Anda!';
        forgotErrorMsg.classList.remove('hidden');
        return;
    }

    // Validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        forgotErrorMsg.textContent = 'Format email tidak valid!';
        forgotErrorMsg.classList.remove('hidden');
        return;
    }

    forgotErrorMsg.classList.add('hidden');
    submitForgotBtn.disabled = true;
    submitForgotBtn.textContent = 'Mengirim...';

    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname.replace('login.html', 'reset-password.html')
        });
        if (error) throw error;

        // Tampilan sukses
        isForgotSuccess = true;
        forgotIcon.textContent = '✉️';
        forgotTitle.textContent = 'Tautan Terkirim!';
        forgotDesc.innerHTML = `Instruksi pemulihan kata sandi telah dikirim ke <br><strong class="text-textMain">${email}</strong>.<br><br>Silakan periksa kotak masuk atau spam Anda.`;
        forgotInputWrapper.classList.add('hidden');
        submitForgotBtn.disabled = false;
        submitForgotBtn.textContent = 'Selesai';
        cancelForgotBtn.classList.add('hidden');
    } catch (err) {
        forgotErrorMsg.textContent = 'Gagal mengirim email: ' + err.message;
        forgotErrorMsg.classList.remove('hidden');
        submitForgotBtn.disabled = false;
        submitForgotBtn.textContent = 'Kirim Tautan';
    }
});
