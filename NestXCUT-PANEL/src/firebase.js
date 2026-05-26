import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

// Usar la misma config de Cotizador Pro (mismo proyecto Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyDmUeyQrup8Kn1DgTCUgtR0TbAh5RO4dtE",
  authDomain: "nestxcut.firebaseapp.com",
  projectId: "nestxcut",
  storageBucket: "nestxcut.firebasestorage.app",
  messagingSenderId: "262341047234",
  appId: "1:262341047234:web:6b8fc337c9ad6ea83bdc5b"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app, 'us-central1')

export default app