# Dahira Maftikhoul Jinan — Gestion Financière

Application web de gestion financière pour la Dahira Maftikhoul Jinan.
Stack : **HTML5 · CSS3 · JavaScript Vanilla · Firebase Firestore · Firebase Auth · Chart.js · jsPDF**

## Structure

```
dahira-finance/
├── index.html              ← Connexion
├── dashboard.html          ← Tableau de bord
├── cotisations.html        ← Cotisations
├── depenses.html           ← Dépenses
├── evenements.html         ← Événements
├── projets.html            ← Projets
├── bilan.html              ← Bilan + export PDF
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js  ← Configuration Firebase
│   ├── auth.js             ← Authentification
│   ├── utils.js            ← Fonctions utilitaires
│   ├── charts.js           ← Graphiques (Chart.js)
│   ├── cotisations.js
│   ├── depenses.js
│   ├── evenements.js
│   ├── projets.js
│   └── bilan.js
└── README.md
```

## Installation

### 1. Créer un projet Firebase

1. Rendez-vous sur [console.firebase.google.com](https://console.firebase.google.com/)
2. Ajoutez un projet (ex: `dahira-finance`)
3. Activez **Firestore Database** en mode production
4. Activez **Authentication** → méthode **E-mail/Mot de passe**
5. Créez 2 utilisateurs administrateurs

### Règles Firestore

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 2. Configurer l'application

1. Dans Firebase Console : ⚙️ → **Ajouter une application** → **Web**
2. Copiez le bloc `firebaseConfig`
3. Collez-le dans `js/firebase-config.js`

### 3. Déployer sur GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/dahira-finance.git
git push -u origin main
```

Sur GitHub : **Settings → Pages** → déployer depuis `main` `/ (root)`.

## Compatibilité

| Navigateur | Support |
|-----------|---------|
| Chrome 90+ | ✅ |
| Firefox 88+ | ✅ |
| Safari 14+ | ✅ |
| Edge 90+ | ✅ |

> Internet Explorer n'est pas supporté (modules ES6).

## Sécurité

- Firebase Authentication : accès par email + mot de passe
- Redirection automatique vers `index.html` si non connecté
- Règles Firestore : lecture/écriture réservée aux utilisateurs authentifiés

---

*Développé pour la Dahira Maftikhoul Jinan*
