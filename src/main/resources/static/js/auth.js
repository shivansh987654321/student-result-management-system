/* auth.js — login handling */
(function () {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const roleBtns = document.querySelectorAll('.role-btn');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const usernameLabel = document.getElementById('usernameLabel');
  const errBox = document.getElementById('loginError');

  let role = 'admin';

  roleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      role = btn.dataset.role;
      roleBtns.forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      if (role === 'admin') {
        usernameLabel.textContent = 'Username';
        usernameInput.placeholder = 'admin';
        passwordInput.placeholder = '••••••••';
      } else {
        usernameLabel.textContent = 'Roll Number';
        usernameInput.placeholder = 'e.g. S1001';
        passwordInput.placeholder = 'student123';
      }
      errBox.hidden = true;
      form.reset();
    });
  });

  // Auto-redirect if already signed in
  const existing = SRMS.getSession();
  if (existing) {
    if (existing.role === 'admin') window.location.replace('admin.html');
    else if (existing.role === 'student') window.location.replace('student.html');
  }

  function showError(msg) {
    errBox.textContent = msg;
    errBox.hidden = false;
  }

  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = usernameInput.value.trim();
    const p = passwordInput.value;
    if (!u || !p) {
      showError('Please enter both fields.');
      return;
    }
    errBox.hidden = true;
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Signing in…';
    try {
      const session = await SRMS.login(role, u, p);
      SRMS.setSession(session.role, session.identifier);
      window.location.assign(session.role === 'admin' ? 'admin.html' : 'student.html');
    } catch (err) {
      showError(err.message || 'Login failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
