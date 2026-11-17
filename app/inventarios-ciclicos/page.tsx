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
    ArrowUpDown, 
    Download, 
    RefreshCw, 
    Plus, 
    FileSpreadsheet,
    Building2,
    Warehouse,
    Check,
    X
} from 'lucide-react'
import { toast } from 'sonner'

interface ConteoItem {
    id: string
    sku: string
    descripcion: string
    almacen: string
    planta: string
    categoria: 'A' | 'B' | 'C'
    stockTeorico: number
    conteoFisico: number | null
    unidad: string
    fechaConteo: string | null
    responsable: string | null
    estado: 'Pendiente' | 'Exacto' | 'Discrepancia'
    observacion?: string
}

const ALMACENES = [
    { id: 'TODOS', nombre: 'Todos los almacenes' },
    { id: 'MP-01', nombre: 'MP-01 · Almacén Central de Materias Primas' },
    { id: 'MP-04', nombre: 'MP-04 · Planta Mármol Sintético' },
    { id: 'MP-03', nombre: 'MP-03 · Planta Fibra de Vidrio' },
    { id: 'MP-02', nombre: 'MP-02 · Planta Muebles' },
    { id: 'PT-01', nombre: 'PT-01 · Almacén Producto Terminado' },
    { id: 'REP-01', nombre: 'REP-01 · Almacén Repuestos y Mtto' }
]

const PLANTAS = [
    { id: 'TODAS', nombre: 'Todas las plantas' },
    { id: 'MS', nombre: 'Mármol Sintético (MS)' },
    { id: 'FV', nombre: 'Fibra de Vidrio (FV)' },
    { id: 'MBL', nombre: 'Muebles (MBL)' },
    { id: 'CEFI', nombre: 'CEFI' }
]

// Muestra inicial de datos de inventario cíclico operativo
const ITEMS_BASE: ConteoItem[] = [
    {
        id: '1',
        sku: 'CMPD01-0019-000-0000',
        descripcion: 'RESINA FV 4891 VIRGEN',
        almacen: 'MP-03',
        planta: 'FV',
        categoria: 'A',
        stockTeorico: 450,
        conteoFisico: 450,
        unidad: 'KG',
        fechaConteo: '2026-11-16',
        responsable: 'Carlos Andrés Gómez',
        estado: 'Exacto',
        observacion: 'Conteo sin novedad'
    },
    {
        id: '2',
        sku: 'PGEL01-0001-000-0100',
        descripcion: 'GELCOAT BLANCO 100 (FIBRA DE VIDRIO)',
        almacen: 'MP-03',
        planta: 'FV',
        categoria: 'A',
        stockTeorico: 180,
        conteoFisico: 172,
        unidad: 'KG',
        fechaConteo: '2026-11-16',
        responsable: 'Carlos Andrés Gómez',
        estado: 'Discrepancia',
        observacion: 'Merma en tubería de aplicación'
    },
    {
        id: '3',
        sku: 'CMPD01-0048-000-0000',
        descripcion: 'PEROXIDO NOROX 925H',
        almacen: 'MP-04',
        planta: 'MS',
        categoria: 'B',
        stockTeorico: 85,
        conteoFisico: null,
        unidad: 'KG',
        fechaConteo: null,
        responsable: null,
        estado: 'Pendiente'
    },
    {
        id: '4',
        sku: 'CMPD04-0079-000-0000',
        descripcion: 'MOTOBOMBA 1 HP 110V 60HZ HIDROMASAJE',
        almacen: 'MP-01',
        planta: 'FV',
        categoria: 'A',
        stockTeorico: 24,
        conteoFisico: 24,
        unidad: 'UN',
        fechaConteo: '2026-11-15',
        responsable: 'Lina María Osorio',
        estado: 'Exacto'
    },
    {
        id: '5',
        sku: 'CMPD09-0120-000-0000',
        descripcion: 'TABLERO MDP 15MM BLANCO 1.83X2.44',
        almacen: 'MP-02',
        planta: 'MBL',
        categoria: 'A',
        stockTeorico: 62,
        conteoFisico: 59,
        unidad: 'HOJA',
        fechaConteo: '2026-11-16',
        responsable: 'Jhon Alexander Zapata',
        estado: 'Discrepancia',
        observacion: '3 hojas en reproceso de corte'
    },
    {
        id: '6',
        sku: 'CEMP02-0075-000-0000',
        descripcion: 'CALCOMANIA MANGUERA SUCCION BAÑERA',
        almacen: 'MP-01',
        planta: 'FV',
        categoria: 'C',
        stockTeorico: 1200,
        conteoFisico: null,
        unidad: 'UN',
        fechaConteo: null,
        responsable: null,
        estado: 'Pendiente'
    },
    {
        id: '7',
        sku: 'COMP02-0018-000-0000',
        descripcion: 'TORNILLO 1/4IN X 2 1/2IN GALVANIZADO',
        almacen: 'MP-01',
        planta: 'FV',
        categoria: 'C',
        stockTeorico: 3500,
        conteoFisico: null,
        unidad: 'UN',
        fechaConteo: null,
        responsable: null,
        estado: 'Pendiente'
    }
]

