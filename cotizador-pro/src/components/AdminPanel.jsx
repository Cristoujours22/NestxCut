// src/components/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { makeUserAdmin, removeUserAdmin } from '../utils/subscription';
import { formatDate } from '../utils/subscription';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../utils/subscription';

export default function AdminPanel() {
  const { userData, refreshUserData } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Solo admins pueden ver esto
  if (!isAdmin(userData)) {
    return null;
  }

  const loadUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    } catch (err) {
      console.error('[AdminPanel] Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleMakeAdmin = async (uid) => {
    setActionLoading(uid);
    try {
      await makeUserAdmin(uid);
      await loadUsers();
      if (userData?.uid === uid) {
        await refreshUserData();
      }
    } catch (err) {
      console.error('[AdminPanel] Error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveAdmin = async (uid) => {
    setActionLoading(uid);
    try {
      await removeUserAdmin(uid, 30);
      await loadUsers();
    } catch (err) {
      console.error('[AdminPanel] Error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[#99f7ff]">admin_panel_settings</span>
        <h2 className="font-['Space_Grotesk'] text-[15px] font-bold text-[#99f7ff] uppercase tracking-wider">
          Panel de Administración
        </h2>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="ml-auto text-[#a3aac4] hover:text-[#99f7ff] p-1"
          title="Actualizar"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
        </button>
      </div>

      <div className="glass-panel rounded-2xl border border-[#1a233a] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0f1930] border-b border-[#1a233a]">
              <tr>
                <th className="text-left px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Usuario</th>
                <th className="text-left px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Plan</th>
                <th className="text-left px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Rol</th>
                <th className="text-left px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Vence</th>
                <th className="text-right px-4 py-3 text-[#a3aac4] text-xs uppercase font-bold">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a233a]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#a3aac4]">
                    <div className="flex items-center justify-center gap-2">
                      <span className="animate-spin material-symbols-outlined">sync</span>
                      Cargando...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#a3aac4]">
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#0f1930]/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-[#dee5ff] text-sm font-medium">
                        {u.email || (u.uid ? u.uid.slice(0, 8) + '...' : 'Sin email')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        u.plan === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                        u.plan === 'premium' ? 'bg-green-500/20 text-green-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {u.plan || 'trial'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#a3aac4] text-sm">
                      {u.role === 'admin' ? (
                        <span className="text-purple-400">Sin expiración</span>
                      ) : u.subscriptionEnd ? (
                        formatDate(u.subscriptionEnd)
                      ) : u.trialEnd ? (
                        formatDate(u.trialEnd)
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role === 'admin' ? (
                        <button
                          onClick={() => handleRemoveAdmin(u.id)}
                          disabled={actionLoading === u.id}
                          className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-400 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                        >
                          {actionLoading === u.id ? '...' : 'Quitar Admin'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMakeAdmin(u.id)}
                          disabled={actionLoading === u.id}
                          className="text-xs bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                        >
                          {actionLoading === u.id ? '...' : 'Hacer Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[#a3aac4]">
        Total: {users.length} usuario(s)
      </p>
    </div>
  );
}