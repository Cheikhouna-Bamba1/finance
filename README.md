# 📋 Dahira Maftikhoul Jinan — Système de Gestion Financière

Application web de gestion financière pour la Dahira Maftikhoul Jinan.  
Stack : **HTML5 · CSS3 · JavaScript Vanilla · Firebase Firestore · Firebase Auth · Chart.js · jsPDF**

---

## 🗂️ Structure du projet

```
dahira-finance/
├── index.html              ← Page de connexion
├── dashboard.html          ← Tableau de bord
├── cotisations.html        ← Gestion des cotisations
├── depenses.html           ← Gestion des dépenses
├── evenements.html         ← Gestion des événements
├── projets.html            ← Gestion des projets
├── bilan.html              ← Bilan global + export PDF
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js
│   ├── auth.js
│   ├── utils.js
│   ├── charts.js
│   ├── cotisations.js
│   ├── depenses.js
│   ├── evenements.js
│   ├── projets.js
│   └── bilan.js
└── README.md
```

---

## ⚙️ ÉTAPE 1 — Créer le projet Firebase

1. Rendez-vous sur [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Cliquez sur **"Ajouter un projet"**
3. Nommez-le (ex: `dahira-finance`), désactivez Google Analytics si vous le souhaitez
4. Cliquez sur **"Créer le projet"**

---

## 🔥 ÉTAPE 2 — Activer Firestore

> ⚠️ **Nouvelle interface Firebase** : le menu "Build" a été remplacé par des catégories.

1. Dans le menu gauche, cliquez sur **"Bases de données et s..."** (= Databases & Storage)
2. Sélectionnez **"Firestore Database"**
3. Cliquez **"Créer la base de données"**
4. Choisissez **"Commencer en mode production"** (vous définirez les règles ensuite)
5. Choisissez la région la plus proche (ex: `europe-west1` ou `europe-west3` pour l'Europe)
6. Cliquez **"Créer"**

### Règles Firestore à définir

Dans l'onglet **Règles** de Firestore, remplacez par :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Cela signifie : **seuls les utilisateurs connectés peuvent lire/écrire**.

---

## 🔐 ÉTAPE 3 — Activer Firebase Authentication

1. Dans le menu gauche, cliquez sur **"Sécurité"**
2. Sélectionnez **"Authentication"**
3. Cliquez **"Commencer"**
4. Dans l'onglet **"Méthodes de connexion"**, activez **E-mail/Mot de passe**
5. Cliquez **"Enregistrer"**

---

## 👤 ÉTAPE 4 — Créer les 2 comptes administrateurs

1. Restez dans **Authentication → Utilisateurs**
2. Cliquez **"Ajouter un utilisateur"**
3. Entrez l'e-mail et le mot de passe du premier admin (ex: `admin1@dahira.org`)
4. Répétez pour le second admin (ex: `admin2@dahira.org`)

> ⚠️ **Important** : Ne partagez jamais les mots de passe en clair. Utilisez des mots de passe forts (min. 12 caractères).

---

## 🔑 ÉTAPE 5 — Récupérer les clés Firebase

1. Dans Firebase Console, cliquez sur l'icône ⚙️ (Paramètres du projet)
2. Faites défiler jusqu'à **"Vos applications"**
3. Cliquez **"Ajouter une application"** → icône **Web (</>)**
4. Nommez-la (ex: `dahira-web`), ne cochez pas Firebase Hosting
5. Cliquez **"Enregistrer l'application"**
6. Copiez le bloc `firebaseConfig` affiché

---

## 📝 ÉTAPE 6 — Configurer firebase-config.js

Ouvrez le fichier `js/firebase-config.js` et remplacez les valeurs :

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",          // ← Votre vraie clé
  authDomain:        "dahira-finance.firebaseapp.com",
  projectId:         "dahira-finance",
  storageBucket:     "dahira-finance.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

> Remplacez **UNIQUEMENT** les valeurs entre guillemets, pas les noms des clés.

---

## 🚀 ÉTAPE 7 — Déployer sur GitHub Pages

### 7a. Créer un dépôt GitHub

1. Rendez-vous sur [https://github.com/new](https://github.com/new)
2. Nommez le dépôt (ex: `dahira-finance`)
3. Laissez-le **Public** (requis pour GitHub Pages gratuit)
4. Cliquez **"Create repository"**

### 7b. Pousser le code

Dans votre terminal, depuis le dossier du projet :

```bash
git init
git add .
git commit -m "Initial commit — Dahira Maftikhoul Jinan Finance"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/dahira-finance.git
git push -u origin main
```

### 7c. Activer GitHub Pages

1. Sur GitHub, allez dans votre dépôt → **Settings**
2. Dans le menu gauche : **Pages**
3. Sous **"Source"** : choisissez **"Deploy from a branch"**
4. Branch : **main** / dossier : **/ (root)**
5. Cliquez **"Save"**
6. Après 1-2 minutes, votre site sera disponible à :  
   `https://VOTRE_USERNAME.github.io/dahira-finance/`

### 7d. Domaine personnalisé (optionnel)

Si vous avez un domaine : entrez-le dans le champ **"Custom domain"** de la même page.

---

## 🌐 Compatibilité navigateurs

| Navigateur | Support |
|-----------|---------|
| Chrome 90+ | ✅ |
| Firefox 88+ | ✅ |
| Safari 14+ | ✅ |
| Edge 90+ | ✅ |
| Opera 76+ | ✅ |

> ⚠️ Internet Explorer n'est **pas** supporté (modules ES6 requis).

---

## 🔒 Sécurité

- L'application utilise **Firebase Authentication** : sans email+mot de passe valides, aucune page n'est accessible.
- Toutes les pages protégées redirigent automatiquement vers `index.html` si l'utilisateur n'est pas connecté.
- Les règles Firestore garantissent que les données ne sont accessibles qu'aux utilisateurs authentifiés.
- Ne commitez **jamais** vos vraies clés Firebase dans un dépôt public sans avoir configuré les restrictions d'API (voir console Firebase → Credentials).

---

## 📞 Support

En cas de problème, vérifiez :
1. Que les clés Firebase dans `firebase-config.js` sont correctes
2. Que Firestore et Authentication sont bien activés dans la console Firebase
3. Que les 2 comptes admin ont bien été créés dans Firebase Auth
4. Que les règles Firestore autorisent la lecture/écriture pour les utilisateurs connectés

---

*Système développé pour la Dahira Maftikhoul Jinan — Que Allah bénisse cette association* 🤲
