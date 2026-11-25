'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/opt-sistemica/Header'
import { 
    Boxes, 
    Search, 
    CheckCircle2, 
    AlertTriangle, 
    Clock, 
    Calendar, 
    Filter, 
    Download, 
    RefreshCw, 
    Check, 
    X,
    Database,
    ChevronDown,
    ChevronUp,
    SlidersHorizontal,
    ArrowRight,
    Loader2
} from 'lucide-react'
import { toast } from 'sonner'

export interface ConteoItem {
    id: string
    sku: string
    descripcion: string
    almacen: string
    planta: string
    categoria: 'A' | 'B' | 'C'
    stockTeorico: number
    conteoFisico: number | null
    costoUnitario?: number
    precio?: number
    valorTotal?: number
    comprometido?: number
    pedido?: number
    disponible?: number
    unidad: string
    fechaConteo: string | null
    responsable: string | null
    estado: 'Pendiente' | 'Exacto' | 'Discrepancia'
    observacion?: string
}

const formatoCOP = (val?: number) => {
    if (val == null || isNaN(val)) return '$ 0'
    return `$ ${Math.round(val).toLocaleString('es-CO')}`
}

const ALMACENES_DISPONIBLES = [
    { codigo: 'MP-01', nombre: 'Materias Primas', localidad: 'Principal' },
    { codigo: 'MP-02', nombre: 'Importaciones - Mercancía', localidad: 'Principal' },
    { codigo: 'MP-03', nombre: 'Planta Fibra de Vidrio', localidad: 'Planta FV' },
    { codigo: 'MP-04', nombre: 'Producción Muebles', localidad: 'Planta MBL' },
    { codigo: 'MP-05', nombre: 'Planta RTM', localidad: 'Planta FV' },
    { codigo: 'MP-06', nombre: 'Moldes', localidad: 'Planta MS' },
    { codigo: 'MP-07', nombre: 'Servicios', localidad: 'Planta MBL' },
    { codigo: 'MP-08', nombre: 'Devoluciones de Materia Prima', localidad: 'Principal' },
    { codigo: 'MP-09', nombre: 'I+D+I', localidad: 'Investigación' },
    { codigo: 'MP-10', nombre: 'Planta Mármol Sintético', localidad: 'Planta MS' },
    { codigo: 'MP-11', nombre: 'Materias Primas CEFI', localidad: 'Planta CEFI' },
    { codigo: 'MP-12', nombre: 'Producción Muebles CEFI', localidad: 'Planta CEFI' },
    { codigo: 'PT-01', nombre: 'Producto Terminado Decorado', localidad: 'Logística' },
    { codigo: 'PT-02', nombre: 'Producto Terminado', localidad: 'Logística' },
    { codigo: 'PT-03', nombre: 'Devoluciones en sitio', localidad: 'Logística' },
    { codigo: 'PT-06', nombre: 'Saldos', localidad: 'Logística' },
    { codigo: 'PT-10', nombre: 'Sala Disponible FPK Medellín', localidad: 'Comercial' },
    { codigo: 'PT-11', nombre: 'Sala Disponible FPK Bogotá', localidad: 'Comercial' },
    { codigo: 'REP-01', nombre: 'Repuestos y Mantenimiento', localidad: 'Mtto' },
]

const GRUPOS_ARTICULOS = [
    { id: 'TODOS', nombre: 'Todos' },
    { id: '100', nombre: 'Materias Primas' },
    { id: '101', nombre: 'Material de Empaque' },
    { id: '102', nombre: 'Repuestos y Mantenimiento' },
    { id: '103', nombre: 'Producto Semielaborado' },
    { id: '104', nombre: 'Producto Terminado' },
    { id: '105', nombre: 'Insumos Generales' }
]

// Página de Inventarios Cíclicos con integración SAP Service Layer


