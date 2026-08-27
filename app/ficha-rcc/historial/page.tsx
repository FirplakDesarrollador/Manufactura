'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/ficha-rcc/supabaseClient';
import { FichaAlerta, PlantaEnum, getEstadoFicha, EstadoFicha } from '@/types';
import Header from '@/components/opt-sistemica/Header';
import SubHeader from '@/components/ficha-rcc/SubHeader';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Edit2, 
  Eye, 
  CheckCircle2, 
  Clock, 
  FileText, 
  AlertTriangle,
  X
} from 'lucide-react';
import { resolveNombreCompleto } from '@/lib/ficha-rcc/constants';
import { checkCanEditFicha } from '@/lib/ficha-rcc/auth';

const ADMIN_EMAILS = [
  'coordinacioncalidad@firplak.com', 
  'estiven.londono@firplak.com'
];

type SortKey = 'numero_ficha' | 'fecha' | 'planta' | 'problema' | 'responsable' | 'estado';

export default function FichaRccHistorialPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fichas, setFichas] = useState<FichaAlerta[]>([]);
  const [filtroPlanta, setFiltroPlanta] = useState<PlantaEnum | 'Todas'>('Todas');
  const [filtroEstado, setFiltroEstado] = useState<EstadoFicha | 'Todos'>('Todos');
  const [busqueda, setBusqueda] = useState('');

  // Ordenamiento de columnas
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({
    key: 'numero_ficha',
    direction: 'desc'
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        const userEmail = session.user.email?.toLowerCase() || '';
        setIsAdmin(ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail));
        
        try {
          const { data: uData } = await supabase
            .from('usuarios')
            .select('nombre, correo, rol, permisos')
            .eq('correo', userEmail)
            .single();
          
          if (uData) {
            setCurrentUserData(uData);
            if (uData.nombre) setCurrentUserName(uData.nombre);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }

        fetchFichas();
      }
    };

    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchFichas = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('fichas_alerta')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (filtroPlanta !== 'Todas') {
        query = query.eq('planta', filtroPlanta);
      }

      const { data, error } = await query;
      
      if (error && error.code !== '42P01') {
         throw error;
      }
      setFichas(data || []);
    } catch (err: any) {
      console.error('Error fetching fichas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFichas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroPlanta]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const canEditFicha = (ficha: FichaAlerta) => {
    return checkCanEditFicha(ficha, user, currentUserData);
  };

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown size={13} className="opacity-40 ml-1 inline-block align-middle" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={13} className="ml-1 text-white inline-block align-middle" /> 
      : <ArrowDown size={13} className="ml-1 text-white inline-block align-middle" />;
  };

  // Buscador múltiple mejorado: busca por #, fecha, planta, problema, responsable, estado, origen y seguimiento
  const filteredAndSortedFichas = useMemo(() => {
    const rawSearch = busqueda.toLowerCase().trim();
    const tokens = rawSearch.split(/\s+/).filter(Boolean);

    let result = fichas.filter(ficha => {
      const estado = getEstadoFicha(ficha);
      const cumplePlanta = filtroPlanta === 'Todas' || ficha.planta === filtroPlanta;
      const cumpleEstado = filtroEstado === 'Todos' || estado === filtroEstado;
      
      if (!cumplePlanta || !cumpleEstado) return false;
      if (tokens.length === 0) return true;

      const contTotal = ficha.contingencias?.filter(c => c.accion && c.accion.trim() !== '').length || 0;
      const contOk = ficha.contingencias?.filter(c => c.cumplimiento === 'OK').length || 0;
      const erradTotal = ficha.erradicaciones?.filter(e => e.accion && e.accion.trim() !== '').length || 0;
      const erradOk = ficha.erradicaciones?.filter(e => e.cumplimiento === 'OK').length || 0;

      // Formatear fechas posibles (yyyy-mm-dd, dd/mm/yyyy)
      const fechaOriginal = ficha.fecha || '';
      let fechaAlterna = '';
      if (fechaOriginal.includes('-')) {
        const [y, m, d] = fechaOriginal.split('-');
        fechaAlterna = `${d}/${m}/${y}`;
      } else if (fechaOriginal.includes('/')) {
        const [d, m, y] = fechaOriginal.split('/');
        fechaAlterna = `${y}-${m}-${d}`;
      }

      // Texto unificado de todas las columnas de la tabla
      const fullRowText = [
        ficha.numero_ficha ? `#${ficha.numero_ficha} ${ficha.numero_ficha}` : '',
        fechaOriginal,
        fechaAlterna,
        ficha.planta || '',
        ficha.problema || '',
        ficha.origen || '',
        ficha.responsable || '',
        resolveNombreCompleto(ficha.responsable),
        estado,
        ficha.seguimiento_entrada ? `entrada ${ficha.seguimiento_entrada}` : '',
        ficha.seguimiento_d1 ? `d1 ${ficha.seguimiento_d1}` : '',
        ficha.seguimiento_d2 ? `d2 ${ficha.seguimiento_d2}` : '',
        ficha.seguimiento_d3 ? `d3 ${ficha.seguimiento_d3}` : '',
        `cont ${contOk}/${contTotal}`,
        `errad ${erradOk}/${erradTotal}`,
        ficha.comentario_cierre || '',
        ficha.cerrado_por || ''
      ].join(' ').toLowerCase();

      return tokens.every(token => fullRowText.includes(token));
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortConfig.key === 'numero_ficha') {
          valA = Number(a.numero_ficha) || 0;
          valB = Number(b.numero_ficha) || 0;
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        } else if (sortConfig.key === 'fecha') {
          valA = new Date(a.fecha || 0).getTime();
          valB = new Date(b.fecha || 0).getTime();
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        } else if (sortConfig.key === 'planta') {
          valA = (a.planta || '').toLowerCase();
          valB = (b.planta || '').toLowerCase();
        } else if (sortConfig.key === 'problema') {
          valA = (a.problema || '').toLowerCase();
          valB = (b.problema || '').toLowerCase();
        } else if (sortConfig.key === 'responsable') {
          valA = resolveNombreCompleto(a.responsable).toLowerCase();
          valB = resolveNombreCompleto(b.responsable).toLowerCase();
        } else if (sortConfig.key === 'estado') {
          valA = getEstadoFicha(a).toLowerCase();
          valB = getEstadoFicha(b).toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [fichas, busqueda, filtroPlanta, filtroEstado, sortConfig]);

  if (loading && !user) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#F6F3EE]">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex flex-col items-center font-sans text-[#000000] w-full">
      <Header
        title="Respuesta Rápida Calidad"
        subtitle="RRC"
        userEmail={user?.email}
        showLogout={true}
        onLogout={handleLogout}
      />
      <SubHeader />

      <main className="flex-1 w-full max-w-[1500px] p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Cabecera, Filtros y Gran Buscador Amplio */}
        <div className="mb-6 flex flex-col gap-4 mt-4">
          
          {/* Fila 1: Título y Selectores de Estado / Planta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#254153] m-0">Historial de Fichas</h2>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Filtro Estado */}
              <select 
                className="input-field !mb-0 h-11 text-xs sm:text-sm font-semibold border-slate-300 rounded-xl shadow-xs bg-white px-4 flex-1 sm:flex-none sm:min-w-[180px]"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as any)}
              >
                <option value="Todos">Todos los Estados</option>
                <option value="Abierto">Abierto</option>
                <option value="En Seguimiento">En Seguimiento</option>
                <option value="Pendiente de Cierre">Pendiente de Cierre</option>
                <option value="Cerrado">Cerrado</option>
              </select>

              {/* Filtro Planta */}
              <select 
                className="input-field !mb-0 h-11 text-xs sm:text-sm font-semibold border-slate-300 rounded-xl shadow-xs bg-white px-4 flex-1 sm:flex-none sm:min-w-[190px]"
                value={filtroPlanta}
                onChange={(e) => setFiltroPlanta(e.target.value as any)}
              >
                <option value="Todas">Todas las Plantas</option>
                <option value="Mármol Sintético">Mármol Sintético</option>
                <option value="Fibra de vidrio">Fibra de vidrio</option>
                <option value="Muebles">Muebles</option>
                <option value="Cefi">Cefi</option>
              </select>
            </div>
          </div>

          {/* Fila 2: Gran Barra de Búsqueda Multipropósito */}
          <div className="w-full relative">
            <div className="relative flex items-center">
              <Search className="absolute left-4 text-slate-400 pointer-events-none" size={22} />
              <input
                type="text"
                placeholder="Buscar por #, Fecha, Planta, Problema, Responsable, Estado..."
                className="w-full h-13 pl-12 pr-44 shadow-sm rounded-xl border border-slate-300 bg-white text-base font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#254153]/30 focus:border-[#254153] transition-all"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button 
                  onClick={() => setBusqueda('')}
                  className="absolute right-36 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
              <div className="absolute right-3 flex items-center pointer-events-none">
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-wider">
                  {filteredAndSortedFichas.length} REGISTROS ENCONTRADOS
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Tabla Oficial (Idéntica al estilo de Hora a Hora) */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead className="bg-[#254153]">
                <tr className="border-none select-none text-white text-xs font-bold uppercase tracking-wider">
                  <th 
                    className="py-3.5 px-4 cursor-pointer hover:bg-[#1a2e3b] transition-colors w-16"
                    onClick={() => requestSort('numero_ficha')}
                  >
                    # <SortIcon columnKey="numero_ficha" />
                  </th>
                  <th 
                    className="py-3.5 px-4 cursor-pointer hover:bg-[#1a2e3b] transition-colors w-32"
                    onClick={() => requestSort('fecha')}
                  >
                    Fecha <SortIcon columnKey="fecha" />
                  </th>
                  <th 
                    className="py-3.5 px-4 cursor-pointer hover:bg-[#1a2e3b] transition-colors w-40"
                    onClick={() => requestSort('planta')}
                  >
                    Planta <SortIcon columnKey="planta" />
                  </th>
                  <th 
                    className="py-3.5 px-4 cursor-pointer hover:bg-[#1a2e3b] transition-colors"
                    onClick={() => requestSort('problema')}
                  >
                    Problema (Defecto) <SortIcon columnKey="problema" />
                  </th>
                  <th 
                    className="py-3.5 px-4 cursor-pointer hover:bg-[#1a2e3b] transition-colors"
                    onClick={() => requestSort('responsable')}
                  >
                    Responsable <SortIcon columnKey="responsable" />
                  </th>
                  <th 
                    className="py-3.5 px-4 cursor-pointer hover:bg-[#1a2e3b] transition-colors w-44"
                    onClick={() => requestSort('estado')}
                  >
                    Estado <SortIcon columnKey="estado" />
                  </th>
                  <th className="py-3.5 px-4 w-28 text-center">Fotos</th>
                  <th className="py-3.5 px-4 w-36">KPIs</th>
                  <th className="py-3.5 px-4 text-center w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAndSortedFichas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="h-48 text-center text-slate-400 font-medium">
                      No se encontraron fichas de alerta registradas con ese criterio de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedFichas.map(ficha => {
                    const canEdit = canEditFicha(ficha);
                    const estado = getEstadoFicha(ficha);

                    const contTotal = ficha.contingencias?.filter(c => c.accion && c.accion.trim() !== '').length || 0;
                    const contOk = ficha.contingencias?.filter(c => c.cumplimiento === 'OK').length || 0;
                    const erradTotal = ficha.erradicaciones?.filter(e => e.accion && e.accion.trim() !== '').length || 0;
                    const erradOk = ficha.erradicaciones?.filter(e => e.cumplimiento === 'OK').length || 0;

                    return (
                      <tr 
                        key={ficha.id}
                        onClick={() => router.push(`/ficha-rcc/fichas/${ficha.id}`)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        {/* Consecutivo # */}
                        <td className="py-3.5 px-4 font-black text-[#254153]">
                          #{ficha.numero_ficha || '—'}
                        </td>

                        {/* Fecha */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                          {ficha.fecha}
                        </td>

                        {/* Planta */}
                        <td className="py-3.5 px-4">
                          <span className="bg-slate-100 text-[#254153] font-bold text-xs px-2.5 py-1 rounded-md border border-slate-200 whitespace-nowrap">
                            {ficha.planta}
                          </span>
                        </td>

                        {/* Problema */}
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {ficha.problema}
                        </td>

                        {/* Responsable */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {resolveNombreCompleto(ficha.responsable)}
                        </td>

                        {/* Estado (Badges 4 Estados) */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-sm ${
                            estado === 'Cerrado'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : estado === 'Pendiente de Cierre'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : estado === 'En Seguimiento'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              estado === 'Cerrado' ? 'bg-emerald-600' : estado === 'Pendiente de Cierre' ? 'bg-blue-600' : estado === 'En Seguimiento' ? 'bg-amber-600' : 'bg-gray-500'
                            }`} />
                            {estado}
                          </span>
                        </td>

                        {/* Fotos */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {ficha.foto_piezas_ok ? (
                              <a href={ficha.foto_piezas_ok} target="_blank" rel="noreferrer" title="Ver Foto OK" className="w-8 h-8 rounded-lg overflow-hidden border border-emerald-400 block hover:scale-105 transition-transform shadow-xs">
                                <img src={ficha.foto_piezas_ok} alt="OK" className="w-full h-full object-cover" />
                              </a>
                            ) : (
                              <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-bold">N/A</span>
                            )}
                            {ficha.foto_piezas_nok ? (
                              <a href={ficha.foto_piezas_nok} target="_blank" rel="noreferrer" title="Ver Foto NO OK" className="w-8 h-8 rounded-lg overflow-hidden border border-rose-400 block hover:scale-105 transition-transform shadow-xs">
                                <img src={ficha.foto_piezas_nok} alt="NO OK" className="w-full h-full object-cover" />
                              </a>
                            ) : (
                              <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-bold">N/A</span>
                            )}
                          </div>
                        </td>

                        {/* KPIs */}
                        <td className="py-3.5 px-4 text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-400 w-10 inline-block">Cont:</span>
                              {contTotal > 0 ? (
                                <span className={`font-mono font-bold ${contOk === contTotal ? 'text-emerald-600' : contOk > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                                  {contOk}/{contTotal} {contOk === contTotal ? '✓' : ''}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium">—</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-400 w-10 inline-block">Errad:</span>
                              {erradTotal > 0 ? (
                                <span className={`font-mono font-bold ${erradOk === erradTotal ? 'text-emerald-600' : erradOk > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                                  {erradOk}/{erradTotal} {erradOk === erradTotal ? '✓' : ''}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium">—</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center items-center">
                            {canEdit ? (
                              <button
                                onClick={() => router.push(`/ficha-rcc/fichas/${ficha.id}`)}
                                title="Editar Ficha Completa"
                                className="w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition-colors border border-blue-200 shadow-xs"
                              >
                                <Edit2 size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => router.push(`/ficha-rcc/fichas/${ficha.id}`)}
                                title="Consultar Ficha"
                                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors border border-slate-200 shadow-xs"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
