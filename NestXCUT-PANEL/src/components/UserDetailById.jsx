import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db, auth } from '../firebase'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const MS_PER_HOUR = 1000 * 60 * 60
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

  if (days === 0 && hours === 0) {
    return `${minutes} min`
  }

  if (days === 0 && minutes === 0) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`
  }

  const parts = []
  if (days > 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`)
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`)
  if (minutes > 0) parts.push(`${minutes} min`)

  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}`

  return `${parts[0]}, ${parts[1]} y ${parts[2]}`
}

const resolveLicenseDurationPatch = ({ daysRemaining, currentLicense }) => {
  const days = Math.max(0, Number(daysRemaining) || 0)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + (days * MS_PER_DAY))
  const isExpired = days <= 0

  return {
    expiresAt,
    diasAsignados: days,
    diasRestantes: days,
    durationHoursAssigned: days * 24,
    estadoSugerido: isExpired ? 'bloqueado' : (currentLicense?.estado || 'activo'),
  }
}

const resolveLicenseExpiryPatch = ({ days, hours, minutes }) => {
  const safeDays = Math.max(0, Number(days) || 0)
  const safeHours = Math.max(0, Number(hours) || 0)
  const safeMinutes = Math.max(0, Number(minutes) || 0)
  const now = new Date()
  const totalMs = (safeDays * MS_PER_DAY) + (safeHours * MS_PER_HOUR) + (safeMinutes * MS_PER_MINUTE)
  const hasPositiveDuration = totalMs > 0
  const expiresAt = new Date(now.getTime() + Math.max(totalMs, 0))
  const remainingCompatDays = hasPositiveDuration
    ? Math.ceil((expiresAt.getTime() - now.getTime()) / MS_PER_DAY)
    : 0

  return {
    expiresAt,
    diasAsignados: remainingCompatDays,
    diasRestantes: remainingCompatDays,
    durationHoursAssigned: (safeDays * 24) + safeHours + (safeMinutes / 60),
    isExpired: !hasPositiveDuration,
  }
}

const buildUserLicenseFields = ({ plan, daysRemaining, status, activatedAt, activatedBy, hid, expiresAt }) => {
  const now = new Date()
  const endDate = toDateOrNull(expiresAt)
  const hasFutureExpiry = endDate && endDate.getTime() > now.getTime()
  const computedDays = hasFutureExpiry
    ? Math.ceil((endDate.getTime() - now.getTime()) / MS_PER_DAY)
    : Math.max(0, Number(daysRemaining || 0))
  const normalizedStatus = status === 'activo' || status === 'active'
    ? 'active'
    : status === 'bloqueado'
      ? 'inactive'
      : (status || 'inactive')

  return {
    plan: plan || 'trial',
    status: normalizedStatus,
    daysRemaining: computedDays,
    licenseHid: hid || null,
    licenseActivatedAt: activatedAt || null,
    licenseActivatedBy: activatedBy || null,
    activatedAt: activatedAt || null,
    activatedBy: activatedBy || null,
    subscriptionEnd: plan === 'trial' ? null : (hasFutureExpiry ? endDate : null),
    trialEnd: plan === 'trial' && hasFutureExpiry ? endDate : null,
  }
}

const resolveDisplayStatus = (userData = {}) => {
  if (userData?.role === 'admin' || userData?.plan === 'admin') return 'active'
  if (userData?.emailVerified === true && userData?.status === 'pending_verification') return 'active'
  return userData?.status || 'inactive'
}