export default function InventariosCiclicosPage() {
    const router = useRouter()
    const [userEmail, setUserEmail] = useState<string>('')
    const [loading, setLoading] = useState(true)

    // Datos y filtros generales (inicia vacío hasta que se ejecute la consulta real en SAP Service Layer)
    const [items, setItems] = useState<ConteoItem[]>([])
    const [busqueda, setBusqueda] = useState('')
    const [filtroAlmacen, setFiltroAlmacen] = useState('TODOS')
    const [filtroPlanta, setFiltroPlanta] = useState('TODAS')
    const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'Pendiente' | 'Exacto' | 'Discrepancia'>('TODOS')
    const [pestañaActiva, setPestañaActiva] = useState<'conteo' | 'historial' | 'programacion'>('conteo')

    // Modal de registro rápido de conteo
    const [modalConteo, setModalConteo] = useState<ConteoItem | null>(null)
    const [conteoInput, setConteoInput] = useState<number | ''>('')
    const [observacionInput, setObservacionInput] = useState('')

    // ====== FORMULARIO SAP: Criterios de Selección ======
    const [mostrarModalSAP, setMostrarModalSAP] = useState(false)
    const [consultandoSAP, setConsultandoSAP] = useState(false)
    const [sapFechaDesde, setSapFechaDesde] = useState('2026-03-03')
    const [sapFechaHasta, setSapFechaHasta] = useState('2026-11-25')
    const [sapCodigoDesde, setSapCodigoDesde] = useState('')
    const [sapCodigoHasta, setSapCodigoHasta] = useState('')
    const [sapGrupoArticulos, setSapGrupoArticulos] = useState('TODOS')
    const [sapCuentasMayor, setSapCuentasMayor] = useState(false)
    const [sapAlmacenesSeleccionados, setSapAlmacenesSeleccionados] = useState<string[]>([
        'MP-06', 'MP-07', 'MP-08', 'MP-09', 'MP-10', 'MP-11'
    ])
    const [sapVisualizar, setSapVisualizar] = useState<'articulos' | 'cuentas'>('articulos')
    const [sapGrupoPorAlmacen, setSapGrupoPorAlmacen] = useState(true)
    const [sapVisualizarSinTransacciones, setSapVisualizarSinTransacciones] = useState(false)
    const [sapOcultarStockCero, setSapOcultarStockCero] = useState(true)
    const [sapOcultarSerieLote, setSapOcultarSerieLote] = useState(false)
    const [origenDatosSAP, setOrigenDatosSAP] = useState(false)

    // Verificar sesión y permisos
    useEffect(() => {
        async function checkAuth() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUserEmail(user.email || '')

            const emailLower = (user.email || '').toLowerCase()
            if (emailLower === 'analista2.desarrollo@firplak.com') {
                setLoading(false)
                return
            }

            const { data: profile } = await supabase
                .from('usuarios')
                .select('rol, permisos')
                .or(`uuid.eq.${user.id},correo.ilike.${user.email}`)
                .maybeSingle()

            const hasPermission = profile?.permisos?.inventarios_ciclicos === true || 
                                  profile?.rol === 'desarrollador'

            if (!hasPermission) {
                toast.error('No tienes permisos para acceder al módulo de Inventarios Cíclicos.')
                router.push('/home')
                return
            }

            setLoading(false)
        }
        checkAuth()
    }, [router])

    // Toggle de almacén en formulario SAP
    const toggleAlmacenSAP = (codigo: string) => {
        setSapAlmacenesSeleccionados(prev => 
            prev.includes(codigo) 
                ? prev.filter(c => c !== codigo)
                : [...prev, codigo]
        )
    }

    const seleccionarTodosAlmacenes = (todos: boolean) => {
        if (todos) {
            setSapAlmacenesSeleccionados(ALMACENES_DISPONIBLES.map(a => a.codigo))
        } else {
            setSapAlmacenesSeleccionados([])
        }
    }

    // Consulta hacia la API SAP Service Layer
    const ejecutarConsultaSAP = async () => {
        setConsultandoSAP(true)
        try {
            const response = await fetch('/api/sap/auditoria-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    codigoDesde: sapCodigoDesde.trim() || undefined,
                    codigoHasta: sapCodigoHasta.trim() || undefined,
                    grupoArticulos: sapGrupoArticulos,
                    almacenes: sapAlmacenesSeleccionados,
                    ocultarStockCero: sapOcultarStockCero,
                    maxResults: 150
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error al consultar SAP Service Layer')
            }

            if (data.items && data.items.length > 0) {
                setItems(data.items)
                setOrigenDatosSAP(true)
                setMostrarModalSAP(false)
                toast.success(`SAP Service Layer: Se cargaron ${data.items.length} artículos según los criterios seleccionados.`)
            } else {
                toast.warning('SAP Service Layer no retornó artículos con los filtros aplicados (verifique stock o rango de códigos).')
            }
        } catch (error: any) {
            console.error('Error al ejecutar auditoría SAP:', error)
            toast.error(error.message || 'Error de conexión con SAP Service Layer')
        } finally {
            setConsultandoSAP(false)
        }
    }

    // Filtrar items
    const itemsFiltrados = useMemo(() => {
        return items.filter(item => {
            const matchBusqueda = 
                item.sku.toLowerCase().includes(busqueda.toLowerCase()) ||
                item.descripcion.toLowerCase().includes(busqueda.toLowerCase())
            const matchAlmacen = filtroAlmacen === 'TODOS' || item.almacen === filtroAlmacen
            const matchPlanta = filtroPlanta === 'TODAS' || item.planta === filtroPlanta
            const matchEstado = filtroEstado === 'TODOS' || item.estado === filtroEstado
            return matchBusqueda && matchAlmacen && matchPlanta && matchEstado
        })
    }, [items, busqueda, filtroAlmacen, filtroPlanta, filtroEstado])

    // KPIs del ciclo
    const metrics = useMemo(() => {
        const total = items.length
        const contados = items.filter(i => i.conteoFisico !== null).length
        const exactos = items.filter(i => i.estado === 'Exacto').length
        const discrepancias = items.filter(i => i.estado === 'Discrepancia').length
        const pendientes = items.filter(i => i.estado === 'Pendiente').length
        const eri = contados > 0 ? ((exactos / contados) * 100).toFixed(1) : '0.0'
        const valorInventario = items.reduce((acc, curr) => acc + (curr.valorTotal || 0), 0)
        const valorDiscrepancias = items.reduce((acc, curr) => {
            if (curr.conteoFisico === null) return acc
            const diff = curr.conteoFisico - curr.stockTeorico
            return acc + (diff * (curr.costoUnitario || curr.precio || 0))
        }, 0)
        return { total, contados, exactos, discrepancias, pendientes, eri, valorInventario, valorDiscrepancias }
    }, [items])

    const abrirConteoModal = (item: ConteoItem) => {
        setModalConteo(item)
        setConteoInput(item.conteoFisico !== null ? item.conteoFisico : item.stockTeorico)
        setObservacionInput(item.observacion || '')
    }

    const guardarConteo = () => {
        if (!modalConteo) return
        const fisico = Number(conteoInput)
        if (isNaN(fisico) || fisico < 0) {
            toast.error('Ingrese un conteo físico válido mayor o igual a cero')
            return
        }

        const diff = fisico - modalConteo.stockTeorico
        const nuevoEstado: ConteoItem['estado'] = diff === 0 ? 'Exacto' : 'Discrepancia'

        setItems(prev => prev.map(it => {
            if (it.id === modalConteo.id) {
                return {
                    ...it,
                    conteoFisico: fisico,
                    fechaConteo: new Date().toISOString().split('T')[0],
                    responsable: userEmail || 'Supervisor de Planta',
                    estado: nuevoEstado,
                    observacion: observacionInput.trim() || (diff === 0 ? 'Conteo conforme' : `Diferencia de ${diff > 0 ? `+${diff}` : diff} ${it.unidad}`)
                }
            }
            return it
        }))

        toast.success(diff === 0 ? 'Conteo guardado: Exacto sin novedad' : `Conteo guardado con discrepancia (${diff > 0 ? `+${diff}` : diff} ${modalConteo.unidad})`)
        setModalConteo(null)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#324354] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F6F3EE]"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#F6F3EE] font-sans text-[#000000]">
            {/* Header Firplak */}
            <Header
                title="Inventarios Cíclicos"
                subtitle="Control y Conteo Cíclico en Planta · SAP Service Layer"
                backUrl="/home"
                userEmail={userEmail}
                showLogout={true}
                compact={false}
            />

            <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 md:px-8 py-5 space-y-6">
                
                {/* 1. KPI CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
                    {/* Total Programados */}
                    <div className="bg-white p-4 rounded-2xl border border-[#e2ded5] shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-[#7B8E90] uppercase tracking-wider block">Items del Ciclo</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-[#324354]">{metrics.total}</span>
                                {origenDatosSAP && (
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                                        SAP
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#324354]/5 flex items-center justify-center text-[#324354]">
                            <Boxes size={20} />
                        </div>
                    </div>

                    {/* Valor Total Inventario */}
                    <div className="bg-white p-4 rounded-2xl border border-[#e2ded5] shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-[#7B8E90] uppercase tracking-wider block">Valor Stock SAP</span>
                            <span className="text-lg md:text-xl font-black text-[#324354] whitespace-nowrap">
                                {formatoCOP(metrics.valorInventario)}
                            </span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-[#59a96a]">
                            <span className="text-base font-black">$</span>
                        </div>
                    </div>

                    {/* Conteos Realizados */}
                    <div className="bg-white p-4 rounded-2xl border border-[#e2ded5] shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-[#7B8E90] uppercase tracking-wider block">Verificados</span>
                            <span className="text-2xl font-black text-[#324354]">{metrics.contados} <span className="text-xs font-semibold text-slate-400">/ {metrics.total}</span></span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>

                    {/* Exactitud de Registro (ERI) */}
                    <div className="bg-white p-4 rounded-2xl border border-[#e2ded5] shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-[#7B8E90] uppercase tracking-wider block">Exactitud (ERI %)</span>
                            <span className={`text-2xl font-black ${Number(metrics.eri) >= 95 ? 'text-[#59a96a]' : Number(metrics.eri) >= 85 ? 'text-[#deb841]' : 'text-[#d14747]'}`}>
                                {metrics.eri}%
                            </span>
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${Number(metrics.eri) >= 95 ? 'bg-emerald-50 text-[#59a96a]' : 'bg-amber-50 text-[#deb841]'}`}>
                            <span className="text-sm font-black">%</span>
                        </div>
                    </div>

                    {/* Discrepancias */}
                    <div className="bg-white p-4 rounded-2xl border border-[#e2ded5] shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-[#7B8E90] uppercase tracking-wider block">Discrepancias</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-[#d14747]">{metrics.discrepancias}</span>
                                {metrics.valorDiscrepancias !== 0 && (
                                    <span className="text-[10px] font-bold text-[#d14747]">
                                        ({formatoCOP(metrics.valorDiscrepancias)})
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#d14747]">
                            <AlertTriangle size={20} />
                        </div>
                    </div>

                    {/* Pendientes de Conteo */}
                    <div className="bg-white p-4 rounded-2xl border border-[#e2ded5] shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-[#7B8E90] uppercase tracking-wider block">Pendientes</span>
                            <span className="text-2xl font-black text-amber-600">{metrics.pendientes}</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <Clock size={20} />
                        </div>
                    </div>
                </div>

                {/* 2. BARRA DE CONTROLES, PESTAÑAS Y DISPARADOR SAP */}
                <div className="bg-white p-4 rounded-2xl border border-[#e2ded5] shadow-xs space-y-3">
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                        {/* Selector de Pestañas */}
                        <div className="flex bg-[#F6F3EE] p-1 rounded-xl w-full md:w-auto">
                            <button
                                onClick={() => setPestañaActiva('conteo')}
                                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                                    pestañaActiva === 'conteo'
                                        ? 'bg-[#324354] text-white shadow-xs'
                                        : 'text-[#7B8E90] hover:text-[#324354]'
                                }`}
                            >
                                Conteo Activo
                            </button>
                            <button
                                onClick={() => setPestañaActiva('historial')}
                                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                                    pestañaActiva === 'historial'
                                        ? 'bg-[#324354] text-white shadow-xs'
                                        : 'text-[#7B8E90] hover:text-[#324354]'
                                }`}
                            >
                                Histórico y Ajustes
                            </button>
                            <button
                                onClick={() => setPestañaActiva('programacion')}
                                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                                    pestañaActiva === 'programacion'
                                        ? 'bg-[#324354] text-white shadow-xs'
                                        : 'text-[#7B8E90] hover:text-[#324354]'
                                }`}
                            >
                                Cronograma ABC
                            </button>
                        </div>

                        {/* Botones de acción: Criterios SAP + Exportar Excel */}
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            <button
                                onClick={() => setMostrarModalSAP(true)}
                                className="px-4 py-2 bg-[#deb841] hover:bg-[#c9a532] text-[#324354] rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-xs active:scale-95"
                            >
                                <Database size={15} />
                                <span>Criterios de Selección (Auditoría SAP)</span>
                                {sapAlmacenesSeleccionados.length > 0 && (
                                    <span className="bg-[#324354] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                        {sapAlmacenesSeleccionados.length} alm.
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => toast.info('Exportando reporte de conteo cíclico...')}
                                className="px-3.5 py-2 bg-[#F6F3EE] hover:bg-[#e2ded5] text-[#324354] rounded-xl text-xs font-bold transition-colors flex items-center gap-2 border border-[#e2ded5]"
                            >
                                <Download size={15} />
                                <span>Exportar Excel</span>
                            </button>
                        </div>
                    </div>

                    {/* Filtros rápidos en pantalla */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-[#e2ded5]/60">
                        {/* Buscador */}
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7B8E90]" />
                            <input
                                type="text"
                                placeholder="Buscar SKU o descripción..."
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-[#F6F3EE]/60 border border-[#e2ded5] rounded-xl text-xs font-medium focus:outline-none focus:border-[#324354]"
                            />
                        </div>

                        {/* Filtro Almacén */}
                        <select
                            value={filtroAlmacen}
                            onChange={e => setFiltroAlmacen(e.target.value)}
                            className="w-full px-3 py-2 bg-[#F6F3EE]/60 border border-[#e2ded5] rounded-xl text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354]"
                        >
                            <option value="TODOS">Todos los almacenes</option>
                            {ALMACENES_DISPONIBLES.map(a => (
                                <option key={a.codigo} value={a.codigo}>
                                    {a.codigo} · {a.nombre}
                                </option>
                            ))}
                        </select>

                        {/* Filtro Planta */}
                        <select
                            value={filtroPlanta}
                            onChange={e => setFiltroPlanta(e.target.value)}
                            className="w-full px-3 py-2 bg-[#F6F3EE]/60 border border-[#e2ded5] rounded-xl text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354]"
                        >
                            <option value="TODAS">Todas las plantas</option>
                            <option value="MS">Mármol Sintético (MS)</option>
                            <option value="FV">Fibra de Vidrio (FV)</option>
                            <option value="MBL">Muebles (MBL)</option>
                            <option value="CEFI">CEFI</option>
                            <option value="MOLD">Moldes</option>
                            <option value="PT">Producto Terminado</option>
                        </select>

                        {/* Filtro Estado */}
                        <select
                            value={filtroEstado}
                            onChange={e => setFiltroEstado(e.target.value as any)}
                            className="w-full px-3 py-2 bg-[#F6F3EE]/60 border border-[#e2ded5] rounded-xl text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354]"
                        >
                            <option value="TODOS">Todos los estados</option>
                            <option value="Pendiente">⏳ Pendiente de Conteo</option>
                            <option value="Exacto">✅ Conteo Exacto (Conforme)</option>
                            <option value="Discrepancia">⚠️ Con Discrepancia</option>
                        </select>
                    </div>
                </div>

                {/* 3. TABLA DE CONTEOS ACTIVOS */}
                {pestañaActiva === 'conteo' && (
                    <div className="bg-white rounded-2xl border border-[#e2ded5] shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-[#e2ded5] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-[#324354] uppercase tracking-wide">
                                    Lista de Items para Conteo Cíclico
                                </span>
                                <span className="text-xs bg-[#324354]/5 text-[#324354] font-bold px-2 py-0.5 rounded-full">
                                    {itemsFiltrados.length} items
                                </span>
                                {origenDatosSAP && (
                                    <span className="text-xs bg-emerald-100 text-[#59a96a] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Check size={12} /> Sincronizado con SAP Service Layer
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#324354] text-white uppercase text-[10px] tracking-wider font-bold">
                                        <th className="py-3 px-3">Cat.</th>
                                        <th className="py-3 px-3">SKU</th>
                                        <th className="py-3 px-4">Descripción del Material</th>
                                        <th className="py-3 px-2 text-center">Almacén</th>
                                        <th className="py-3 px-2 text-center">Planta</th>
                                        <th className="py-3 px-3 text-right">Stock Teórico</th>
                                        <th className="py-3 px-2 text-right">Comp.</th>
                                        <th className="py-3 px-2 text-right">Disp.</th>
                                        <th className="py-3 px-3 text-right">Costo/Precio Unit.</th>
                                        <th className="py-3 px-3 text-right">Valor Stock Total</th>
                                        <th className="py-3 px-3 text-right">Conteo Físico</th>
                                        <th className="py-3 px-3 text-right">Dif. Cant.</th>
                                        <th className="py-3 px-3 text-right">Dif. Valor ($)</th>
                                        <th className="py-3 px-3 text-center">Estado</th>
                                        <th className="py-3 px-3 text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e2ded5]">
                                    {itemsFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={15} className="py-12 px-4 text-center">
                                                {!origenDatosSAP ? (
                                                    <div className="max-w-md mx-auto space-y-3">
                                                        <div className="w-12 h-12 mx-auto rounded-2xl bg-[#deb841]/20 text-[#324354] flex items-center justify-center">
                                                            <Database size={24} />
                                                        </div>
                                                        <h4 className="text-sm font-black text-[#324354]">
                                                            No hay información cargada
                                                        </h4>
                                                        <p className="text-xs text-[#7B8E90] leading-relaxed">
                                                            Para ver los datos reales, abra los criterios de selección de SAP, elija los almacenes y filtros requeridos, y consulte el stock, costos y precios en vivo desde SAP Service Layer.
                                                        </p>
                                                        <button
                                                            onClick={() => setMostrarModalSAP(true)}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#deb841] hover:bg-[#c9a532] text-[#324354] rounded-xl text-xs font-black shadow-xs transition-all active:scale-95"
                                                        >
                                                            <SlidersHorizontal size={15} />
                                                            <span>Configurar Criterios y Consultar SAP</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="max-w-md mx-auto space-y-2">
                                                        <p className="text-xs text-slate-500 font-semibold">
                                                            No se encontraron artículos en SAP con los filtros aplicados.
                                                        </p>
                                                        <button
                                                            onClick={() => setMostrarModalSAP(true)}
                                                            className="text-xs text-blue-600 font-bold hover:underline"
                                                        >
                                                            Modificar Criterios de Selección SAP
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        itemsFiltrados.map(item => {
                                            const tieneConteo = item.conteoFisico !== null
                                            const diff = tieneConteo ? (item.conteoFisico! - item.stockTeorico) : null
                                            const unitCost = item.costoUnitario || item.precio || 0
                                            const diffValor = diff !== null ? diff * unitCost : null

                                            return (
                                                <tr key={item.id} className="hover:bg-[#F6F3EE]/40 transition-colors">
                                                    <td className="py-3 px-3">
                                                        <span className={`inline-block px-2 py-0.5 rounded font-black text-[10px] ${
                                                            item.categoria === 'A' ? 'bg-rose-100 text-rose-700' :
                                                            item.categoria === 'B' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            {item.categoria}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 font-mono font-bold text-[#324354] whitespace-nowrap">
                                                        {item.sku}
                                                    </td>
                                                    <td className="py-3 px-4 font-semibold text-slate-800">
                                                        {item.descripcion}
                                                    </td>
                                                    <td className="py-3 px-2 text-center font-bold text-[#7B8E90]">
                                                        {item.almacen}
                                                    </td>
                                                    <td className="py-3 px-2 text-center font-bold text-slate-600">
                                                        {item.planta}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-black text-[#324354]">
                                                        {item.stockTeorico} <span className="text-[10px] text-slate-400 font-normal">{item.unidad}</span>
                                                    </td>
                                                    <td className="py-3 px-2 text-right font-bold text-slate-500">
                                                        {item.comprometido || 0}
                                                    </td>
                                                    <td className="py-3 px-2 text-right font-bold text-slate-700">
                                                        {item.disponible ?? item.stockTeorico}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                                                        {formatoCOP(unitCost)}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono font-black text-[#324354] whitespace-nowrap">
                                                        {formatoCOP(item.valorTotal || (item.stockTeorico * unitCost))}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-black">
                                                        {tieneConteo ? (
                                                            <span className={diff === 0 ? 'text-[#59a96a]' : 'text-[#d14747]'}>
                                                                {item.conteoFisico} <span className="text-[10px] font-normal">{item.unidad}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 font-normal italic">Sin registrar</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-black">
                                                        {diff !== null ? (
                                                            diff === 0 ? (
                                                                <span className="text-[#59a96a]">0</span>
                                                            ) : (
                                                                <span className={diff > 0 ? 'text-amber-600' : 'text-[#d14747]'}>
                                                                    {diff > 0 ? `+${diff}` : diff}
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                                                        {diffValor !== null ? (
                                                            diffValor === 0 ? (
                                                                <span className="text-[#59a96a]">$ 0</span>
                                                            ) : (
                                                                <span className={diffValor > 0 ? 'text-amber-600' : 'text-[#d14747]'}>
                                                                    {diffValor > 0 ? `+${formatoCOP(diffValor)}` : `-${formatoCOP(Math.abs(diffValor))}`}
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                            item.estado === 'Exacto' ? 'bg-emerald-100 text-[#59a96a]' :
                                                            item.estado === 'Discrepancia' ? 'bg-red-100 text-[#d14747]' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {item.estado === 'Exacto' && <Check size={12} />}
                                                            {item.estado === 'Discrepancia' && <AlertTriangle size={12} />}
                                                            {item.estado === 'Pendiente' && <Clock size={12} />}
                                                            {item.estado}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <button
                                                            onClick={() => abrirConteoModal(item)}
                                                            className="px-3 py-1 bg-[#324354] hover:bg-[#25323f] text-white rounded-lg text-[11px] font-bold transition-all shadow-xs active:scale-95"
                                                        >
                                                            {tieneConteo ? 'Recontar' : 'Contar'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 4. HISTÓRICO Y AJUSTES */}
                {pestañaActiva === 'historial' && (
                    <div className="bg-white rounded-2xl border border-[#e2ded5] shadow-xs p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-[#324354] uppercase tracking-wide">
                                    Historial de Conteos y Ajustes de Inventario
                                </h3>
                                <p className="text-xs text-[#7B8E90] mt-0.5">
                                    Auditoría de variaciones físicas versus teóricas registradas en planta
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#324354] text-white uppercase text-[10px] tracking-wider font-bold">
                                        <th className="py-2.5 px-3">Fecha</th>
                                        <th className="py-2.5 px-3">SKU</th>
                                        <th className="py-2.5 px-3">Descripción</th>
                                        <th className="py-2.5 px-3 text-center">Almacén</th>
                                        <th className="py-2.5 px-3 text-right">Teórico</th>
                                        <th className="py-2.5 px-3 text-right">Físico</th>
                                        <th className="py-2.5 px-3 text-right">Diferencia</th>
                                        <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                                        <th className="py-2.5 px-3 text-right">Impacto Financiero</th>
                                        <th className="py-2.5 px-3">Responsable</th>
                                        <th className="py-2.5 px-3">Observación / Justificación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e2ded5]">
                                    {items.filter(i => i.fechaConteo !== null).map(it => {
                                        const diff = it.conteoFisico! - it.stockTeorico
                                        const unitCost = it.costoUnitario || it.precio || 0
                                        const impacto = diff * unitCost

                                        return (
                                            <tr key={it.id} className="hover:bg-[#F6F3EE]/40">
                                                <td className="py-2.5 px-3 font-semibold text-slate-600">{it.fechaConteo}</td>
                                                <td className="py-2.5 px-3 font-mono font-bold text-[#324354]">{it.sku}</td>
                                                <td className="py-2.5 px-3 font-semibold text-slate-800">{it.descripcion}</td>
                                                <td className="py-2.5 px-3 text-center font-bold text-[#7B8E90]">{it.almacen}</td>
                                                <td className="py-2.5 px-3 text-right font-black">{it.stockTeorico}</td>
                                                <td className="py-2.5 px-3 text-right font-black text-[#324354]">{it.conteoFisico}</td>
                                                <td className="py-2.5 px-3 text-right font-black">
                                                    {diff === 0 ? (
                                                        <span className="text-[#59a96a]">0</span>
                                                    ) : (
                                                        <span className="text-[#d14747]">{diff > 0 ? `+${diff}` : diff}</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-600">
                                                    {formatoCOP(unitCost)}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono font-bold">
                                                    {diff === 0 ? (
                                                        <span className="text-[#59a96a]">$ 0</span>
                                                    ) : (
                                                        <span className={impacto > 0 ? 'text-amber-600' : 'text-[#d14747]'}>
                                                            {impacto > 0 ? `+${formatoCOP(impacto)}` : `-${formatoCOP(Math.abs(impacto))}`}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-700">{it.responsable}</td>
                                                <td className="py-2.5 px-3 text-slate-600 italic">{it.observacion || '-'}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 5. CRONOGRAMA ABC */}
                {pestañaActiva === 'programacion' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-black rounded-lg">CLASE A (Alta Rotación / Costo)</span>
                                <span className="text-xs font-bold text-slate-400">Cada 15 días</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Materias primas críticas: Resinas, Gelcoats, Láminas MDP, Motobombas y Herrajes principales. Requieren máxima exactitud (meta ERI &gt; 98%).
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-black rounded-lg">CLASE B (Rotación Media)</span>
                                <span className="text-xs font-bold text-slate-400">Mensual</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Insumos de producción secundaria: Peróxidos, Masillas, Mangueras flexibles, Tubería PVC y Cintas de embalaje.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-black rounded-lg">CLASE C (Baja Rotación / Menor Costo)</span>
                                <span className="text-xs font-bold text-slate-400">Bimensual</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Tornillería, Arandelas, Tapas plásticas, Calcomanías y empaques secundarios de bajo valor unitario.
                            </p>
                        </div>
                    </div>
                )}
            </main>

            {/* MODAL SAP: INFORME DE AUDITORÍA DE STOCK: CRITERIOS DE SELECCIÓN */}
            {mostrarModalSAP && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
                    <div className="bg-[#f0ece4] rounded-2xl border-2 border-[#324354] shadow-2xl max-w-2xl w-full my-auto overflow-hidden animate-in fade-in zoom-in duration-150">
                        {/* Barra de título estilo SAP Business One */}
                        <div className="bg-gradient-to-r from-[#324354] to-[#25323f] text-white px-4 py-2.5 flex items-center justify-between select-none">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-[#deb841] text-[#324354] flex items-center justify-center font-black text-[10px] shadow-xs">
                                    SAP
                                </div>
                                <span className="text-xs md:text-sm font-bold tracking-wide">
                                    Informe de auditoría de stock: Criterios de selección
                                </span>
                            </div>
                            <button
                                onClick={() => setMostrarModalSAP(false)}
                                className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Cuerpo del formulario SAP */}
                        <div className="p-4 md:p-5 space-y-4 text-xs text-[#000000]">
                            {/* Fecha de contabilización */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-white p-2.5 rounded-xl border border-[#d5d0c6]">
                                <span className="font-bold text-slate-700">Fecha de contabiliz.</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-slate-500">Desde</span>
                                    <input
                                        type="date"
                                        value={sapFechaDesde}
                                        onChange={e => setSapFechaDesde(e.target.value)}
                                        className="w-full px-2 py-1 bg-[#F6F3EE] border border-[#c4beaf] rounded text-xs font-mono font-medium"
                                    />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-slate-500">Hasta</span>
                                    <input
                                        type="date"
                                        value={sapFechaHasta}
                                        onChange={e => setSapFechaHasta(e.target.value)}
                                        className="w-full px-2 py-1 bg-[#F6F3EE] border border-[#c4beaf] rounded text-xs font-mono font-medium"
                                    />
                                </div>
                            </div>

                            {/* Artículos */}
                            <div className="bg-white p-3 rounded-xl border border-[#d5d0c6] space-y-2.5">
                                <span className="font-bold text-slate-800 uppercase text-[11px] block border-b border-slate-100 pb-1">
                                    Artículos
                                </span>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-16 text-slate-600 font-semibold">Código Desde</span>
                                        <input
                                            type="text"
                                            placeholder="CMPD01..."
                                            value={sapCodigoDesde}
                                            onChange={e => setSapCodigoDesde(e.target.value)}
                                            className="flex-1 px-2.5 py-1 bg-[#F6F3EE] border border-[#c4beaf] rounded text-xs font-mono"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-16 text-slate-600 font-semibold">Hasta</span>
                                        <input
                                            type="text"
                                            placeholder="ZZZZ..."
                                            value={sapCodigoHasta}
                                            onChange={e => setSapCodigoHasta(e.target.value)}
                                            className="flex-1 px-2.5 py-1 bg-[#F6F3EE] border border-[#c4beaf] rounded text-xs font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-28 text-slate-600 font-semibold">Grupo de artículos</span>
                                        <select
                                            value={sapGrupoArticulos}
                                            onChange={e => setSapGrupoArticulos(e.target.value)}
                                            className="flex-1 px-2 py-1 bg-[#F6F3EE] border border-[#c4beaf] rounded text-xs font-medium"
                                        >
                                            {GRUPOS_ARTICULOS.map(g => (
                                                <option key={g.id} value={g.id}>{g.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 justify-end">
                                        <button 
                                            type="button"
                                            onClick={() => toast.info('Propiedades ignoradas por defecto')}
                                            className="px-3 py-1 bg-[#e7e3da] hover:bg-[#d8d3c8] text-slate-700 rounded border border-[#c4beaf] text-[11px] font-bold"
                                        >
                                            Propiedades
                                        </button>
                                        <span className="text-[11px] text-slate-500 italic">Ignorar</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="sapCuentasMayor"
                                        checked={sapCuentasMayor}
                                        onChange={e => setSapCuentasMayor(e.target.checked)}
                                        className="rounded border-[#c4beaf] text-[#324354] focus:ring-0"
                                    />
                                    <label htmlFor="sapCuentasMayor" className="text-slate-700 font-medium cursor-pointer">
                                        Cuentas de mayor
                                    </label>
                                </div>
                            </div>

                            {/* Almacenes */}
                            <div className="bg-white p-3 rounded-xl border border-[#d5d0c6] space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-800 uppercase text-[11px]">
                                        Almacenes ({sapAlmacenesSeleccionados.length} seleccionados)
                                    </span>
                                    <div className="flex gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => seleccionarTodosAlmacenes(true)}
                                            className="px-2.5 py-0.5 bg-[#deb841]/20 hover:bg-[#deb841]/40 text-[#324354] rounded text-[10px] font-bold"
                                        >
                                            Desplegar / Todos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => seleccionarTodosAlmacenes(false)}
                                            className="px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold"
                                        >
                                            Comprimir / Ninguno
                                        </button>
                                    </div>
                                </div>

                                <div className="max-h-48 overflow-y-auto border border-[#c4beaf] rounded-lg">
                                    <table className="w-full text-left text-[11px] border-collapse">
                                        <thead className="bg-[#e7e3da] text-slate-700 sticky top-0 font-bold border-b border-[#c4beaf]">
                                            <tr>
                                                <th className="p-1.5 w-8 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={sapAlmacenesSeleccionados.length === ALMACENES_DISPONIBLES.length}
                                                        onChange={e => seleccionarTodosAlmacenes(e.target.checked)}
                                                        className="rounded text-[#324354]"
                                                    />
                                                </th>
                                                <th className="p-1.5">Localidad</th>
                                                <th className="p-1.5">Código de almacén</th>
                                                <th className="p-1.5">Nombre del almacén</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {ALMACENES_DISPONIBLES.map(wh => {
                                                const checked = sapAlmacenesSeleccionados.includes(wh.codigo)
                                                return (
                                                    <tr 
                                                        key={wh.codigo} 
                                                        onClick={() => toggleAlmacenSAP(wh.codigo)}
                                                        className={`cursor-pointer hover:bg-amber-50/60 ${checked ? 'bg-[#F6F3EE]' : ''}`}
                                                    >
                                                        <td className="p-1.5 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => {}}
                                                                className="rounded text-[#324354]"
                                                            />
                                                        </td>
                                                        <td className="p-1.5 text-slate-500 font-medium">{wh.localidad}</td>
                                                        <td className="p-1.5 font-bold font-mono text-[#324354]">
                                                            <span className="inline-flex items-center gap-1">
                                                                <span className="text-[#deb841] text-xs">➡</span>
                                                                {wh.codigo}
                                                            </span>
                                                        </td>
                                                        <td className="p-1.5 text-slate-700 font-semibold">{wh.nombre}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Visualizar */}
                            <div className="bg-white p-3 rounded-xl border border-[#d5d0c6] space-y-2">
                                <span className="font-bold text-slate-800 text-[11px] block">Visualizar</span>
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                                        <input
                                            type="radio"
                                            name="visualizar"
                                            checked={sapVisualizar === 'articulos'}
                                            onChange={() => setSapVisualizar('articulos')}
                                            className="text-[#324354]"
                                        />
                                        Por artículos
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                                        <input
                                            type="radio"
                                            name="visualizar"
                                            checked={sapVisualizar === 'cuentas'}
                                            onChange={() => setSapVisualizar('cuentas')}
                                            className="text-[#324354]"
                                        />
                                        Resumir por cuentas
                                    </label>
                                </div>
                            </div>

                            {/* Opciones adicionales */}
                            <div className="bg-white p-3 rounded-xl border border-[#d5d0c6] space-y-1.5">
                                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                                    <input
                                        type="checkbox"
                                        checked={sapGrupoPorAlmacen}
                                        onChange={e => setSapGrupoPorAlmacen(e.target.checked)}
                                        className="rounded text-[#324354]"
                                    />
                                    Grupo por almacenes
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                                    <input
                                        type="checkbox"
                                        checked={sapVisualizarSinTransacciones}
                                        onChange={e => setSapVisualizarSinTransacciones(e.target.checked)}
                                        className="rounded text-[#324354]"
                                    />
                                    Visualizar SI para artículos/cuentas sin transacciones
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                                    <input
                                        type="checkbox"
                                        checked={sapOcultarStockCero}
                                        onChange={e => setSapOcultarStockCero(e.target.checked)}
                                        className="rounded text-[#324354]"
                                    />
                                    Ocultar artículos con una cantidad acumulada equivalente a cero
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                                    <input
                                        type="checkbox"
                                        checked={sapOcultarSerieLote}
                                        onChange={e => setSapOcultarSerieLote(e.target.checked)}
                                        className="rounded text-[#324354]"
                                    />
                                    Ocultar transacciones de serie/lote si el método de valoración no es serie/lote
                                </label>
                            </div>
                        </div>

                        {/* Botones de acción inferiores */}
                        <div className="bg-[#e7e3da] px-5 py-3 border-t border-[#c4beaf] flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setMostrarModalSAP(false)}
                                disabled={consultandoSAP}
                                className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-[#c4beaf] text-xs transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={ejecutarConsultaSAP}
                                disabled={consultandoSAP}
                                className="px-6 py-2 bg-[#324354] hover:bg-[#25323f] text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-2"
                            >
                                {consultandoSAP ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin text-[#deb841]" />
                                        <span>Consultando SAP Service Layer...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} className="text-[#deb841]" />
                                        <span>OK (Consultar Auditoría)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PARA CAPTURAR CONTEO FÍSICO */}
            {modalConteo && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-[#e2ded5] space-y-5 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-start justify-between border-b border-[#e2ded5] pb-3">
                            <div>
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                                    Conteo Cíclico · {modalConteo.almacen}
                                </span>
                                <h3 className="text-base font-black text-[#324354] leading-tight mt-0.5">
                                    {modalConteo.descripcion}
                                </h3>
                                <p className="text-xs font-mono font-bold text-slate-400 mt-1">
                                    SKU: {modalConteo.sku}
                                </p>
                            </div>
                            <button
                                onClick={() => setModalConteo(null)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 bg-[#F6F3EE] p-3 rounded-xl text-xs">
                                <div>
                                    <span className="text-[10px] text-slate-500 font-semibold block">Stock Teórico SAP:</span>
                                    <span className="font-black text-[#324354] text-sm">
                                        {modalConteo.stockTeorico} {modalConteo.unidad}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-slate-500 font-semibold block">Costo/Precio Unit.:</span>
                                    <span className="font-mono font-bold text-slate-700 text-xs">
                                        {formatoCOP(modalConteo.costoUnitario || modalConteo.precio)}
                                    </span>
                                </div>
                                <div className="col-span-2 pt-1 border-t border-[#e2ded5] flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500">Valor Total en Stock:</span>
                                    <span className="font-mono font-black text-[#324354]">
                                        {formatoCOP(modalConteo.valorTotal || (modalConteo.stockTeorico * (modalConteo.costoUnitario || modalConteo.precio || 0)))}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#324354] block">
                                    Conteo Físico Verificado ({modalConteo.unidad}):
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={conteoInput}
                                    onChange={e => setConteoInput(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full px-4 py-3 bg-white border-2 border-[#e2ded5] focus:border-[#324354] rounded-xl text-xl font-black text-center text-[#324354] focus:outline-none transition-colors"
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>

                            {conteoInput !== '' && !isNaN(Number(conteoInput)) && (
                                <div className={`p-3 rounded-xl space-y-1 text-xs font-bold ${
                                    Number(conteoInput) === modalConteo.stockTeorico
                                        ? 'bg-emerald-50 text-[#59a96a]'
                                        : 'bg-red-50 text-[#d14747]'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <span>Diferencia en Cantidad:</span>
                                        <span className="text-sm font-black">
                                            {Number(conteoInput) - modalConteo.stockTeorico > 0 ? `+${Number(conteoInput) - modalConteo.stockTeorico}` : Number(conteoInput) - modalConteo.stockTeorico} {modalConteo.unidad}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-black/5 text-[11px]">
                                        <span>Impacto Financiero:</span>
                                        <span className="font-mono font-black">
                                            {(() => {
                                                const diff = Number(conteoInput) - modalConteo.stockTeorico
                                                const unitCost = modalConteo.costoUnitario || modalConteo.precio || 0
                                                const diffVal = diff * unitCost
                                                if (diff === 0) return '$ 0'
                                                return diffVal > 0 ? `+${formatoCOP(diffVal)}` : `-${formatoCOP(Math.abs(diffVal))}`
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#324354] block">
                                    Observaciones / Causa de Desviación:
                                </label>
                                <textarea
                                    value={observacionInput}
                                    onChange={e => setObservacionInput(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-[#F6F3EE]/60 border border-[#e2ded5] rounded-xl text-xs font-medium focus:outline-none focus:border-[#324354]"
                                    placeholder="Detalles del conteo, merma, piezas dañadas o sin novedad..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setModalConteo(null)}
                                className="flex-1 py-3 bg-[#F6F3EE] hover:bg-[#e2ded5] text-[#324354] font-bold rounded-xl text-xs transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={guardarConteo}
                                className="flex-1 py-3 bg-[#324354] hover:bg-[#25323f] text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
                            >
                                Guardar Conteo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
