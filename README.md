# Sweet Bakery – Full‑Stack Web Project

## Project Overview
We will build a **closed, dynamic, and admin‑controlled** website for the *Sweet Bakery* brand using:
- **HTML, CSS, JavaScript** (vanilla, no framework)
- **Firebase** for Authentication, Firestore (product/catalog data) and Hosting (optional)
- **Git** for version control – ready to push to GitHub
- **Vercel** for static deployment (or Firebase Hosting if preferred)

The site consists of three main pages:
1. **Login page** – a full‑screen glass‑morphism auth screen.
2. **Home page** – product catalogue with category filter, hero section and footer.
3. **Admin panel** – CRUD UI for categories and products (protected route).

## Folder Structure
```
Sweet Bakery/
├─ index.html          # Home / catalogue (shows after login)
├─ login.html          # Auth screen (initial entry point)
├─ admin.html          # Admin dashboard (protected)
├─ styles.css          # Global styles, glassmorphism, animations
├─ app.js              # Main client‑side logic (auth, UI, Firestore)
├─ admin.js            # Admin‑specific logic (CRUD operations)
├─ firebase-config.js  # Firebase initialization (replace with your config)
└─ README.md           # This file
```

## Setup Steps
1. **Create a Firebase project** at https://console.firebase.google.com.
   - Enable **Authentication** (Email/Password).
   - Create a **Firestore** database (test mode is fine for development).
   - (Optional) Enable **Firebase Hosting** if you want to host there.
2. **Copy the Firebase config** from the project settings and replace the placeholder object in `firebase-config.js`.
3. **Install Git** and initialise the repo:
   ```bash
   cd "c:/Users/elnur/Downloads/Sweet Bakery"
   git init
   git add .
   git commit -m "Initial commit – Sweet Bakery site"
   ```
4. **Push to GitHub** and connect the repo to Vercel (or Firebase Hosting) for automatic deployments.
5. **Run locally** (optional) – just open `login.html` in a browser; the Firebase SDK works from file URLs for auth & Firestore.

---
**⚠️ Important**: Replace the placeholder Firebase config **before** running the site. The admin user must be created in Firebase Auth manually (or via the UI) and have a `customClaims` role of `admin` – see `admin.js` for the claim check.

Happy coding! 🎂