export default function InventariosCiclicosPage() {
    const router = useRouter()
    const [userEmail, setUserEmail] = useState<string>('')
    const [loading, setLoading] = useState(true)

    // Datos y filtros
    const [items, setItems] = useState<ConteoItem[]>(ITEMS_BASE)
    const [busqueda, setBusqueda] = useState('')
    const [filtroAlmacen, setFiltroAlmacen] = useState('TODOS')
    const [filtroPlanta, setFiltroPlanta] = useState('TODAS')
    const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'Pendiente' | 'Exacto' | 'Discrepancia'>('TODOS')
    const [filtroCategoria, setFiltroCategoria] = useState<'TODAS' | 'A' | 'B' | 'C'>('TODAS')
    const [pestañaActiva, setPestañaActiva] = useState<'conteo' | 'historial' | 'programacion'>('conteo')

    // Modal de registro rápido de conteo
    const [modalConteo, setModalConteo] = useState<ConteoItem | null>(null)
    const [conteoInput, setConteoInput] = useState<number | ''>('')
    const [observacionInput, setObservacionInput] = useState('')

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

            // Validar permiso de inventarios cíclicos
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

    // Filtrar items
    const itemsFiltrados = useMemo(() => {
        return items.filter(item => {
            const matchBusqueda = 
                item.sku.toLowerCase().includes(busqueda.toLowerCase()) ||
                item.descripcion.toLowerCase().includes(busqueda.toLowerCase())
            const matchAlmacen = filtroAlmacen === 'TODOS' || item.almacen === filtroAlmacen
            const matchPlanta = filtroPlanta === 'TODAS' || item.planta === filtroPlanta
            const matchEstado = filtroEstado === 'TODOS' || item.estado === filtroEstado
            const matchCat = filtroCategoria === 'TODAS' || item.categoria === filtroCategoria
            return matchBusqueda && matchAlmacen && matchPlanta && matchEstado && matchCat
        })
    }, [items, busqueda, filtroAlmacen, filtroPlanta, filtroEstado, filtroCategoria])

    // KPIs del ciclo
    const metrics = useMemo(() => {
        const total = items.length
        const contados = items.filter(i => i.conteoFisico !== null).length
        const exactos = items.filter(i => i.estado === 'Exacto').length
        const discrepancias = items.filter(i => i.estado === 'Discrepancia').length
        const pendientes = items.filter(i => i.estado === 'Pendiente').length
        const eri = contados > 0 ? ((exactos / contados) * 100).toFixed(1) : '100.0'
        return { total, contados, exactos, discrepancias, pendientes, eri }
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
                subtitle="Control y Conteo Cíclico en Planta"
                backUrl="/home"
                userEmail={userEmail}
                showLogout={true}
                compact={false}
            />

            <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 md:px-8 py-5 space-y-6">
                
                {/* 1. KPI CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                    {/* Total Programados */}
                    <div className="bg-white p-4 rounded-2xl border border-[#e2ded5] shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-[#7B8E90] uppercase tracking-wider block">Items del Ciclo</span>
                            <span className="text-2xl font-black text-[#324354]">{metrics.total}</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#324354]/5 flex items-center justify-center text-[#324354]">
                            <Boxes size={20} />
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
                            <span className="text-2xl font-black text-[#d14747]">{metrics.discrepancias}</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#d14747]">
                            <AlertTriangle size={20} />
                        </div>
                    </div>

                    {/* Pendientes de Conteo */}
                    <div className="bg-white p-4 rounded-2xl border border-[#e2ded5] shadow-xs flex items-center justify-between col-span-2 lg:col-span-1">
                        <div>
                            <span className="text-[11px] font-bold text-[#7B8E90] uppercase tracking-wider block">Pendientes</span>
                            <span className="text-2xl font-black text-amber-600">{metrics.pendientes}</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <Clock size={20} />
                        </div>
                    </div>
                </div>

                {/* 2. BARRA DE CONTROLES Y FILTROS */}
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

                        {/* Botón de exportar */}
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            <button
                                onClick={() => toast.info('Exportando reporte de conteo cíclico...')}
                                className="px-3.5 py-2 bg-[#F6F3EE] hover:bg-[#e2ded5] text-[#324354] rounded-xl text-xs font-bold transition-colors flex items-center gap-2 border border-[#e2ded5]"
                            >
                                <Download size={15} />
                                <span>Exportar Excel</span>
                            </button>
                        </div>
                    </div>

                    {/* Filtros específicos */}
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
                            {ALMACENES.map(a => (
                                <option key={a.id} value={a.id}>{a.nombre}</option>
                            ))}
                        </select>

                        {/* Filtro Planta */}
                        <select
                            value={filtroPlanta}
                            onChange={e => setFiltroPlanta(e.target.value)}
                            className="w-full px-3 py-2 bg-[#F6F3EE]/60 border border-[#e2ded5] rounded-xl text-xs font-bold text-[#324354] focus:outline-none focus:border-[#324354]"
                        >
                            {PLANTAS.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
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
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#324354] text-white uppercase text-[10px] tracking-wider font-bold">
                                        <th className="py-3 px-3">Cat.</th>
                                        <th className="py-3 px-3">SKU</th>
                                        <th className="py-3 px-4">Descripción del Material</th>
                                        <th className="py-3 px-3 text-center">Almacén</th>
                                        <th className="py-3 px-3 text-center">Planta</th>
                                        <th className="py-3 px-3 text-right">Stock Teórico</th>
                                        <th className="py-3 px-3 text-right">Conteo Físico</th>
                                        <th className="py-3 px-3 text-right">Diferencia</th>
                                        <th className="py-3 px-3 text-center">Estado</th>
                                        <th className="py-3 px-3 text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e2ded5]">
                                    {itemsFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="py-8 text-center text-slate-400 font-semibold">
                                                No se encontraron items con los filtros aplicados.
                                            </td>
                                        </tr>
                                    ) : (
                                        itemsFiltrados.map(item => {
                                            const tieneConteo = item.conteoFisico !== null
                                            const diff = tieneConteo ? (item.conteoFisico! - item.stockTeorico) : null

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
                                                    <td className="py-3 px-3 text-center font-bold text-[#7B8E90]">
                                                        {item.almacen}
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-bold text-slate-600">
                                                        {item.planta}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-black text-[#324354]">
                                                        {item.stockTeorico} <span className="text-[10px] text-slate-400 font-normal">{item.unidad}</span>
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
                                        <th className="py-2.5 px-3">Responsable</th>
                                        <th className="py-2.5 px-3">Observación / Justificación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e2ded5]">
                                    {items.filter(i => i.fechaConteo !== null).map(it => (
                                        <tr key={it.id} className="hover:bg-[#F6F3EE]/40">
                                            <td className="py-2.5 px-3 font-semibold text-slate-600">{it.fechaConteo}</td>
                                            <td className="py-2.5 px-3 font-mono font-bold text-[#324354]">{it.sku}</td>
                                            <td className="py-2.5 px-3 font-semibold text-slate-800">{it.descripcion}</td>
                                            <td className="py-2.5 px-3 text-center font-bold text-[#7B8E90]">{it.almacen}</td>
                                            <td className="py-2.5 px-3 text-right font-black">{it.stockTeorico}</td>
                                            <td className="py-2.5 px-3 text-right font-black text-[#324354]">{it.conteoFisico}</td>
                                            <td className="py-2.5 px-3 text-right font-black">
                                                {it.conteoFisico! - it.stockTeorico === 0 ? (
                                                    <span className="text-[#59a96a]">0</span>
                                                ) : (
                                                    <span className="text-[#d14747]">{it.conteoFisico! - it.stockTeorico}</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-700">{it.responsable}</td>
                                            <td className="py-2.5 px-3 text-slate-600 italic">{it.observacion || '-'}</td>
                                        </tr>
                                    ))}
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
                            <div className="flex items-center justify-between p-3 bg-[#F6F3EE] rounded-xl text-xs">
                                <span className="font-bold text-slate-600">Stock Teórico en Sistema:</span>
                                <span className="font-black text-[#324354] text-sm">
                                    {modalConteo.stockTeorico} {modalConteo.unidad}
                                </span>
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
                                <div className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold ${
                                    Number(conteoInput) === modalConteo.stockTeorico
                                        ? 'bg-emerald-50 text-[#59a96a]'
                                        : 'bg-red-50 text-[#d14747]'
                                }`}>
                                    <span>Diferencia con Teórico:</span>
                                    <span className="text-sm font-black">
                                        {Number(conteoInput) - modalConteo.stockTeorico > 0 ? `+${Number(conteoInput) - modalConteo.stockTeorico}` : Number(conteoInput) - modalConteo.stockTeorico} {modalConteo.unidad}
                                    </span>
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

