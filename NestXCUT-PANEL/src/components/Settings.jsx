import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

function Settings() {
  const navigate = useNavigate()
  const { userData } = useAuth()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSettings = async () => {
      if (!userData?.uid) {
        setLoading(false)
        return
      }
      
      try {
        // Leer configuración de la empresa desde company_settings/{uid}
        const settingsRef = doc(db, 'company_settings', userData.uid)
        const settingsSnap = await getDoc(settingsRef)
        
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data())
        } else {
          // Si no existe, usar datos del usuario como fallback
          setSettings({
            nombreEmpresa: userData.nombre || 'Sin configurar',
            nit: userData.documento || 'N/A',
            email: userData.email,
            telefono: userData.celular || 'N/A'
          })
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [userData?.uid])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary animate-pulse">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <h1 className="text-2xl font-bold text-on-surface">Configuración</h1>
          <p className="text-on-surface-variant mt-1">Datos de la empresa</p>
        </div>
      </div>

      {/* Company Info Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Información de la Empresa</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Nombre del Negocio
            </label>
            <p className="text-on-surface">{settings?.nombreEmpresa || 'No configurado'}</p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Logo
            </label>
            {settings?.logo ? (
              <img src={settings.logo} alt="Logo" className="h-16 w-auto" />
            ) : (
              <p className="text-on-surface-variant">Sin logo</p>
            )}
          </div>
        </div>
      </div>

      {/* Payments Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Pagos</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Moneda
            </label>
            <p className="text-on-surface">
              {settings?.moneda === 'COP' ? 'Peso Colombiano (COP)' : settings?.moneda || 'COP'}
            </p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Impuesto (%)
            </label>
            <p className="text-on-surface">{settings?.impuesto || 0}%</p>
          </div>
        </div>
      </div>

      {/* Contact Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Contacto</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              NIT
            </label>
            <p className="text-on-surface font-mono">{settings?.nit || 'No configurado'}</p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Email
            </label>
            <p className="text-on-surface">{settings?.email || 'No configurado'}</p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Teléfono
            </label>
            <p className="text-on-surface">{settings?.telefono || 'No configurado'}</p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Dirección
            </label>
            <p className="text-on-surface">{settings?.direccion || 'No configurado'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings