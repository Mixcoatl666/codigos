import { getApp, getApps, initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'appId']
const missingConfig = requiredConfig.filter((key) => !firebaseConfig[key])

export const firebaseConfigured = missingConfig.length === 0

if (!firebaseConfigured) {
  console.info(`Firebase aún no está configurado. Faltan: ${missingConfig.join(', ')}. Completa .env.local y reinicia Vite.`)
}

export const firebaseApp = firebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null

export const db = firebaseApp ? getFirestore(firebaseApp) : null
