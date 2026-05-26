import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

function UserDetail() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Info del dispositivo (simulado - en producción vendría del cliente)
  const [deviceInfo, setDeviceInfo] = useState({
    hid: 'GENERATING...',
    os: 'Windows',
    ip: '192.168.1.1'
  })

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return
      
      try {
        const docRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          setUserData(docSnap.data())
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }

    // Simular HID único para este dispositivo
    const generateHID = () => {
      return 'HID-' + Math.random().toString(36).substring(2, 12).toUpperCase()
    }
    
    setDeviceInfo(prev => ({ ...prev, hid: generateHID() }))
    
    fetchUserData()
  }, [user])

  // Calcular días activos
  const getActiveDays = () => {
    if (!userData) return 0
    
    // Si es admin, mostrar "Ilimitado"
    if (userData.role === 'admin' || userData.plan === 'admin') {
      return 'Ilimitado'
    }
    
    // Trial o suscripción
    if (userData.trialEnd) {
      const trialEnd = userData.trialEnd.toDate ? userData.trialEnd.toDate() : new Date(userData.trialEnd)
      const now = new Date()
      const diff = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
      return diff > 0 ? diff : 0
    }
    
    if (userData.subscriptionEnd) {
      const subEnd = userData.subscriptionEnd.toDate ? userData.subscriptionEnd.toDate() : new Date(userData.subscriptionEnd)
      const now = new Date()
      const diff = Math.ceil((subEnd - now) / (1000 * 60 * 60 * 24))
      return diff > 0 ? diff : 0
    }
    
    return 31 // Default
  }

  // Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary animate-pulse">Cargando...</div>
      </div>
    )
  }

  const activeDays = getActiveDays()
  const isUnlimited = activeDays === 'Ilimitado'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-md hover:bg-surface-container-high transition-colors"
          >
            <svg className="w-5 h-5 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Detalle del Usuario</h1>
            <p className="text-on-surface-variant mt-1">Información completa del usuario</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
          userData?.role === 'admin' 
            ? 'bg-primary-container/20 text-primary-container' 
            : 'bg-secondary-container text-on-secondary-container'
        }`}>
          {userData?.role || 'user'}
        </span>
      </div>

      {/* User Info Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Información Personal</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Email
            </label>
            <p className="text-on-surface">{user?.email || 'N/A'}</p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Nombre
            </label>
            <p className="text-on-surface">{userData?.nombre || userData?.displayName || 'No registrado'}</p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Celular
            </label>
            <p className="text-on-surface">{userData?.celular || 'No registrado'}</p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Cédula / NIT
            </label>
            <p className="text-on-surface">{userData?.documento || 'No registrado'}</p>
          </div>
        </div>
      </div>

      {/* Subscription Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Suscripción</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Fecha de Creación
            </label>
            <p className="text-on-surface">{formatDate(userData?.createdAt)}</p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Tiempo Activo
            </label>
            <p className={`text-2xl font-bold font-mono ${
              isUnlimited 
                ? 'text-primary-container' 
                : activeDays <= 7 
                  ? 'text-error' 
                  : 'text-on-surface'
            }`}>
              {isUnlimited ? '∞' : activeDays} {isUnlimited ? '' : 'días'}
            </p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Plan
            </label>
            <p className="text-on-surface uppercase">{userData?.plan || 'trial'}</p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Status
            </label>
            <p className="text-on-surface capitalize">{userData?.status || 'active'}</p>
          </div>
        </div>
      </div>

      {/* Device Info Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Información del Dispositivo</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              HID del Sistema
            </label>
            <p className="text-on-surface font-mono">{deviceInfo.hid}</p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Sistema Operativo
            </label>
            <p className="text-on-surface">{deviceInfo.os}</p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              IP
            </label>
            <p className="text-on-surface font-mono">{deviceInfo.ip}</p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              UID Firebase
            </label>
            <p className="text-on-surface font-mono text-xs">{user?.uid}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserDetail