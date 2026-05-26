import { createContext, useState, useContext, useEffect } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

// Emails admin hardcodeados (backup)
const ADMIN_EMAILS = ['capaalonso@gmail.com']

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Función para obtener datos del usuario desde Firestore
  const fetchUserData = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        return userDoc.data()
      }
      return null
    } catch (error) {
      console.error('Error fetching user data:', error)
      return null
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        // Obtener datos adicionales desde Firestore
        const firestoreData = await fetchUserData(firebaseUser.uid)
        
        // Verificar si es admin por email (backup) o por role en Firestore
        const isAdminEmail = ADMIN_EMAILS.includes(firebaseUser.email?.toLowerCase())
        const isAdminRole = firestoreData?.role === 'admin'
        
        setUserData({ 
          email: firebaseUser.email, 
          uid: firebaseUser.uid,
          role: isAdminEmail || isAdminRole ? 'admin' : firestoreData?.role || 'user',
          plan: firestoreData?.plan || 'trial',
          ...firestoreData
        })
      } else {
        setUser(null)
        setUserData(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    
    // Obtener datos de Firestore después del login
    const firestoreData = await fetchUserData(result.user.uid)
    
    // Verificar admin
    const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase())
    const isAdminRole = firestoreData?.role === 'admin'
    
    setUserData({
      email: result.user.email,
      uid: result.user.uid,
      role: isAdminEmail || isAdminRole ? 'admin' : firestoreData?.role || 'user',
      plan: firestoreData?.plan || 'trial',
      ...firestoreData
    })
    
    return { success: true, user: result.user }
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setUserData(null)
  }

  const value = {
    user,
    userData,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: userData?.role === 'admin',
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}