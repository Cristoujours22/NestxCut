import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'

const MS_PER_MINUTE = 1000 * 60
const MS_PER_DAY = 1000 * 60 * 60 * 24
const MAX_RECENT_ACTIVITY = 12

const normalizeText = (value = '') => String(value).toLowerCase().trim()

const toDateOrNull = (value) => {
  if (!value) return null
  if (value?.toDate) return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatRemaining = (expiresAt, nowMs = Date.now()) => {
  const date = toDateOrNull(expiresAt)
  if (!date) return 'Sin fecha'

  const diffMs = date.getTime() - nowMs
  if (diffMs <= 0) return 'Vencida'

  const totalMinutes = Math.ceil(diffMs / MS_PER_MINUTE)
  const days = Math.floor(totalMinutes / (24 * 60))
  const afterDays = totalMinutes % (24 * 60)
  const hours = Math.floor(afterDays / 60)
  const minutes = afterDays % 60

  if (days === 0 && hours === 0) return `${minutes} min`
  if (days === 0) return `${hours}h ${minutes}m`
  return `${days}d ${hours}h`
}

const formatDateTime = (value) => {
  const date = toDateOrNull(value)
  if (!date) return 'Sin fecha'
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getLicenseStatus = (license, nowMs = Date.now()) => {
  const expiresAt = toDateOrNull(license?.expiresAt)
  const rawEstado = (license?.estado || '').toLowerCase()

  if (rawEstado === 'bloqueado') return 'Bloqueada'
  if (expiresAt && expiresAt.getTime() <= nowMs) return 'Vencida'
  if (rawEstado === 'activo' || expiresAt) return 'Activa'
  return 'Pendiente'
}

const buildLicenseExtensionPatch = (license, extendDays) => {
  const safeExtendDays = Math.max(0, Number(extendDays) || 0)
  const now = new Date()
  const currentExpiry = toDateOrNull(license?.expiresAt)
  const baseDate = currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now
  const nextExpiresAt = new Date(baseDate.getTime() + (safeExtendDays * MS_PER_DAY))
  const remainingDays = Math.max(0, Math.ceil((nextExpiresAt.getTime() - now.getTime()) / MS_PER_DAY))

  return {
    expiresAt: nextExpiresAt,
    diasAsignados: remainingDays,
    diasRestantes: remainingDays,
    estado: 'activo',
  }
}

function Dashboard() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [users, setUsers] = useState([])
  const [licenses, setLicenses] = useState([])
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('Todos')
  const [filterPlan, setFilterPlan] = useState('Todos')
  const [inlineActionLoadingById, setInlineActionLoadingById] = useState({})
  
  // Determinar tab activa según URL
  const getActiveTab = () => {
    if (location.pathname === '/usuario') return 'usuario'
    return 'dashboard'
  }
  
  const activeTab = getActiveTab()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [usersSnap, licensesSnap, devicesSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'licenses')),
          getDocs(collection(db, 'devices')),
        ])

        setUsers(usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
        setLicenses(licensesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
        setDevices(devicesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const nowMs = Date.now()

  const usersById = useMemo(() => {
    return users.reduce((acc, u) => {
      acc[u.id] = u
      return acc
    }, {})
  }, [users])

  const recentActivity = useMemo(() => {
    const events = []

    users.forEach((u) => {
      events.push({
        id: `user-created-${u.id}`,
        timestamp: toDateOrNull(u.createdAt),
        type: 'Nuevo usuario',
        entity: u.nombre || u.email || u.id,
        detail: `Alta de usuario (${u.email || 'sin email'})`,
        userId: u.id,
      })

      if (u.updatedAt) {
        events.push({
          id: `user-updated-${u.id}`,
          timestamp: toDateOrNull(u.updatedAt),
          type: 'Usuario actualizado',
          entity: u.nombre || u.email || u.id,
          detail: 'Cambios de perfil o estado',
          userId: u.id,
        })
      }

      if (u.activatedAt) {
        events.push({
          id: `user-activated-${u.id}`,
          timestamp: toDateOrNull(u.activatedAt),
          type: 'Usuario activado',
          entity: u.nombre || u.email || u.id,
          detail: `Activación por ${u.activatedBy || 'sistema'}`,
          userId: u.id,
        })
      }
    })

    licenses.forEach((license) => {
      const owner = usersById[license.userId]
      const ownerLabel = owner?.nombre || owner?.email || license.userEmail || license.userId || 'Usuario no encontrado'

      events.push({
        id: `license-created-${license.id}`,
        timestamp: toDateOrNull(license.createdAt),
        type: 'Licencia creada',
        entity: ownerLabel,
        detail: `${license.plan || 'Plan N/A'} · ${license.hwid || license.hid || 'sin HID/HWID'}`,
        userId: license.userId,
      })

      if (license.updatedAt) {
        events.push({
          id: `license-updated-${license.id}`,
          timestamp: toDateOrNull(license.updatedAt),
          type: 'Licencia actualizada',
          entity: ownerLabel,
          detail: `${license.plan || 'Plan N/A'} · estado ${getLicenseStatus(license, nowMs)}`,
          userId: license.userId,
        })
      }

      if (license.activatedAt) {
        events.push({
          id: `license-activated-${license.id}`,
          timestamp: toDateOrNull(license.activatedAt),
          type: 'Licencia activada',
          entity: ownerLabel,
          detail: `Activada por ${license.activatedBy || 'sistema'}`,
          userId: license.userId,
        })
      }
    })

    devices.forEach((device) => {
      const owner = usersById[device.userId]
      const ownerLabel = owner?.nombre || owner?.email || device.userEmail || device.userId || 'Usuario no encontrado'

      if (device.createdAt) {
        events.push({
          id: `device-created-${device.id}`,
          timestamp: toDateOrNull(device.createdAt),
          type: 'Dispositivo registrado',
          entity: ownerLabel,
          detail: device.deviceName || device.deviceId || device.id,
          userId: device.userId,
        })
      }

      if (device.lastSeenAt) {
        events.push({
          id: `device-seen-${device.id}`,
          timestamp: toDateOrNull(device.lastSeenAt),
          type: 'Última actividad dispositivo',
          entity: ownerLabel,
          detail: device.deviceName || device.deviceId || device.id,
          userId: device.userId,
        })
      }
    })

    return events
      .filter((event) => event.timestamp)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, MAX_RECENT_ACTIVITY)
  }, [users, licenses, devices, usersById, nowMs])

  const activeLicenses = useMemo(() => {
    return licenses.filter((license) => getLicenseStatus(license, nowMs) === 'Activa')
  }, [licenses, nowMs])

  const expiringSoonCount = useMemo(() => {
    return activeLicenses.filter((license) => {
      const expiresAt = toDateOrNull(license?.expiresAt)
      if (!expiresAt) return false
      const diffMs = expiresAt.getTime() - nowMs
      return diffMs > 0 && diffMs <= 7 * MS_PER_DAY
    }).length
  }, [activeLicenses, nowMs])

  const expiringIn24hLicenses = useMemo(() => {
    return activeLicenses
      .filter((license) => {
        const expiresAt = toDateOrNull(license?.expiresAt)
        if (!expiresAt) return false
        const diffMs = expiresAt.getTime() - nowMs
        return diffMs > 0 && diffMs <= MS_PER_DAY
      })
      .sort((a, b) => toDateOrNull(a.expiresAt).getTime() - toDateOrNull(b.expiresAt).getTime())
  }, [activeLicenses, nowMs])

  const expiringIn2To7DaysLicenses = useMemo(() => {
    return activeLicenses
      .filter((license) => {
        const expiresAt = toDateOrNull(license?.expiresAt)
        if (!expiresAt) return false
        const diffMs = expiresAt.getTime() - nowMs
        return diffMs > MS_PER_DAY && diffMs <= 7 * MS_PER_DAY
      })
      .sort((a, b) => toDateOrNull(a.expiresAt).getTime() - toDateOrNull(b.expiresAt).getTime())
  }, [activeLicenses, nowMs])

  const usersWithoutLicenseCount = useMemo(() => {
    const licensedUserIds = new Set(
      licenses
        .map((license) => license?.userId)
        .filter(Boolean)
    )

    return users.filter((u) => !licensedUserIds.has(u.id)).length
  }, [users, licenses])

  const staleTrialUsers = useMemo(() => {
    const licensesByUserId = licenses.reduce((acc, license) => {
      if (!license?.userId) return acc
      if (!acc[license.userId]) acc[license.userId] = []
      acc[license.userId].push(license)
      return acc
    }, {})

    return users
      .filter((u) => {
        const createdAt = toDateOrNull(u?.createdAt)
        if (!createdAt) return false

        const accountAgeMs = nowMs - createdAt.getTime()
        if (accountAgeMs <= 7 * MS_PER_DAY) return false

        const userLicenses = licensesByUserId[u.id] || []
        const hasPaidOrActiveLicense = userLicenses.some((license) => {
          const plan = normalizeText(license?.plan)
          const status = getLicenseStatus(license, nowMs)
          return (plan && plan !== 'trial') || status === 'Activa'
        })
        if (hasPaidOrActiveLicense) return false

        const userPlan = normalizeText(u?.plan)
        const maybeTrial = !userPlan || userPlan === 'trial'
        return maybeTrial
      })
      .slice(0, 10)
  }, [users, licenses, nowMs])

  const hasOperationalAlerts = useMemo(() => {
    return expiringIn24hLicenses.length > 0 || expiringIn2To7DaysLicenses.length > 0 || staleTrialUsers.length > 0
  }, [expiringIn24hLicenses.length, expiringIn2To7DaysLicenses.length, staleTrialUsers.length])

  const expiringLicenses = useMemo(() => {
    return activeLicenses
      .filter((license) => {
        const expiresAt = toDateOrNull(license?.expiresAt)
        if (!expiresAt) return false
        return expiresAt.getTime() > nowMs
      })
      .sort((a, b) => toDateOrNull(a.expiresAt).getTime() - toDateOrNull(b.expiresAt).getTime())
      .slice(0, 10)
  }, [activeLicenses, nowMs])

  const planOptions = useMemo(() => {
    const plans = Array.from(
      new Set(
        licenses
          .map((license) => (license?.plan || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))
    return ['Todos', ...plans]
  }, [licenses])

  const statusOptions = ['Todos', 'Activa', 'Vencida', 'Bloqueada', 'Pendiente']

  const passesDashboardFilters = (license) => {
    if (!license) return false
    const status = getLicenseStatus(license, nowMs)
    const statusOk = filterStatus === 'Todos' || status === filterStatus
    const planOk =
      filterPlan === 'Todos' || normalizeText(license.plan) === normalizeText(filterPlan)

    return statusOk && planOk
  }

  const filteredExpiringLicenses = useMemo(() => {
    return expiringLicenses.filter(passesDashboardFilters)
  }, [expiringLicenses, filterStatus, filterPlan, nowMs])

  const filteredExpiringIn24hLicenses = useMemo(() => {
    return expiringIn24hLicenses.filter(passesDashboardFilters)
  }, [expiringIn24hLicenses, filterStatus, filterPlan, nowMs])

  const filteredExpiringIn2To7DaysLicenses = useMemo(() => {
    return expiringIn2To7DaysLicenses.filter(passesDashboardFilters)
  }, [expiringIn2To7DaysLicenses, filterStatus, filterPlan, nowMs])

  const quickMatches = useMemo(() => {
    const term = normalizeText(searchTerm)
    if (!term) return []

    return users
      .map((u) => {
        const email = normalizeText(u.email)
        const nombre = normalizeText(u.nombre)
        const documento = normalizeText(u.documento)
        const full = `${nombre} ${email} ${documento}`.trim()

        const startsWithBoost =
          email.startsWith(term) || nombre.startsWith(term) || documento.startsWith(term)
            ? 0
            : 1

        return {
          ...u,
          _searchable: full,
          _rank: startsWithBoost,
        }
      })
      .filter((u) => u._searchable.includes(term))
      .sort((a, b) => a._rank - b._rank)
      .slice(0, 5)
  }, [users, searchTerm])

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'usuario', label: 'Mi Usuario', path: '/usuario' },
  ]

  // Solo admin puede ver estos
  const adminItems = [
    { id: 'usuarios', label: 'Todos los Usuarios', path: '/usuarios' },
    { id: 'licencias', label: 'Licencias', path: '/licencias' },
    { id: 'configuracion', label: 'Configuración', path: '/configuracion' },
  ]

  const setInlineLoading = (licenseId, isLoading) => {
    setInlineActionLoadingById((prev) => ({
      ...prev,
      [licenseId]: isLoading,
    }))
  }

  const applyInlineLicenseUpdate = async (license, patch) => {
    if (!license?.id) return
    const licenseId = license.id
    setInlineLoading(licenseId, true)
    try {
      await updateDoc(doc(db, 'licenses', licenseId), patch)
      setLicenses((prev) => prev.map((item) => (item.id === licenseId ? { ...item, ...patch } : item)))
    } catch (error) {
      console.error('Error applying inline license action:', error)
      window.alert('No se pudo aplicar la acción inline. Reintentá en unos segundos.')
    } finally {
      setInlineLoading(licenseId, false)
    }
  }

  const handleInlineExtend = async (license, days) => {
    const patch = buildLicenseExtensionPatch(license, days)
    await applyInlineLicenseUpdate(license, patch)
  }

  const handleInlineToggleBlock = async (license, shouldBlock) => {
    const patch = {
      estado: shouldBlock ? 'bloqueado' : 'activo',
    }
    await applyInlineLicenseUpdate(license, patch)
  }

  const renderInlineActions = (license, compact = false) => {
    const status = getLicenseStatus(license, nowMs)
    const isBusy = !!inlineActionLoadingById[license.id]

    return (
      <div className={`flex flex-wrap items-center gap-2 ${compact ? 'mt-2' : ''}`}>
        <button
          onClick={() => handleInlineExtend(license, 7)}
          className="text-xs px-2 py-1 rounded border border-outline-variant hover:bg-surface-container-high disabled:opacity-50"
          disabled={isBusy}
        >
          +7d
        </button>
        <button
          onClick={() => handleInlineExtend(license, 30)}
          className="text-xs px-2 py-1 rounded border border-outline-variant hover:bg-surface-container-high disabled:opacity-50"
          disabled={isBusy}
        >
          +30d
        </button>
        <button
          onClick={() => handleInlineToggleBlock(license, status !== 'Bloqueada')}
          className="text-xs px-2 py-1 rounded border border-outline-variant hover:bg-surface-container-high disabled:opacity-50"
          disabled={isBusy}
        >
          {status === 'Bloqueada' ? 'Desbloquear' : 'Bloquear'}
        </button>
        {license.userId ? (
          <button
            onClick={() => navigate(`/usuario/${license.userId}`)}
            className="text-primary hover:underline text-xs"
            disabled={isBusy}
          >
            Ver detalle
          </button>
        ) : (
          <span className="text-xs text-on-surface-variant">Sin vínculo</span>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-container border-r border-outline-variant flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-outline-variant">
          <h1 className="text-xl font-bold text-primary-container">NESTXCUT</h1>
          <p className="text-xs text-on-surface-variant">Panel Admin</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${
                activeTab === item.id
                  ? 'bg-primary-container/10 text-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {item.label}
            </button>
          ))}
          
          {/* Admin items */}
          {isAdmin && (
            <>
              <div className="border-t border-outline-variant my-2"></div>
              {adminItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${
                    activeTab === item.id
                      ? 'bg-primary-container/10 text-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </>
          )}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-outline-variant">
          <p className="text-sm truncate">{user?.email}</p>
          <p className="text-xs text-primary-container">{isAdmin ? 'Admin' : 'Usuario'}</p>
          <button
            onClick={logout}
            className="text-xs text-error hover:underline mt-1"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {activeTab === 'dashboard' && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-on-surface">Dashboard</h2>
              <p className="text-on-surface-variant mt-1">Bienvenido al panel de administración</p>
            </div>

            {loading ? (
              <div className="card">
                <div className="text-center py-12 text-on-surface-variant">
                  <p className="text-lg">Cargando métricas...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="card p-4">
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant">Usuarios totales</p>
                    <p className="text-3xl font-bold text-on-surface mt-2">{users.length}</p>
                  </div>
                  <div className="card p-4">
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant">Licencias activas</p>
                    <p className="text-3xl font-bold text-on-surface mt-2">{activeLicenses.length}</p>
                  </div>
                  <div className="card p-4">
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant">Vencen en 7 días</p>
                    <p className="text-3xl font-bold text-on-surface mt-2">{expiringSoonCount}</p>
                  </div>
                  <div className="card p-4">
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant">Usuarios sin licencia</p>
                    <p className="text-3xl font-bold text-on-surface mt-2">{usersWithoutLicenseCount}</p>
                  </div>
                </div>

                <div className="card p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="input-field max-w-[220px]"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <select
                      value={filterPlan}
                      onChange={(e) => setFilterPlan(e.target.value)}
                      className="input-field max-w-[220px]"
                    >
                      {planOptions.map((plan) => (
                        <option key={plan} value={plan}>{plan}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Buscar usuario (email, nombre o documento)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field"
                    />
                    {searchTerm.trim() && (
                      <div className="mt-2 border border-outline-variant rounded-md overflow-hidden">
                        {quickMatches.length === 0 ? (
                          <p className="text-sm text-on-surface-variant px-3 py-2">Sin resultados</p>
                        ) : (
                          quickMatches.map((match) => (
                            <button
                              key={match.id}
                              onClick={() => navigate(`/usuario/${match.id}`)}
                              className="w-full text-left px-3 py-2 hover:bg-surface-container-high border-b border-outline-variant last:border-b-0"
                            >
                              <p className="text-sm font-medium text-on-surface">{match.nombre || match.email}</p>
                              <p className="text-xs text-on-surface-variant">{match.email || 'Sin email'} · {match.documento || 'Sin doc'}</p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {hasOperationalAlerts && (
                  <div className="card overflow-hidden border border-error/20">
                    <div className="px-4 py-3 border-b border-outline-variant bg-error/5">
                      <h3 className="text-lg font-semibold text-on-surface">Alertas operativas</h3>
                      <p className="text-sm text-on-surface-variant">Mostramos solo alertas con datos detectados en Firestore.</p>
                    </div>

                    <div className="p-4 space-y-4">
                      {filteredExpiringIn24hLicenses.length === 0 && filteredExpiringIn2To7DaysLicenses.length === 0 && staleTrialUsers.length === 0 && (
                        <p className="text-sm text-on-surface-variant">No hay alertas que coincidan con los filtros actuales.</p>
                      )}

                      {filteredExpiringIn24hLicenses.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-error">
                            Licencias que vencen hoy / en las próximas 24h ({filteredExpiringIn24hLicenses.length})
                          </p>
                          <div className="mt-2 space-y-2">
                            {filteredExpiringIn24hLicenses.slice(0, 5).map((license) => {
                              const owner = usersById[license.userId]
                              return (
                                <div
                                  key={license.id}
                                  className="w-full text-left px-3 py-2 rounded-md border border-outline-variant"
                                >
                                  <p className="text-sm font-medium text-on-surface">{owner?.nombre || owner?.email || license.userEmail || 'Usuario no encontrado'}</p>
                                  <p className="text-xs text-on-surface-variant">{license.plan || 'N/A'} · {formatRemaining(license.expiresAt, nowMs)}</p>
                                  {renderInlineActions(license, true)}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {filteredExpiringIn2To7DaysLicenses.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-on-surface">
                            Licencias que vencen en 2-7 días ({filteredExpiringIn2To7DaysLicenses.length})
                          </p>
                          <div className="mt-2 space-y-2">
                            {filteredExpiringIn2To7DaysLicenses.slice(0, 5).map((license) => {
                              const owner = usersById[license.userId]
                              return (
                                <div
                                  key={license.id}
                                  className="w-full text-left px-3 py-2 rounded-md border border-outline-variant"
                                >
                                  <p className="text-sm font-medium text-on-surface">{owner?.nombre || owner?.email || license.userEmail || 'Usuario no encontrado'}</p>
                                  <p className="text-xs text-on-surface-variant">{license.plan || 'N/A'} · {formatRemaining(license.expiresAt, nowMs)}</p>
                                  {renderInlineActions(license, true)}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {staleTrialUsers.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-on-surface">
                            Usuarios trial antiguos sin conversión detectada (&gt;7 días) ({staleTrialUsers.length})
                          </p>
                          <div className="mt-2 space-y-2">
                            {staleTrialUsers.slice(0, 5).map((trialUser) => (
                              <button
                                key={trialUser.id}
                                onClick={() => navigate(`/usuario/${trialUser.id}`)}
                                className="w-full text-left px-3 py-2 rounded-md border border-outline-variant hover:bg-surface-container-high"
                              >
                                <p className="text-sm font-medium text-on-surface">{trialUser.nombre || trialUser.email || 'Usuario sin nombre'}</p>
                                <p className="text-xs text-on-surface-variant">{trialUser.email || 'Sin email'} · Alta: {toDateOrNull(trialUser.createdAt)?.toLocaleDateString() || 'Sin fecha'}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-outline-variant">
                    <h3 className="text-lg font-semibold text-on-surface">Licencias por vencer</h3>
                    <p className="text-sm text-on-surface-variant">Top 10 próximas a vencer</p>
                  </div>

                  {filteredExpiringLicenses.length === 0 ? (
                    <div className="p-6 text-on-surface-variant text-sm">No hay licencias activas con fecha de vencimiento próxima.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-outline-variant">
                            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Usuario / Email</th>
                            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Plan</th>
                            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Tiempo restante</th>
                            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Estado</th>
                            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredExpiringLicenses.map((license) => {
                            const owner = usersById[license.userId]
                            const status = getLicenseStatus(license, nowMs)
                            return (
                              <tr key={license.id} className="border-b border-outline-variant/50">
                                <td className="p-4">
                                  <p className="text-on-surface font-medium">{owner?.nombre || owner?.email || license.userEmail || 'Usuario no encontrado'}</p>
                                  <p className="text-xs text-on-surface-variant">{owner?.email || license.userEmail || 'Sin email'}</p>
                                </td>
                                <td className="p-4 text-on-surface">{license.plan || 'N/A'}</td>
                                <td className="p-4 text-on-surface">{formatRemaining(license.expiresAt, nowMs)}</td>
                                <td className="p-4">
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                    status === 'Activa'
                                      ? 'bg-primary-container/20 text-primary-container'
                                      : status === 'Vencida'
                                        ? 'bg-error/20 text-error'
                                        : 'bg-secondary-container/20 text-on-secondary-container'
                                  }`}>
                                    {status}
                                  </span>
                                </td>
                                <td className="p-4">
                                  {renderInlineActions(license)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-outline-variant">
                    <h3 className="text-lg font-semibold text-on-surface">Actividad reciente</h3>
                    <p className="text-sm text-on-surface-variant">Feed compacto de eventos relevantes para seguimiento operativo.</p>
                  </div>

                  {recentActivity.length === 0 ? (
                    <div className="p-6 text-on-surface-variant text-sm">No hay actividad reciente con timestamps disponibles.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-outline-variant">
                            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Fecha</th>
                            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Evento</th>
                            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Entidad</th>
                            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Detalle</th>
                            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentActivity.map((event) => (
                            <tr key={event.id} className="border-b border-outline-variant/50">
                              <td className="p-4 text-sm text-on-surface">{formatDateTime(event.timestamp)}</td>
                              <td className="p-4">
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-secondary-container/20 text-on-secondary-container">
                                  {event.type}
                                </span>
                              </td>
                              <td className="p-4 text-sm text-on-surface font-medium">{event.entity}</td>
                              <td className="p-4 text-sm text-on-surface-variant">{event.detail}</td>
                              <td className="p-4">
                                {event.userId ? (
                                  <button
                                    onClick={() => navigate(`/usuario/${event.userId}`)}
                                    className="text-primary hover:underline text-xs"
                                  >
                                    Ver usuario
                                  </button>
                                ) : (
                                  <span className="text-xs text-on-surface-variant">N/A</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        
        {activeTab === 'usuario' && (
          <div className="card">
            <p className="text-on-surface-variant">Cargando...</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard
