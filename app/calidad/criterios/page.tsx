'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/opt-sistemica/Header';
import DefectModal, { Defecto } from '@/components/calidad/DefectModal';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Maximize2, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';

interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  uuid?: string;
}

const PLANT_LABELS: Record<string, string> = {
  Ms: 'Mármol Sintético',
  Fv: 'Fibra de Vidrio',
  'R moldes': 'Revisión de Moldes',
  Qznt: 'Quarzstone',
  Mbles: 'Muebles',
  Cefi: 'Zócalos (CEFI)'
};

const PLANTS = ['Ms', 'Fv', 'R moldes', 'Qznt', 'Mbles', 'Cefi'];

export default function CriteriosCalidadPage() {
  const router = useRouter();
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [defects, setDefects] = useState<Defecto[]>([]);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [activePlant, setActivePlant] = useState('Ms');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defectToEdit, setDefectToEdit] = useState<Defecto | null>(null);

  // Expanded defect card in grid
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Image Zoom State
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 0. Check Auth session
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setAuthEmail(authUser.email || null);
      }

      // 1. Fetch Users
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, rol, uuid')
        .order('nombre', { ascending: true });

      if (userError) {
        console.warn('Could not fetch users list:', userError);
      } else if (userData) {
        setUsers(userData);
        if (authUser?.email) {
          const matchedUser = userData.find(u => u.correo?.toLowerCase() === authUser.email?.toLowerCase());
          if (matchedUser) {
            setCurrentUser(matchedUser);
          } else {
            const defaultUser = userData.find(u => u.correo === 'coordinacioncalidad@firplak.com') || userData[0];
            setCurrentUser(defaultUser || null);
          }
        } else if (userData.length > 0) {
          const defaultUser = userData.find(u => u.correo === 'coordinacioncalidad@firplak.com') || userData[0];
          setCurrentUser(defaultUser);
        }
      }

      // 2. Fetch Quality Criteria from criterios_calidad_plantas
      const { data: criteriaData, error: criteriaError } = await supabase
        .from('criterios_calidad_plantas')
        .select('*')
        .order('id', { ascending: true });

      if (criteriaError) throw criteriaError;
      setDefects(criteriaData || []);

    } catch (error: any) {
      console.error('Error fetching criteria:', error);
      showToast('Error al conectar con la base de datos de criterios', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = Number(e.target.value);
    const user = users.find(u => u.id === userId) || null;
    setCurrentUser(user);
    if (user) {
      showToast(`Terminal activa: ${user.nombre} (${user.rol.toUpperCase()})`);
    }
  };

  // Admin access names
  const ADMIN_NAMES = [
    'jair alvarez',
    'maria isabel escobar',
    'carolina escobar',
    'hector',
    'calidad',
    'admin'
  ];

  const isAdmin = () => {
    if (!currentUser) return false;
    const normalizedName = (currentUser.nombre || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const normalizedEmail = (currentUser.correo || '').toLowerCase();
    const normalizedRole = (currentUser.rol || '').toLowerCase();

    return (
      ADMIN_NAMES.some(admin => normalizedName.includes(admin) || normalizedEmail.includes(admin)) ||
      normalizedRole.includes('admin') ||
      normalizedRole.includes('calidad')
    );
  };

  const handleSaveDefect = async (savedDefect: Defecto) => {
    try {
      if (savedDefect.id) {
        // Update
        const { error } = await supabase
          .from('criterios_calidad_plantas')
          .update({
            codigo: savedDefect.codigo,
            defecto: savedDefect.defecto,
            foto: savedDefect.foto,
            responsable: savedDefect.responsable,
            detectarlo: savedDefect.detectarlo,
            evitarlo: savedDefect.evitarlo,
            rojo: savedDefect.rojo,
            naranja: savedDefect.naranja,
            amarillo: savedDefect.amarillo,
            verde: savedDefect.verde
          })
          .eq('id', savedDefect.id);

        if (error) throw error;
        
        setDefects(prev => prev.map(d => d.id === savedDefect.id ? savedDefect : d));
        showToast('Criterio de calidad actualizado correctamente');
      } else {
        // Create
        const { data, error } = await supabase
          .from('criterios_calidad_plantas')
          .insert({
            planta: savedDefect.planta,
            codigo: savedDefect.codigo,
            defecto: savedDefect.defecto,
            foto: savedDefect.foto,
            responsable: savedDefect.responsable,
            detectarlo: savedDefect.detectarlo,
            evitarlo: savedDefect.evitarlo,
            rojo: savedDefect.rojo,
            naranja: savedDefect.naranja,
            amarillo: savedDefect.amarillo,
            verde: savedDefect.verde
          })
          .select();

        if (error) throw error;
        
        if (data && data[0]) {
          setDefects(prev => [...prev, data[0]]);
        } else {
          await fetchData();
        }
        showToast('Nuevo criterio de calidad creado correctamente');
      }
    } catch (error) {
      console.error('Error saving defect:', error);
      showToast('Error al guardar el criterio de calidad', 'error');
      throw error;
    }
  };

  const handleDeleteDefect = async (id: number) => {
    if (!isAdmin()) {
      showToast('Acceso denegado: solo personal de Calidad / Administrador puede eliminar.', 'error');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar este criterio de calidad? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('criterios_calidad_plantas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDefects(prev => prev.filter(d => d.id !== id));
      if (expandedId === id) setExpandedId(null);
      showToast('Criterio de calidad eliminado con éxito');
    } catch (error) {
      console.error('Error deleting defect:', error);
      showToast('Error al eliminar el criterio', 'error');
    }
  };

  const handleEditClick = (defect: Defecto) => {
    setDefectToEdit(defect);
    setIsModalOpen(true);
  };

  const handleCreateClick = () => {
    setDefectToEdit(null);
    setIsModalOpen(true);
  };

  // Clean defect name to remove duplicate numbering prefix
  const cleanDefectName = (name: string) => {
    if (!name) return '';
    return name.replace(/^\d+[\.\-\s]+/, '').trim();
  };

  // Filter criteria for active plant and single unified search query
  const filteredDefects = defects.filter(d => {
    if (d.planta !== activePlant) return false;
    
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();

    const matchesDefect = d.defecto?.toLowerCase().includes(term);
    const matchesCodigo = d.codigo?.toString().toLowerCase().includes(term);
    const matchesResponsable = d.responsable?.toLowerCase().includes(term);
    const matchesDetectarlo = d.detectarlo?.toLowerCase().includes(term);

    return matchesDefect || matchesCodigo || matchesResponsable || matchesDetectarlo;
  });

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold animate-in slide-in-from-bottom-5 duration-300 ${
          toast.type === 'success' 
            ? 'bg-emerald-900 text-white border-emerald-600' 
            : 'bg-red-900 text-white border-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertTriangle size={18} className="text-red-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        title="Criterios de Calidad"
        subtitle="Aceptación y Rechazo por Plantas"
        backUrl="/calidad"
        userEmail={authEmail || currentUser?.correo}
        showLogout={true}
        onLogout={handleLogout}
      />

      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Bar: Description & Terminal Selector */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e2ded5] shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#324354] uppercase tracking-wide">
                Especificaciones Técnicas de Aceptación y Rechazo
              </h2>
              <span className="bg-[#324354]/10 text-[#324354] text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                AYR
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consulta y estandarización visual de defectos, zonas de aceptación y directrices de control de calidad.
            </p>
          </div>

          {/* User selector / Terminal Activa */}
          <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Terminal Activa
              </span>
              <select
                className="text-xs font-bold text-[#324354] bg-transparent outline-none cursor-pointer pr-2"
                value={currentUser?.id || ''}
                onChange={handleUserChange}
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>
            {currentUser && (
              <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${
                isAdmin() 
                  ? 'bg-red-50 text-red-700 border-red-200' 
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {isAdmin() ? '🔓 Admin' : '🔒 Lectura'}
              </span>
            )}
          </div>
        </div>

        {/* Plant Selector Grid (6 Plants) */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PLANTS.map(plant => {
            const count = defects.filter(d => d.planta === plant).length;
            const isActive = activePlant === plant;
            return (
              <button
                key={plant}
                onClick={() => {
                  setActivePlant(plant);
                  setSearchTerm('');
                  setExpandedId(null);
                }}
                className={`relative p-3.5 rounded-2xl border text-center transition-all duration-200 cursor-pointer overflow-hidden flex flex-col items-center justify-between min-h-[95px] ${
                  isActive
                    ? 'bg-white border-[#324354] shadow-md ring-2 ring-[#324354]/15 -translate-y-0.5'
                    : 'bg-white/80 hover:bg-white border-[#e2ded5] hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1.5 transition-all ${
                  isActive ? 'bg-[#324354]' : 'bg-transparent'
                }`} />

                <span className="text-xl font-black text-[#324354] mt-1">
                  {plant}
                </span>
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-tight line-clamp-1">
                  {PLANT_LABELS[plant]}
                </span>
                <span className="text-[10px] font-black text-[#324354] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md mt-1">
                  {count} items
                </span>
              </button>
            );
          })}
        </section>

        {/* Search & Actions Bar */}
        <section className="bg-white rounded-2xl p-4 border border-[#e2ded5] shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por defecto, código o responsable..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-[#324354] placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#324354] focus:outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {isAdmin() && (
            <button
              onClick={handleCreateClick}
              className="flex items-center gap-1.5 bg-[#324354] hover:bg-[#25323f] active:scale-95 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus size={16} />
              <span>Nuevo Defecto</span>
            </button>
          )}
        </section>

        {/* Main Content: 5 Columns Defect Cards Grid */}
        <main>
          {isLoading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-[#e2ded5] space-y-3">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-[#324354] rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-600">Cargando criterios de calidad...</p>
            </div>
          ) : filteredDefects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {filteredDefects.map((defect) => {
                const isOpen = expandedId === defect.id;
                const formattedName = cleanDefectName(defect.defecto);

                return (
                  <React.Fragment key={defect.id}>
                    {/* Grid Card Unit */}
                    <div
                      onClick={() => setExpandedId(isOpen ? null : (defect.id ?? null))}
                      className={`bg-white rounded-2xl p-4 border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 min-h-[115px] relative group ${
                        isOpen
                          ? 'border-[#324354] ring-2 ring-[#324354]/20 shadow-md bg-amber-50/20'
                          : 'border-[#e2ded5] hover:border-[#324354]/60 hover:shadow-md hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-[#324354] bg-[#324354]/10 px-2 py-0.5 rounded-md border border-[#324354]/15">
                          {defect.codigo ? `CÓD. ${defect.codigo}` : 'S/C'}
                        </span>
                        <span className="text-xs font-black text-slate-400 group-hover:text-[#324354] transition">
                          {isOpen ? '▲' : '▼'}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-[#324354] line-clamp-2 leading-snug">
                        {formattedName}
                      </h4>

                      {defect.responsable && (
                        <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate">
                          {defect.responsable}
                        </div>
                      )}
                    </div>

                    {/* Detail Panel spanning full width of the grid row */}
                    {isOpen && (
                      <div className="col-span-full bg-white rounded-3xl p-6 border-2 border-[#324354] shadow-xl animate-in fade-in duration-200 my-2">
                        {/* Header of Detail */}
                        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
                          <div>
                            <span className="text-xs font-black text-[#324354] bg-[#324354]/10 px-2.5 py-1 rounded-md uppercase tracking-wider">
                              CÓDIGO {defect.codigo || 'N/D'} • PLANTA {activePlant}
                            </span>
                            <h3 className="text-xl sm:text-2xl font-black text-[#324354] mt-2">
                              {formattedName}
                            </h3>
                          </div>
                          <button
                            onClick={() => setExpandedId(null)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#324354] text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                          >
                            <X size={14} />
                            <span>Cerrar Detalle</span>
                          </button>
                        </div>

                        {/* Detail Content (Image + Technical info) */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5 items-start">
                          {/* Image Box */}
                          <div className="lg:col-span-4 space-y-2">
                            <div
                              onClick={() => defect.foto && setZoomedImage(defect.foto)}
                              className={`w-full h-56 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center relative ${
                                defect.foto ? 'cursor-zoom-in bg-slate-900 group' : 'bg-slate-50'
                              }`}
                            >
                              {defect.foto ? (
                                <>
                                  <img
                                    src={defect.foto}
                                    alt={`Defecto ${formattedName}`}
                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                                    <Maximize2 size={12} />
                                    <span>Ampliar</span>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center p-4 text-slate-400 space-y-1">
                                  <span className="text-3xl block">🖼</span>
                                  <span className="text-xs font-bold">Sin imagen ilustrativa adjunta</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Technical info and Zones */}
                          <div className="lg:col-span-8 space-y-5">
                            {/* Responsable and Diagnosis */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                  Responsable de la Causa
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-[#324354]">
                                  {defect.responsable || 'No especificado'}
                                </span>
                              </div>

                              {defect.detectarlo && (
                                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                    ¿Cómo Detectarlo?
                                  </span>
                                  <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                                    {defect.detectarlo}
                                  </p>
                                </div>
                              )}
                            </div>

                            {defect.evitarlo && (
                              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                  ¿Cómo Evitarlo / Acción Correctiva?
                                </span>
                                <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                                  {defect.evitarlo}
                                </p>
                              </div>
                            )}

                            {/* Zones of Acceptance Grid */}
                            <div className="space-y-2">
                              <span className="text-xs font-black text-[#324354] uppercase tracking-wider block">
                                Criterios de Aceptación por Zonas
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="p-3 bg-red-50/70 border-l-4 border-red-500 rounded-xl space-y-0.5">
                                  <span className="text-[10px] font-black text-red-700 uppercase">Zona Roja</span>
                                  <p className="text-xs font-bold text-red-950">{defect.rojo || 'N/A'}</p>
                                </div>

                                {activePlant !== 'Cefi' && (
                                  <>
                                    <div className="p-3 bg-amber-50/70 border-l-4 border-amber-500 rounded-xl space-y-0.5">
                                      <span className="text-[10px] font-black text-amber-700 uppercase">Zona Naranja</span>
                                      <p className="text-xs font-bold text-amber-950">{defect.naranja || 'N/A'}</p>
                                    </div>

                                    <div className="p-3 bg-yellow-50/70 border-l-4 border-yellow-500 rounded-xl space-y-0.5">
                                      <span className="text-[10px] font-black text-yellow-700 uppercase">Zona Amarilla</span>
                                      <p className="text-xs font-bold text-yellow-950">{defect.amarillo || 'N/A'}</p>
                                    </div>
                                  </>
                                )}

                                <div className="p-3 bg-emerald-50/70 border-l-4 border-emerald-500 rounded-xl space-y-0.5">
                                  <span className="text-[10px] font-black text-emerald-700 uppercase">Zona Verde</span>
                                  <p className="text-xs font-bold text-emerald-950">{defect.verde || 'N/A'}</p>
                                </div>
                              </div>
                            </div>

                            {/* Admin Action Buttons */}
                            {isAdmin() && (
                              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                  onClick={() => handleEditClick(defect)}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#324354] rounded-xl text-xs font-bold transition cursor-pointer"
                                >
                                  <Edit3 size={14} />
                                  <span>Editar Criterio</span>
                                </button>
                                <button
                                  onClick={() => defect.id && handleDeleteDefect(defect.id)}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                  <span>Eliminar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#e2ded5] shadow-xs space-y-3">
              <span className="text-4xl block">🔍</span>
              <h3 className="text-base font-bold text-[#324354]">No se encontraron criterios de calidad</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No hay defectos registrados con el término &quot;{searchTerm}&quot; en la planta {PLANT_LABELS[activePlant]}.
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#324354] rounded-xl transition cursor-pointer"
                >
                  Limpiar Búsqueda
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal for Create/Edit */}
      <DefectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveDefect}
        defectToEdit={defectToEdit}
        currentPlant={activePlant}
      />

      {/* High-res Image Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Imagen ampliada"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
