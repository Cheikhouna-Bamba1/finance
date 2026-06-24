const firebaseConfig = {
  apiKey:            "AIzaSyAplkbe0z4KxofXe1blXtUB-dm5zZnAHBI",
  authDomain:        "dahira-finance.firebaseapp.com",
  projectId:         "dahira-finance",
  storageBucket:     "dahira-finance.firebasestorage.app",
  messagingSenderId: "192413947097",
  appId:             "1:192413947097:web:3747251576d9fe2ca05ac8"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);