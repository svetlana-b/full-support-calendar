// firebase-config.js — Firebase app initialization, auth, and Firestore handle.
//
// Loads modular Firebase Web SDK from the CDN, initializes the app,
// and exposes `window.fbAuth`, `window.fbDb`, plus helper functions
// onto window for use by Babel-transpiled component scripts (which
// don't share scope with this module).

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, getDoc, getDocs, onSnapshot,
  setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp,
  runTransaction, deleteField, query, where
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDsHDAdwVGLebw9ez6FxmcVPa_OAI1nZsI",
  authDomain: "pro-support-calendar.firebaseapp.com",
  projectId: "pro-support-calendar",
  storageBucket: "pro-support-calendar.firebasestorage.app",
  messagingSenderId: "316405288320",
  appId: "1:316405288320:web:f653c7f00ac77f4f03c565",
  measurementId: "G-QHX9FXF02Z",
};

// Admin allowlist — only these users see the Manage panel and can write to
// shared collections (oncall, weekends, holidays). Mirror this list in
// firestore.rules under the `isAdmin()` helper.
window.ADMIN_EMAILS = [
  "sbazhynova@teamworkcommerce.com",
  "slitvinov@teamworkcommerce.com",
  "dlytovchenko@teamworkcommerce.com",
  "aolvera@teamworkcommerce.com",
];

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
// persistentLocalCache stores all Firestore data in IndexedDB.
// onSnapshot fires instantly from cache (0 reads charged), then syncs
// only changed documents from the network. persistentMultipleTabManager
// coordinates which tab owns the network connection when several are open.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
const googleProvider = new GoogleAuthProvider();

// Expose the SDK pieces the Babel-transpiled scripts need.
window.fbAuth = auth;
window.fbDb   = db;
window.fbApp  = app;
window.fb = {
  // auth
  signInWithGoogle: () => signInWithPopup(auth, googleProvider),
  signOut:          () => signOut(auth),
  onAuthStateChanged: (cb) => onAuthStateChanged(auth, cb),
  // firestore
  collection, doc, getDoc, getDocs, onSnapshot,
  setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp,
  runTransaction, deleteField, query, where,
};

// Signal readiness so non-module scripts can wait.
window.__firebaseReady = true;
window.dispatchEvent(new Event("firebase-ready"));
