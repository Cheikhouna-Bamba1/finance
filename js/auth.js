// ============================================================
//  auth.js — Authentification + Protection de pages
// ============================================================
import { auth }                           from './firebase-config.js';
import { signInWithEmailAndPassword,
         signOut,
         onAuthStateChanged }             from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ─── Page courante ───
const isLoginPage = window.location.pathname.endsWith('index.html')
  || window.location.pathname === '/'
  || window.location.pathname.endsWith('/');

// ─── Surveillance de l'état d'authentification ───
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Connecté
    if (isLoginPage) {
      window.location.href = 'dashboard.html';
    } else {
      // Afficher l'email dans la navbar
      const emailEl = document.getElementById('nav-user-email');
      if (emailEl) emailEl.textContent = user.email;
    }
  } else {
    // Non connecté
    if (!isLoginPage) {
      window.location.href = 'index.html';
    }
  }
});

// ─── Connexion ───
export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// ─── Déconnexion ───
export async function logout() {
  await signOut(auth);
  window.location.href = 'index.html';
}

// ─── Obtenir l'utilisateur courant ───
export function getCurrentUser() {
  return auth.currentUser;
}

// ─── Attendre que l'auth soit prête ───
export function waitForAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}
