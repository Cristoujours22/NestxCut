import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

function UsersList() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(q)
        
        const usersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        setUsers(usersData)
      } catch (error) {
        console.error('Error fetching users:', error)
        // Si es error de permisos, mostrar mensaje
        if (error.code === 'permission-denied' || error.message.includes('permission')) {
          setError('Sin permisos de lectura. Verifica las reglas de Firestore.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase()
    return (
      (user.email || '').toLowerCase().includes(search) ||
      (user.nombre || '').toLowerCase().includes(search) ||
      (user.documento || '').toLowerCase().includes(search)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary animate-pulse">Cargando usuarios...</div>
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
            <h1 className="text-2xl font-bold text-on-surface">Usuarios</h1>
            <p className="text-on-surface-variant mt-1">{users.length} usuario(s) registrado(s)</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <input
          type="text"
          placeholder="Buscar por email, nombre o documento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field"
        />
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Nombre / Email
                </th>
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Cédula / NIT
                </th>
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Rol
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                return (
                  <tr 
                    key={user.id}
                    onClick={() => navigate(`/usuario/${user.id}`)}
                    className="border-b border-outline-variant/50 hover:bg-surface-container-high cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div>
                        <p className="text-on-surface font-medium">
                          {user.nombre || user.email || 'Sin nombre'}
                        </p>
                        <p className="text-on-surface-variant text-sm">
                          {user.email}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-on-surface font-mono">
                        {user.documento || 'N/A'}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'admin' 
                          ? 'bg-primary-container/20 text-primary-container' 
                          : 'bg-secondary-container/20 text-on-secondary-container'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-on-surface-variant">
              No se encontraron usuarios
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UsersList
