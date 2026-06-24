import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const isLoginPage = window.location.pathname.endsWith('index.html')
  || window.location.pathname === '/'
  || window.location.pathname.endsWith('/');

onAuthStateChanged(auth, (user) => {
  if (user) {
    if (isLoginPage) {
      window.location.href = 'dashboard.html';
    } else {
      const emailEl = document.getElementById('nav-user-email');
      if (emailEl) emailEl.textContent = user.email;
    }
  } else {
    if (!isLoginPage) {
      window.location.href = 'index.html';
    }
  }
});

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  await signOut(auth);
  window.location.href = 'index.html';
}