function UserDetailById() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [userData, setUserData] = useState(null)
  const [licenseData, setLicenseData] = useState(null)
  const [deviceData, setDeviceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [licenseForm, setLicenseForm] = useState({
    hid: '',
    days: 30,
    hours: 0,
    minutes: 0,
    plan: 'pro',
    estado: 'activo',
  })
  const [nowMs, setNowMs] = useState(Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000) // Actualiza cada segundo para temporizador en vivo

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) {
        navigate('/usuarios')
        return
      }
      
      try {
        // Fetch user data
        const userRef = doc(db, 'users', userId)
        const userSnap = await getDoc(userRef)
        
        if (userSnap.exists()) {
          const data = userSnap.data()
          setUserData(data)
          setEditForm({
            nombre: data.nombre || '',
            celular: data.celular || '',
            documento: data.documento || data.cedula || '',
            plan: data.plan || 'trial',
            role: data.role || 'user',
            daysRemaining: data.daysRemaining || 30,
            status: resolveDisplayStatus(data)
          })
        } else {
          navigate('/usuarios')
          return
        }
        
        // Fetch license data (buscar por userId campo, no por document ID)
        const licensesRef = collection(db, 'licenses')
        const licenseQuery = query(licensesRef, where('userId', '==', userId))
        const licenseQuerySnap = await getDocs(licenseQuery)
        
        if (!licenseQuerySnap.empty) {
          const licenseDoc = licenseQuerySnap.docs[0]
          const loadedLicense = {
            id: licenseDoc.id, // Este es el HID
            ...licenseDoc.data()
          }
          setLicenseData(loadedLicense)
          setLicenseForm((prev) => ({
            ...prev,
            hid: loadedLicense.hid || loadedLicense.id || '',
            plan: loadedLicense.plan || data.plan || 'pro',
            estado: loadedLicense.estado || 'activo',
          }))
        }

        const devicesRef = collection(db, 'devices')
        const deviceQuery = query(devicesRef, where('currentUserUid', '==', userId))
        const deviceQuerySnap = await getDocs(deviceQuery)
        if (!deviceQuerySnap.empty) {
          const devices = deviceQuerySnap.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
          devices.sort((a, b) => {
            const aTime = a.lastSeenAt?.toDate ? a.lastSeenAt.toDate() : new Date(a.lastSeenAt || 0)
            const bTime = b.lastSeenAt?.toDate ? b.lastSeenAt.toDate() : new Date(b.lastSeenAt || 0)
            return bTime - aTime
          })
          setDeviceData(devices[0])
          setLicenseForm((prev) => ({
            ...prev,
            hid: prev.hid || devices[0].hid || devices[0].id || '',
          }))
        }
        
      } catch (error) {
        console.error('Error fetching user data:', error)
        navigate('/usuarios')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [userId, navigate])

  const handleSave = async () => {
    setSaving(true)
    setActionError('')
    try {
      const daysRemaining = parseInt(editForm.daysRemaining) || 0
      const userUpdate = {
        nombre: editForm.nombre,
        celular: editForm.celular,
        cedula: editForm.documento,
        documento: editForm.documento,
        plan: editForm.plan,
        role: editForm.role,
        daysRemaining,
        status: editForm.status
      }

      await updateDoc(doc(db, 'users', userId), userUpdate)

      if (licenseData?.id) {
        const durationPatch = resolveLicenseDurationPatch({
          daysRemaining,
          currentLicense: licenseData,
        })

        await updateDoc(doc(db, 'licenses', licenseData.id), {
          userId,
          userEmail: userData?.email || licenseData.userEmail || '',
          plan: editForm.plan,
          ...durationPatch,
          estado: durationPatch.estadoSugerido === 'bloqueado'
            ? 'bloqueado'
            : (editForm.status === 'active' ? 'activo' : editForm.status === 'inactive' ? 'bloqueado' : editForm.status),
          currentOwnerUid: userId,
          lastUserUid: userId,
          updatedAt: new Date(),
        })
      } else if (editForm.status === 'active' || editForm.plan !== 'trial') {
        await upsertUserLicense({
          plan: editForm.plan,
          estado: editForm.status === 'inactive' ? 'bloqueado' : 'activo',
          days: Number(editForm.daysRemaining) || 0,
          hours: 0,
        })
      }

      setUserData({ ...userData, ...userUpdate, status: resolveDisplayStatus({ ...userData, ...userUpdate }) })
      if (licenseData?.id) {
        const durationPatch = resolveLicenseDurationPatch({
          daysRemaining,
          currentLicense: licenseData,
        })

        setLicenseData({
          ...licenseData,
          userId,
          userEmail: userData?.email || licenseData.userEmail || '',
          plan: editForm.plan,
          ...durationPatch,
          estado: durationPatch.estadoSugerido === 'bloqueado'
            ? 'bloqueado'
            : (editForm.status === 'active' ? 'activo' : editForm.status === 'inactive' ? 'bloqueado' : editForm.status),
          currentOwnerUid: userId,
          lastUserUid: userId,
          updatedAt: new Date(),
        })
      }
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving:', error)
      setActionError(error.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const upsertUserLicense = async ({ plan, estado, days, hours, minutes }) => {
    const hidRaw = licenseForm.hid || deviceData?.hid || deviceData?.id || ''
    const normalizedHid = hidRaw.trim().toUpperCase()
    if (!normalizedHid) {
      throw new Error('No hay HID disponible. Iniciá sesión desde un equipo para detectarlo o cargalo manualmente.')
    }

    const now = new Date()
    const expiryPatch = resolveLicenseExpiryPatch({ days, hours, minutes })
    const finalEstado = expiryPatch.isExpired ? 'bloqueado' : (estado || 'activo')

    const nextLicense = {
      hid: normalizedHid,
      userId,
      userEmail: userData?.email || '',
      plan: plan || 'pro',
      ...expiryPatch,
      estado: finalEstado,
      trialUsed: true,
      activatedBy: 'admin',
      activatedAt: licenseData?.activatedAt || now,
      currentOwnerUid: userId,
      lastUserUid: userId,
      createdAt: licenseData?.createdAt || now,
      updatedAt: now,
    }

    await setDoc(doc(db, 'licenses', normalizedHid), nextLicense, { merge: true })

    await setDoc(doc(db, 'users', userId), buildUserLicenseFields({
      plan: nextLicense.plan,
      daysRemaining: expiryPatch.diasRestantes,
      status: nextLicense.estado === 'bloqueado' ? 'inactive' : 'active',
      activatedAt: nextLicense.activatedAt,
      activatedBy: nextLicense.activatedBy,
      hid: normalizedHid,
      expiresAt: nextLicense.expiresAt,
    }), { merge: true })

    setLicenseData({ id: normalizedHid, ...nextLicense })
    setUserData((prev) => ({
      ...prev,
      ...buildUserLicenseFields({
        plan: nextLicense.plan,
        daysRemaining: expiryPatch.diasRestantes,
        status: nextLicense.estado === 'bloqueado' ? 'inactive' : 'active',
        activatedAt: nextLicense.activatedAt,
        activatedBy: nextLicense.activatedBy,
        hid: normalizedHid,
        expiresAt: nextLicense.expiresAt,
      }),
      status: nextLicense.estado === 'bloqueado' ? 'inactive' : 'active',
    }))
  }

  const handleLicenseApply = async () => {
    setSaving(true)
    setActionError('')
    try {
      const days = Math.max(0, parseInt(licenseForm.days || 0) || 0)
      const hours = Math.max(0, parseInt(licenseForm.hours || 0) || 0)
      const minutes = Math.max(0, parseInt(licenseForm.minutes || 0) || 0)
      await upsertUserLicense({
        plan: licenseForm.plan,
        estado: licenseForm.estado,
        days,
        hours,
        minutes,
      })
    } catch (error) {
      console.error('Error applying license:', error)
      setActionError(error.message || 'Error al actualizar licencia')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setActionError('')
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('Sesión inválida. Volvé a iniciar sesión como administrador.')
      }

      const token = await currentUser.getIdToken()
      const response = await fetch('https://us-central1-nestxcut.cloudfunctions.net/deleteUserCompletely', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, email: userData?.email }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'No se pudo eliminar el usuario')
      }
       
      navigate('/usuarios')
    } catch (error) {
      console.error('Error deleting:', error)
      setActionError(error.message || String(error) || 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

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

  const effectiveStatus = resolveDisplayStatus(userData)
  const licenseExpiryDate = toDateOrNull(licenseData?.expiresAt)
  const licenseRemainingLabel = (() => {
    if (!licenseExpiryDate) return null
    const diffMs = licenseExpiryDate.getTime() - nowMs
    return formatHumanDuration(diffMs)
  })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/usuarios')}
            className="p-2 rounded-md hover:bg-surface-container-high transition-colors"
          >
            <svg className="w-5 h-5 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Detalle del Usuario</h1>
            <p className="text-on-surface-variant mt-1">Información completa</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="btn-primary"
              >
                Editar
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-md bg-error/20 text-error hover:bg-error/30 transition-colors"
              >
                Eliminar
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md">
            <h3 className="text-lg font-semibold text-on-surface mb-4">Confirmar eliminación</h3>
            <p className="text-on-surface-variant mb-6">
              ¿Estás seguro de eliminar al usuario <strong>{userData?.email}</strong>? 
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-md bg-error text-white hover:bg-error/80"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Info Card */}
      <div className="card">
        {actionError && (
          <div className="mb-4 rounded-md bg-error/15 border border-error/30 text-error px-3 py-2 text-sm">
            {actionError}
          </div>
        )}
        <h2 className="text-lg font-semibold text-on-surface mb-4">Información Personal</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Email
            </label>
            <p className="text-on-surface">{userData?.email || 'N/A'}</p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Nombre
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.nombre}
                onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                className="input-field"
                placeholder="Nombre del usuario"
              />
            ) : (
              <p className="text-on-surface">{userData?.nombre || 'No registrado'}</p>
            )}
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Celular
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.celular}
                onChange={(e) => setEditForm({...editForm, celular: e.target.value})}
                className="input-field"
                placeholder="Celular"
              />
            ) : (
              <p className="text-on-surface">{userData?.celular || 'No registrado'}</p>
            )}
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Cédula / NIT
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.documento}
                onChange={(e) => setEditForm({...editForm, documento: e.target.value})}
                className="input-field"
                placeholder="Cédula o NIT"
              />
            ) : (
              <p className="text-on-surface font-mono">{userData?.documento || 'No registrado'}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Rol
            </label>
            {isEditing ? (
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                className="input-field"
              >
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
              </select>
            ) : (
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                userData?.role === 'admin' 
                  ? 'bg-primary-container/20 text-primary-container' 
                  : 'bg-secondary-container/20 text-on-secondary-container'
              }`}>
                {userData?.role === 'admin' ? 'Admin' : 'Usuario'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* License Info Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Licencia</h2>

        <div className="mb-4 p-4 rounded-md border border-outline-variant/60 bg-surface-container-low">
          <p className="text-sm text-on-surface-variant mb-3">
            Centro operativo recomendado: gestioná acá la licencia del usuario actual.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                HID
              </label>
              <input
                type="text"
                value={licenseForm.hid}
                onChange={(e) => setLicenseForm({ ...licenseForm, hid: e.target.value.toUpperCase() })}
                className="input-field font-mono"
                placeholder="HID-XXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                Plan
              </label>
              <select
                value={licenseForm.plan}
                onChange={(e) => setLicenseForm({ ...licenseForm, plan: e.target.value })}
                className="input-field"
              >
                <option value="trial">Trial</option>
                <option value="pro">Pro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                Duración (días)
              </label>
              <input
                type="number"
                min="0"
                value={licenseForm.days}
                onChange={(e) => setLicenseForm({ ...licenseForm, days: Math.max(0, parseInt(e.target.value || '0') || 0) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                Duración (horas)
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={licenseForm.hours}
                onChange={(e) => setLicenseForm({ ...licenseForm, hours: Math.max(0, parseInt(e.target.value || '0') || 0) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                Duración (min)
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={licenseForm.minutes}
                onChange={(e) => setLicenseForm({ ...licenseForm, minutes: Math.max(0, parseInt(e.target.value || '0') || 0) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                Estado de licencia
              </label>
              <select
                value={licenseForm.estado}
                onChange={(e) => setLicenseForm({ ...licenseForm, estado: e.target.value })}
                className="input-field"
              >
                <option value="activo">Activo</option>
                <option value="bloqueado">Bloqueado / desactivado</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleLicenseApply}
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? 'Aplicando...' : (licenseData?.id ? 'Actualizar licencia' : 'Asignar / activar licencia')}
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              HID del Dispositivo
            </label>
            <p className="text-on-surface font-mono">
              {licenseData?.hid || deviceData?.hid || 'Sin licencia'}
            </p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Estado de Licencia
            </label>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
              licenseData?.estado === 'activo' 
                ? 'bg-green-500/20 text-green-400' 
                : licenseData?.estado === 'bloqueado'
                  ? 'bg-error/20 text-error'
                  : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {licenseData?.estado || 'Sin licencia'}
            </span>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Días Asignados
            </label>
            <p className="text-on-surface font-mono">{licenseData?.diasAsignados || 0}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Vence
            </label>
            <p className="text-on-surface">{licenseExpiryDate ? formatDate(licenseExpiryDate) : 'N/A'}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Restante (runtime)
            </label>
            <p className="text-on-surface font-mono">{licenseRemainingLabel || 'N/A'}</p>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Activado Por
            </label>
            <p className="text-on-surface">{licenseData?.activatedBy || 'N/A'}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Última actividad del equipo
            </label>
            <p className="text-on-surface">{deviceData?.lastSeenAt ? formatDate(deviceData.lastSeenAt) : 'N/A'}</p>
          </div>

<div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Email detectado en equipo
            </label>
            <p className="text-on-surface">{deviceData?.currentUserEmail || 'N/A'}</p>
          </div>

          {/* Temporizador en vivo - pequeño */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              Tiempo Restante
            </label>
            {licenseExpiryDate ? (
              (() => {
                const diffMs = licenseExpiryDate.getTime() - nowMs
                if (diffMs <= 0) {
                  return (
                    <span className="inline-flex px-2 py-1 rounded bg-error/20 text-error text-xs font-bold">
                      VENCIDA
                    </span>
                  )
                }
                
                const totalSeconds = Math.floor(diffMs / 1000)
                const days = Math.floor(totalSeconds / (24 * 60 * 60))
                const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
                const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
                const seconds = totalSeconds % 60
                
                return (
                  <div className="flex items-center gap-1 text-sm">
                    {days > 0 && (
                      <span className="text-on-surface font-mono font-bold">{days}d </span>
                    )}
                    <span className="bg-surface-container-high px-2 py-1 rounded font-mono text-on-surface font-bold">
                      {String(hours).padStart(2, '0')}
                    </span>
                    <span className="text-on-surface-variant">:</span>
                    <span className="bg-surface-container-high px-2 py-1 rounded font-mono text-on-surface font-bold">
                      {String(minutes).padStart(2, '0')}
                    </span>
                    <span className="text-on-surface-variant">:</span>
                    <span className="bg-surface-container-high px-2 py-1 rounded font-mono text-on-surface-variant animate-pulse">
                      {String(seconds).padStart(2, '0')}
                    </span>
                  </div>
                )
              })()
            ) : (
              <p className="text-on-surface-variant text-xs">Sin fecha de vencimiento</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
              UID Firebase
            </label>
            <p className="text-on-surface font-mono text-xs">{userId}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserDetailById
