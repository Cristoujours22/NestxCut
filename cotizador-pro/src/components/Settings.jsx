import { useState, useEffect } from 'react';
import pkg from '../../package.json' with { type: 'json' };
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import LicensingPanel from './licensing/LicensingPanel';
import ServicesModal from './ServicesModal';

const API = window.electronAPI;

export default function Settings() {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState({
    company_name: '', logo_data: '', currency: 'USD',
    tax_rate: 0, contact_email: '', contact_phone: '', address: '', nit: ''
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  useEffect(() => { 
    load(); 
  }, []);

  const load = async () => {
    try {
      if (API?.getCompanySettings) {
        const s = await API.getCompanySettings();
        console.log('[Settings] load() company settings:', s);
        if (s) {
          setCompany({
            company_name: s.company_name || '',
            logo_data: s.logo_data || '',
            logo_path: s.logo_path || '',
            currency: s.currency || 'USD',
            tax_rate: Number(s.tax_rate) || 0,
            contact_email: s.contact_email || '',
            contact_phone: s.contact_phone || '',
            address: s.address || '',
            nit: s.nit || ''
          });
          if (s.logo_data) {
            setPreviewUrl(s.logo_data);
          }
        }
      }
    } catch (e) {
      console.error('[Settings] load() error:', e);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const settingsToSave = {
        company_name: company.company_name || '',
        logo_data: previewUrl || '',
        logo_path: '',
        currency: company.currency || 'USD',
        tax_rate: company.tax_rate || 0,
        contact_email: company.contact_email || '',
        contact_phone: company.contact_phone || '',
        address: company.address || '',
        nit: company.nit || '',
        updatedAt: new Date().toISOString()
      };

      const result = await API?.saveCompanySettings?.(settingsToSave);
      if (result?.success) {
        console.log('[Settings] save() success');
        setMsg({ ok: true, text: 'Guardado correctamente' });
        setCompany(p => ({ ...p, logo_data: previewUrl || '' }));
      } else {
        setMsg({ ok: false, text: result?.error || 'Error al guardar' });
      }
    } catch (e) {
      console.error('[Settings] save() error:', e);
      setMsg({ ok: false, text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const set = (f, v) => {
    setCompany((p) => ({ ...p, [f]: v }));
    setMsg(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-[#060e20] text-[#99f7ff] font-['Space_Grotesk'] font-bold tracking-wider animate-pulse">Cargando...</div>;
  }

  return (
    <>
      <ServicesModal isOpen={showServicesModal} onClose={() => setShowServicesModal(false)} />

      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#1a233a] bg-[#0a1122] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1a233a] bg-[#060e20]">
              <h3 className="text-[#dee5ff] font-bold font-['Space_Grotesk']">Cerrar sesión</h3>
              <p className="text-[#a3aac4] text-sm mt-1">Vas a salir de tu cuenta actual.</p>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-[#dee5ff]">¿Querés cerrar sesión?</p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#1a233a] bg-[#10182d] text-[#a3aac4] hover:text-white hover:bg-[#15213b]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setLogoutConfirmOpen(false);
                    await logout();
                    navigate('/login');
                  }}
                  className="px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#060e20] text-[#dee5ff] font-['Inter'] p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="group flex items-center justify-center w-10 h-10 rounded-full bg-[#1a233a]/50 border border-[#40485d]/30 text-[#a3aac4] hover:text-[#99f7ff] hover:bg-[#1a233a] hover:border-[#99f7ff]/50 transition-all shadow-sm"
                title="Volver al inicio"
              >
                <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
              </button>

              <div>
                <h1 className="font-['Space_Grotesk'] text-3xl font-bold text-[#dee5ff]">Configuración</h1>
                <p className="text-[#a3aac4] text-sm mt-1">Suscripción, servicios y datos de la empresa</p>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-2 text-[#a3aac4] text-sm bg-[#1a233a]/50 px-3 py-1.5 rounded-full border border-[#40485d]/30 shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[#99f7ff] text-[16px]">person</span>
                <span className="font-medium tracking-wide">{userData?.nombre || user?.email || 'Usuario'}</span>
                <button
                  onClick={() => setLogoutConfirmOpen(true)}
                  className="ml-2 p-1.5 rounded-full hover:bg-red-500/20 text-[#a3aac4] hover:text-red-400 transition-colors"
                  title="Cerrar sesión"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <section>
                {user && <LicensingPanel userId={user.id} />}
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#99f7ff]">handyman</span>
                  <h2 className="font-['Space_Grotesk'] text-[15px] font-bold text-[#99f7ff] uppercase tracking-wider">Servicios</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-[#1a233a] to-transparent"></div>
                </div>

                <div className="glass-panel rounded-2xl border border-[#1a233a] p-5 shadow-lg space-y-4">
                  <div>
                    <div className="text-[#dee5ff] font-semibold">Servicios y atributos</div>
                    <p className="text-[#a3aac4] text-sm mt-1">Administrá nombre, precio y atributos de los servicios detectados en despiece.</p>
                  </div>
                  <button
                    onClick={() => setShowServicesModal(true)}
                    className="w-full bg-[#00e0fe] text-[#002f33] py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#99f7ff] transition-colors shadow-[0_4px_15px_rgba(0,224,254,0.2)]"
                  >
                    <span className="material-symbols-outlined text-[20px]">tune</span>
                    Configurar servicios
                  </button>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#99f7ff]">info</span>
                  <h2 className="font-['Space_Grotesk'] text-[15px] font-bold text-[#99f7ff] uppercase tracking-wider">Sistema</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-[#1a233a] to-transparent"></div>
                </div>
                <div className="glass-panel rounded-2xl border border-[#1a233a] divide-y divide-[#1a233a] overflow-hidden shadow-lg">
                  <div className="flex justify-between items-center px-5 py-3 hover:bg-[#0f1930]/40 transition-colors">
                    <div className="flex items-center gap-2 text-[#a3aac4]">
                      <span className="material-symbols-outlined text-[16px]">terminal</span>
                      <span className="text-sm font-medium">Versión</span>
                    </div>
                    <span className="text-[#dee5ff] text-sm font-mono font-bold bg-[#1a233a] px-2 py-0.5 rounded">{pkg.version}</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-3 hover:bg-[#0f1930]/40 transition-colors">
                    <div className="flex items-center gap-2 text-[#a3aac4]">
                      <span className="material-symbols-outlined text-[16px]">database</span>
                      <span className="text-sm font-medium">Base de datos</span>
                    </div>
                    <span className="text-[#00e0fe] text-sm font-bold flex items-center gap-1.5 bg-[#00e0fe]/10 px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00e0fe] animate-pulse"></span> Conectada
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-3 hover:bg-[#0f1930]/40 transition-colors">
                    <div className="flex items-center gap-2 text-[#a3aac4]">
                      <span className="material-symbols-outlined text-[16px]">code</span>
                      <span className="text-sm font-medium">Entorno</span>
                    </div>
                    <span className="text-[#dee5ff] text-sm font-mono bg-[#1a233a] px-2 py-0.5 rounded">Desarrollo</span>
                  </div>
                </div>
              </section>
            </div>

            <div className="lg:col-span-2">
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-['Space_Grotesk'] text-sm font-bold text-[#99f7ff] uppercase tracking-wider">Datos de la Empresa</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-[#40485d]/30 to-transparent"></div>
                </div>

                <div className="glass-panel relative overflow-hidden rounded-2xl border border-[#99f7ff] shadow-[0_0_20px_rgba(153,247,255,0.05)] p-6 space-y-5">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#00f1fe] opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

                  <div className="relative z-10">
                    <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#99f7ff]">storefront</span>
                      Nombre del Negocio
                    </label>
                    <input type="text" value={company.company_name} onChange={(e) => set('company_name', e.target.value)} className="w-full bg-[#060e20] border-2 border-[#1a233a] rounded-lg px-4 py-2.5 text-[#dee5ff] font-medium focus:outline-none focus:border-[#99f7ff] transition-all placeholder:text-[#40485d]" placeholder="Mi Carpintería" />
                  </div>

                  <div className="relative z-10">
                    <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#99f7ff]">image</span>
                      Logo de la Empresa
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed border-[#40485d]/50 bg-[#060e20] overflow-hidden flex items-center justify-center">
                        {previewUrl ? (
                          <img src={previewUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : company.logo_data ? (
                          <span className="material-symbols-outlined text-[#40485d] text-3xl">check_circle</span>
                        ) : (
                          <span className="material-symbols-outlined text-[#40485d] text-3xl">image</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            // Allow up to 2MB, auto-resize if larger
                            if (file && file.size <= 2000000) {
                              try {
                                // Resize to max 200x200 automatically
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const img = new Image();
                                  img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    const maxSize = 200;
                                    let w = img.width;
                                    let h = img.height;
                                    // Maintain aspect ratio
                                    if (w > h) {
                                      if (w > maxSize) { h = (h * maxSize) / w; w = maxSize; }
                                    } else {
                                      if (h > maxSize) { w = (w * maxSize) / h; h = maxSize; }
                                    }
                                    canvas.width = w;
                                    canvas.height = h;
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, 0, 0, w, h);
                                    const dataUrl = canvas.toDataURL('image/png', 0.8);
                                    setPreviewUrl(dataUrl);
                                    set('logo_data', file.name);
                                  };
                                  img.src = reader.result;
                                };
                                reader.readAsDataURL(file);
                              } catch(err) {
                                console.error('Error processing logo:', err);
                              }
                            } else {
                              alert('Imagen muy grande. Máximo 2MB');
                            }
                          }}
                          className="hidden" 
                          id="logo-upload"
                        />
                        <label htmlFor="logo-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a233a] border border-[#40485d]/30 rounded-lg text-[#a3aac4] text-sm font-medium cursor-pointer hover:border-[#99f7ff]/50 hover:text-[#99f7ff] transition-all">
                          <span className="material-symbols-outlined text-[18px]">upload</span>
                          Elegir imagen
                        </label>
                        {(previewUrl || company.logo_data) && (
                          <button 
                            onClick={() => { setPreviewUrl(null); set('logo_data', ''); }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            Eliminar
                          </button>
                        )}
                        <p className="text-[#6f7a97] text-xs">PNG, JPG. Se redimensiona automáticamente a 200px</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-5 relative z-10">
                    <div>
                      <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#99f7ff]">payments</span>
                        Moneda
                      </label>
                      <div className="relative">
                        <select value={company.currency} onChange={(e) => set('currency', e.target.value)} className="w-full bg-[#060e20] border-2 border-[#1a233a] rounded-lg px-4 py-2.5 text-[#dee5ff] font-medium focus:outline-none focus:border-[#99f7ff] transition-all appearance-none cursor-pointer">
                          <option value="USD">Dólar Estadounidense (USD)</option>
                          <option value="COP">Peso Colombiano (COP)</option>
                          <option value="ARS">Peso Argentino (ARS)</option>
                          <option value="MXN">Peso Mexicano (MXN)</option>
                          <option value="EUR">Euro (EUR)</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#a3aac4] pointer-events-none">expand_more</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#99f7ff]">account_balance</span>
                        Impuesto (%)
                      </label>
                      <div className="relative">
                        <input type="number" step="0.1" value={company.tax_rate} onChange={(e) => set('tax_rate', parseFloat(e.target.value) || 0)} className="w-full bg-[#060e20] border-2 border-[#1a233a] rounded-lg pl-4 pr-8 py-2.5 text-[#dee5ff] font-medium focus:outline-none focus:border-[#99f7ff] transition-all placeholder:text-[#40485d]" placeholder="0" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a3aac4] font-bold">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#99f7ff]">badge</span>
                        NIT
                      </label>
                      <input type="text" value={company.nit || ''} onChange={(e) => set('nit', e.target.value)} className="w-full bg-[#060e20] border-2 border-[#1a233a] rounded-lg px-4 py-2.5 text-[#dee5ff] font-medium focus:outline-none focus:border-[#99f7ff] transition-all placeholder:text-[#40485d]" placeholder="XXX.XXX.XXX-X" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5 relative z-10">
                    <div>
                      <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#99f7ff]">mail</span>
                        Email
                      </label>
                      <input type="email" value={company.contact_email} onChange={(e) => set('contact_email', e.target.value)} className="w-full bg-[#060e20] border-2 border-[#1a233a] rounded-lg px-4 py-2.5 text-[#dee5ff] font-medium focus:outline-none focus:border-[#99f7ff] transition-all placeholder:text-[#40485d]" placeholder="contacto@empresa.com" />
                    </div>
                    <div>
                      <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#99f7ff]">call</span>
                        Teléfono
                      </label>
                      <input type="tel" value={company.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} className="w-full bg-[#060e20] border-2 border-[#1a233a] rounded-lg px-4 py-2.5 text-[#dee5ff] font-medium focus:outline-none focus:border-[#99f7ff] transition-all placeholder:text-[#40485d]" placeholder="+57 300 123 4567" />
                    </div>
                  </div>

                  <div className="relative z-10">
                    <label className="block text-[#a3aac4] text-xs uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#99f7ff]">location_on</span>
                      Dirección
                    </label>
                    <textarea value={company.address} onChange={(e) => set('address', e.target.value)} rows={2} className="w-full bg-[#060e20] border-2 border-[#1a233a] rounded-lg px-4 py-2.5 text-[#dee5ff] font-medium focus:outline-none focus:border-[#99f7ff] transition-all placeholder:text-[#40485d] resize-none" placeholder="Dirección completa del taller" />
                  </div>

                  <div className="flex items-center gap-4 pt-4 mt-2 border-t border-[#1a233a] relative z-10">
                    <button onClick={save} disabled={saving} className="bg-gradient-to-r from-[#00d1ed] to-[#00f1fe] text-[#002f33] px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-[0_4px_15px_rgba(0,241,254,0.3)] hover:shadow-[0_6px_25px_rgba(0,241,254,0.4)] hover:-translate-y-0.5 transition-all active:translate-y-0 active:shadow-[0_2px_10px_rgba(0,241,254,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
                      <span className="material-symbols-outlined text-[18px]">{saving ? 'hourglass_top' : 'save'}</span>
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                    {msg && (
                      <span className={`text-sm font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-md ${msg.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        <span className="material-symbols-outlined text-[16px]">{msg.ok ? 'check_circle' : 'error'}</span>
                        {msg.text}
                      </span>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
