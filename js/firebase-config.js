// ============================================================
//  firebase-config.js
//  Configuration Firebase pour Dahira Maftikhoul Jinan
//
//  INSTRUCTIONS :
//  1. Remplacez chaque valeur "VOTRE_..." par vos vraies clés
//     Firebase (disponibles dans la console Firebase > Paramètres
//     du projet > Vos applications > Config).
//  2. N'oubliez pas de configurer les règles Firestore et Auth.
// ============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyAplkbe0z4KxofXe1blXtUB-dm5zZnAHBI",
  authDomain:        "dahira-finance.firebaseapp.com",
  projectId:         "dahira-finance",
  storageBucket:     "dahira-finance.firebasestorage.app",
  messagingSenderId: "192413947097",
  appId:             "1:192413947097:web:3747251576d9fe2ca05ac8"
};

// ─── Initialisation Firebase ───
import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore }         from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth }              from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
