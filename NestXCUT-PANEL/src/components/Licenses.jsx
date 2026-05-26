import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'

const MS_PER_HOUR = 1000 * 60 * 60
const MS_PER_DAY = 1000 * 60 * 60 * 24
const MS_PER_MINUTE = 1000 * 60

const toDateOrNull = (value) => {
  if (!value) return null
  if (value?.toDate) return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatHumanDuration = (totalMs) => {
  const safeMs = Math.max(0, Number(totalMs) || 0)
  if (safeMs <= 0) return 'Vencida'

  const totalMinutes = Math.ceil(safeMs / MS_PER_MINUTE)
  const days = Math.floor(totalMinutes / (24 * 60))
  const afterDays = totalMinutes % (24 * 60)
  const hours = Math.floor(afterDays / 60)
  const minutes = afterDays % 60

  if (days === 0 && hours === 0) return `${minutes} min`
  if (days === 0 && minutes === 0) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`

  const parts = []
  if (days > 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`)
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`)
  if (minutes > 0) parts.push(`${minutes} min`)

  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}`
  return `${parts[0]}, ${parts[1]} y ${parts[2]}`
}


const getRemainingFromExpiresAt = (expiresAt, nowMs = Date.now()) => {
  const endDate = toDateOrNull(expiresAt)
  if (!endDate) return null

  const diffMs = endDate.getTime() - nowMs
  if (diffMs <= 0) {
    return {
      isExpired: true,
      days: 0,
      hours: 0,
      diasRestantes: 0,
    }
  }

  const totalHours = Math.ceil(diffMs / MS_PER_HOUR)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  return {
    isExpired: false,
    days,
    hours,
    diasRestantes: Math.ceil(diffMs / MS_PER_DAY),
  }
}

const normalizeLicenseForView = (license, nowMs = Date.now()) => {
  const remainingFromExpiresAt = getRemainingFromExpiresAt(license?.expiresAt, nowMs)
  if (!remainingFromExpiresAt) return license

  return {
    ...license,
    diasRestantes: remainingFromExpiresAt.diasRestantes,
    estado: remainingFromExpiresAt.isExpired ? 'bloqueado' : (license?.estado || 'activo'),
    _remainingDays: remainingFromExpiresAt.days,
    _remainingHours: remainingFromExpiresAt.hours,
    _remainingHuman: formatHumanDuration(toDateOrNull(license?.expiresAt).getTime() - nowMs),
    _usesExpiresAt: true,
  }
}

function Licenses() {
  const navigate = useNavigate()
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [nowMs, setNowMs] = useState(Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const fetchLicenses = async () => {
      try {
        const q = query(collection(db, 'licenses'), orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(q)
        
        const licensesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        setLicenses(licensesData)
      } catch (error) {
        console.error('Error fetching licenses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLicenses()
  }, [])

  const visibleLicenses = licenses.map((license) => normalizeLicenseForView(license, nowMs))


  const handleDeleteLicense = async (licenseId, userId) => {
    try {
      setErrorMessage('')
      await deleteDoc(doc(db, 'licenses', licenseId))
      
      // Resetear usuario
      const userSnap = await getDoc(doc(db, 'users', userId))
      if (userSnap.exists()) {
        await setDoc(doc(db, 'users', userId), {
          plan: 'trial',
          status: 'inactive',
          daysRemaining: 0,
          licenseHid: null,
          licenseActivatedAt: null,
          licenseActivatedBy: null,
          activatedAt: null,
          activatedBy: null,
          subscriptionEnd: null,
          trialEnd: null,
        }, { merge: true })
      }
      
      setLicenses(licenses.filter(l => l.id !== licenseId))
    } catch (error) {
      console.error('Error deleting license:', error)
      setErrorMessage(error.message || 'Error al eliminar la licencia')
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

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
            <h1 className="text-2xl font-bold text-on-surface">Licencias</h1>
            <p className="text-on-surface-variant mt-1">
              {visibleLicenses.length} licencia(s) registrada(s)
            </p>
          </div>
        </div>
        
        <p className="text-sm text-on-surface-variant">
          Vista global / auditoría. Para activar o ajustar licencia usá el detalle del usuario.
        </p>
      </div>

      {deleteCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h3 className="text-lg font-semibold text-on-surface mb-4">Eliminar licencia</h3>
            <p className="text-on-surface-variant mb-6">
              ¿Eliminar la licencia del usuario <strong>{deleteCandidate.userEmail}</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const candidate = deleteCandidate
                  setDeleteCandidate(null)
                  await handleDeleteLicense(candidate.id, candidate.userId)
                }}
                className="px-4 py-2 rounded-md bg-error text-white hover:bg-error/80"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Licenses Table */}
      <div className="card overflow-hidden">
        {errorMessage && (
          <div className="mx-4 mt-4 rounded-md bg-error/15 border border-error/30 text-error px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}
        {visibleLicenses.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">
            No hay licencias registradas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Usuario
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    HID
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Tipo
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Días Totales
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Días Restantes
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Estado
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Activado
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleLicenses.map((license) => (
                  <tr 
                    key={license.id}
                    className="border-b border-outline-variant/50"
                  >
                    <td className="p-4">
                      <p className="text-on-surface">{license.userEmail}</p>
                      <p className="text-on-surface-variant text-xs">{license.userId}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-on-surface font-mono text-sm">{license.id}</p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        license.plan === 'pro' || license.plan === 'mensual' || license.plan === 'anual'
                          ? 'bg-primary-container/20 text-primary-container' 
                          : license.plan === 'trial'
                            ? 'bg-secondary/20 text-secondary'
                            : 'bg-outline/20 text-on-surface-variant'
                      }`}>
                        {license.plan || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-on-surface font-mono">{license.diasAsignados}</p>
                    </td>
                    <td className="p-4">
                      <p className={`font-mono font-bold ${
                        license.diasRestantes <= 7 ? 'text-error' : 'text-on-surface'
                      }`}>
                        {license._usesExpiresAt
                          ? license._remainingHuman
                          : license.diasRestantes}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        license.estado === 'activo' 
                          ? 'bg-green-500/20 text-green-400' 
                          : license.estado === 'bloqueado'
                            ? 'bg-error/20 text-error'
                            : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {license.estado}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-on-surface text-sm">{formatDate(license.activatedAt)}</p>
                      <p className="text-on-surface-variant text-xs">por {license.activatedBy}</p>
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => setDeleteCandidate(license)}
                        className="text-error hover:underline text-sm"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Licenses
