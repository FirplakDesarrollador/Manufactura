'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/opt-sistemica/Header'
import componentsData from './components_data.json'

interface ComponentItem {
    id: number;
    tipo: string;
    no: string;
    descripcion: string;
    cantBase: number;
    ratioBase: number;
    cantRequerida: number;
    consumido: number;
    disponible: number;
    unidadMedida: string;
    almacen: string;
    metodoEmision: string;
}

interface OrderData {
    tipo: string;
    estado: string;
    noProducto: string;
    descripcionProducto: string;
    cantPlanificada: number;
    nombreUN: string;
    almacen: string;
    socioNegocio: string;
    metodoEnrutamiento: string;
    aprovisionarArticulos: boolean;
    noOrden: string;
    fechaOrden: string;
    fechaInicio: string;
    fechaFinalizacion: string;
    usuario: string;
    origen: string;
    vinculadoA: string;
    pedidoVinculado: string;
    cliente: string;
    centroCostos: string;
    proyecto: string;
    comentarios: string;
    observacionesEmpaque: string;
    componentes: ComponentItem[];
}

// Orden del pantallazo exacto de SAP
const order2257338: OrderData = {
    tipo: "Estándar",
    estado: "Liberado",
    noProducto: "VHPT03-0003-000-0100",
    descripcionProducto: "HIDROMASAJE NORUEGA ISLA 156 BLANCO-C2-KT-0100",
    cantPlanificada: 3,
    nombreUN: "Manual",
    almacen: "PT-02",
    socioNegocio: "AC890927404-01",
    metodoEnrutamiento: "En Fecha de inicio",
    aprovisionarArticulos: false,
    noOrden: "2257338",
    fechaOrden: "15/07/2026",
    fechaInicio: "15/07/2026",
    fechaFinalizacion: "29/07/2026",
    usuario: "Alejandra Londoño",
    origen: "Pedido de cliente",
    vinculadoA: "Pedido de cliente",
    pedidoVinculado: "160854",
    cliente: "CN901252141-02",
    centroCostos: "",
    proyecto: "",
    comentarios: "Orden de fabricación para lote especial de tinas de hidromasaje isla.",
    observacionesEmpaque: "Verificar recubrimiento y embalaje reforzado para despacho nacional.",
    componentes: componentsData as ComponentItem[]
};

// Generador dinámico para simular consulta en tiempo real
const generateMockOrder = (no: string): OrderData => {
    if (no === "2257338") return order2257338;

    const numVal = parseInt(no.replace(/\D/g, '')) || 2257338;
    const productTypes = [
        { code: "VHPT01-0002-000-0100", desc: "BAÑERA LONDRES 170 BLANCO-C1" },
        { code: "VHPT02-0005-000-0200", desc: "HIDROMASAJE MILAN 160 GRIS-C2" },
        { code: "VHPT04-0010-000-0100", desc: "LAVAMANOS FLORENCIA SUSPENDIDO BLANCO" },
        { code: "VHPT05-0012-000-0300", desc: "BAÑERA CORCEGA 150 BEIGE-C3" },
        { code: "VHPT03-0003-000-0100", desc: "HIDROMASAJE NORUEGA ISLA 156 BLANCO-C2-KT-0100" }
    ];
    const prodInfo = productTypes[numVal % productTypes.length];
    const cantPlan = (numVal % 10) + 1;
    const orderStates = ["Liberado", "Planificado", "Cerrado", "Histórico"];
    const orderState = orderStates[numVal % orderStates.length];

    const componentPool = componentsData;

    const comps: ComponentItem[] = [];
    const numComponents = (numVal % 15) + 8; // Generar de 8 a 22 componentes
    for (let i = 0; i < numComponents; i++) {
        const itemIdx = (numVal + i) % componentPool.length;
        const poolItem = componentPool[itemIdx];
        const isAvailPositive = (numVal + i) % 3 !== 0;
        const availQty = isAvailPositive ? Math.floor(((numVal * 7 + i) % 600) + 12) : -Math.floor(((numVal * 3 + i) % 400) + 8);

        comps.push({
            id: i + 1,
            tipo: poolItem.tipo || "Art",
            no: poolItem.no,
            descripcion: poolItem.descripcion,
            cantBase: poolItem.cantBase,
            ratioBase: poolItem.ratioBase || poolItem.cantBase,
            cantRequerida: poolItem.cantBase * cantPlan,
            consumido: 0,
            disponible: availQty,
            unidadMedida: poolItem.unidadMedida,
            almacen: poolItem.almacen,
            metodoEmision: poolItem.metodoEmision
        });
    }

    return {
        tipo: "Estándar",
        estado: orderState,
        noProducto: prodInfo.code,
        descripcionProducto: prodInfo.desc,
        cantPlanificada: cantPlan,
        nombreUN: "Manual",
        almacen: "PT-02",
        socioNegocio: `AC890927404-0${(numVal % 4) + 1}`,
        metodoEnrutamiento: "En Fecha de inicio",
        aprovisionarArticulos: false,
        noOrden: no,
        fechaOrden: "15/07/2026",
        fechaInicio: "15/07/2026",
        fechaFinalizacion: "29/07/2026",
        usuario: numVal % 2 === 0 ? "Alejandra Londoño" : "Mauricio Restrepo",
        origen: "Pedido de cliente",
        vinculadoA: "Pedido de cliente",
        pedidoVinculado: String(160850 + (numVal % 100)),
        cliente: `CN901252141-0${(numVal % 8) + 1}`,
        centroCostos: numVal % 2 === 0 ? "MANUF-01" : "",
        proyecto: numVal % 3 === 0 ? "PROY-ESP-FPL" : "",
        comentarios: `Consulta SAP generada para Orden Nº ${no} de tipo ${prodInfo.desc}.`,
        observacionesEmpaque: "Proteger con plástico burbuja y esquineras plásticas.",
        componentes: comps
    };
};

const SapLinkArrow = () => (
    <span title="Navegar en SAP" className="inline-flex items-center">
        <svg
            className="w-3.5 h-3.5 text-[#f5a623] cursor-pointer inline-block mx-1 hover:scale-110 active:scale-95 transition-all shrink-0 select-none"
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <path d="M12 2l10 10-10 10v-6H2v-8h10V2z" />
        </svg>
    </span>
);

export default function ConsultaSAPPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // Estados de búsqueda e interfaz SAP
    const [searchQuery, setSearchQuery] = useState("2257338")
    const [activeOrder, setActiveOrder] = useState<OrderData>(order2257338)
    const [tabActive, setTabActive] = useState<'componentes' | 'resumen' | 'anexos'>('componentes')
    const [currentTime, setCurrentTime] = useState("")

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) {
                router.push('/login')
                return
            }
            setUser(authUser)
            setLoading(false)
        }
        checkUser()
    }, [router])

    useEffect(() => {
        // Actualizar reloj de la barra de estado de SAP
        const updateClock = () => {
            const now = new Date()
            const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            setCurrentTime(timeStr)
        }
        updateClock()
        const interval = setInterval(updateClock, 1000)
        return () => clearInterval(interval)
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (searchQuery.trim() === "") return
        const newOrder = generateMockOrder(searchQuery.trim())
        setActiveOrder(newOrder)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#324354] flex items-center justify-center">
                <div className="text-white text-xl">Cargando...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000] pb-12">
            <Header
                title="Consulta SAP"
                subtitle="Módulo de Consulta"
                userEmail={user?.email}
                showLogout={true}
                onLogout={handleLogout}
            />

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 max-w-[1700px] w-full mx-auto p-2 md:p-3 flex flex-col gap-3 font-sans">
                
                {/* SAP CLIENT WINDOW REPLICA CONTAINER */}
                <div className="bg-[#eceae6] border border-[#a3a3a3] shadow-2xl flex flex-col font-sans select-none text-xs w-full text-black overflow-hidden relative">
                    
                    {/* SAP WINDOW TITLE BAR */}
                    <div className="bg-gradient-to-r from-[#eceae6] to-[#d6d3cc] px-3 py-1.5 flex items-center justify-between border-b border-[#a3a3a3]">
                        <div className="flex items-center gap-2">
                            {/* SAP Business One Icon Mock */}
                            <div className="w-4 h-4 bg-amber-500 rounded-sm flex items-center justify-center text-[10px] text-white font-black select-none shadow-sm">
                                S
                            </div>
                            <span className="font-semibold text-gray-800 text-[11px] tracking-wide">
                                Orden de fabricación - {activeOrder.noOrden}
                            </span>
                        </div>
                        
                        {/* Search container in Green circle */}
                        <div>
                            {/* Search Form inside Title Bar */}
                            <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSearch();
                                }} 
                                className="flex items-center bg-white border border-[#c0beb9] px-1.5 py-0.5 shadow-inner"
                            >
                                <span className="text-[10px] text-gray-500 font-semibold select-none mr-1.5 pl-0.5">Buscar OF:</span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-transparent text-black text-[11px] font-bold w-20 outline-none border-none p-0 focus:ring-0 select-text"
                                    placeholder="Nº Orden"
                                />
                                <button type="submit" className="text-gray-500 hover:text-black font-semibold text-[10px] px-1 hover:bg-gray-100 transition-colors">
                                    🔍
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* SAP GOLD SHARP ACCENT BORDER */}
                    <div className="h-[3px] bg-[#f4b000] w-full"></div>

                    {/* SAP WINDOW BODY */}
                    <div className="py-1 px-2.5 bg-[#f3f0ea] flex flex-col gap-1">

                        {/* HEADER DETAILS FORM - TWO COLUMNS */}
                        <div className="flex flex-wrap lg:flex-nowrap gap-x-8 gap-y-2 items-start justify-between w-full">
                            
                            {/* LEFT COLUMN FIELDS */}
                            <div className="space-y-0.5 shrink-0">
                                {/* Tipo */}
                                <div className="flex items-center">
                                    <span className="w-[130px] shrink-0 text-[11px] text-gray-800 select-none">Tipo</span>
                                    <select 
                                        value={activeOrder.tipo} 
                                        disabled 
                                        className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[150px] rounded-none focus:outline-none disabled:bg-[#fcfdfd]"
                                    >
                                        <option>Estándar</option>
                                        <option>Especial</option>
                                        <option>Desmontaje</option>
                                    </select>
                                </div>

                                {/* Estado */}
                                <div className="flex items-center">
                                    <span className="w-[130px] shrink-0 text-[11px] text-gray-800 select-none">Estado</span>
                                    <select 
                                        value={activeOrder.estado} 
                                        disabled 
                                        className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[150px] rounded-none focus:outline-none disabled:bg-[#fcfdfd]"
                                    >
                                        <option value="Planificado">Planificado</option>
                                        <option value="Liberado">Liberado</option>
                                        <option value="Cerrado">Cerrado</option>
                                        <option value="Histórico">Histórico</option>
                                    </select>
                                </div>

                                {/* Nº producto */}
                                <div className="flex items-center">
                                    <div className="w-[130px] shrink-0 flex items-center">
                                        <span className="text-[11px] text-gray-800 select-none">Nº producto</span>
                                        <SapLinkArrow />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={activeOrder.noProducto} 
                                        readOnly 
                                        className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[180px] rounded-none focus:outline-none"
                                    />
                                </div>

                                {/* Descripción producto */}
                                <div className="flex items-center">
                                    <span className="w-[130px] shrink-0 text-[11px] text-gray-800 select-none font-medium">Descripción producto</span>
                                    <input 
                                        type="text" 
                                        value={activeOrder.descripcionProducto} 
                                        readOnly 
                                        className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[480px] rounded-none focus:outline-none"
                                    />
                                </div>

                                {/* Cantidad planificada */}
                                <div className="flex items-center">
                                    <span className="w-[130px] shrink-0 text-[11px] text-gray-800 select-none">Cantidad planificada</span>
                                    <div className="flex items-center gap-1.5">
                                        <input 
                                            type="text" 
                                            value={activeOrder.cantPlanificada} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[50px] rounded-none text-right focus:outline-none"
                                        />
                                        <span className="text-[11px] text-gray-800 px-1 select-none">Nombre de UN</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.nombreUN} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[80px] rounded-none focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Almacén */}
                                <div className="flex items-center">
                                    <div className="w-[130px] shrink-0 flex items-center">
                                        <span className="text-[11px] text-gray-800 select-none">Almacén</span>
                                        <SapLinkArrow />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={activeOrder.almacen} 
                                        readOnly 
                                        className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[60px] rounded-none focus:outline-none"
                                    />
                                </div>

                                {/* Socio de negocio */}
                                <div className="flex items-center">
                                    <span className="w-[130px] shrink-0 text-[11px] text-gray-800 select-none">Socio de negocio</span>
                                    <input 
                                        type="text" 
                                        value={activeOrder.socioNegocio} 
                                        readOnly 
                                        className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[120px] rounded-none focus:outline-none"
                                    />
                                </div>

                                {/* Cálculo de fecha de enrutamiento */}
                                <div className="flex items-center">
                                    <span className="w-[130px] shrink-0 text-[11px] text-gray-800 select-none">Cálculo de fecha enr.</span>
                                    <input 
                                        type="text" 
                                        value={activeOrder.metodoEnrutamiento} 
                                        readOnly 
                                        className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[150px] rounded-none focus:outline-none"
                                    />
                                </div>

                                {/* Checkbox Aprovisionar artículos */}
                                <div className="flex items-center pt-0.5 pl-[130px]">
                                    <input 
                                        type="checkbox" 
                                        id="aprovisionar"
                                        checked={activeOrder.aprovisionarArticulos} 
                                        disabled
                                        className="h-3 w-3 rounded-none border-gray-400 bg-white"
                                    />
                                    <label htmlFor="aprovisionar" className="ml-2 text-[11px] text-gray-800 select-none">
                                        Aprovisionar artículos no almacenados
                                    </label>
                                </div>
                            </div>

                            {/* RIGHT COLUMN FIELDS */}
                            <div className="space-y-0.5 shrink-0 w-full lg:w-[350px]">
                                {/* Nº */}
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-gray-800 select-none">Nº</span>
                                        <input 
                                            type="text" 
                                            value="OF-Produ" 
                                            readOnly 
                                            className="bg-[#f0ede9] border border-transparent px-1 py-0.5 text-xs text-gray-600 w-[75px] rounded-none select-none outline-none font-medium text-center"
                                        />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={activeOrder.noOrden} 
                                        readOnly 
                                        className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[180px] rounded-none font-semibold text-right focus:outline-none"
                                    />
                                </div>

                                {/* Fecha orden de fabricacion */}
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-[11px] text-gray-800 select-none font-medium">Fecha orden de fabricac</span>
                                    <input 
                                        type="text" 
                                        value={activeOrder.fechaOrden} 
                                        readOnly 
                                        className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[180px] rounded-none text-right focus:outline-none"
                                    />
                                </div>

                                {/* Fecha de inicio */}
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-[11px] text-gray-800 select-none font-medium">Fecha de inicio</span>
                                    <input 
                                        type="text" 
                                        value={activeOrder.fechaInicio} 
                                        readOnly 
                                        className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[180px] rounded-none text-right focus:outline-none"
                                    />
                                </div>

                                {/* Fecha de finalización */}
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-[11px] text-gray-800 select-none font-medium">Fecha de finalización</span>
                                    <input 
                                        type="text" 
                                        value={activeOrder.fechaFinalizacion} 
                                        readOnly 
                                        className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[180px] rounded-none text-right focus:outline-none"
                                    />
                                </div>

                                {/* Usuario */}
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-[11px] text-gray-800 select-none">Usuario</span>
                                    <select 
                                        value={activeOrder.usuario} 
                                        disabled 
                                        className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[180px] rounded-none focus:outline-none disabled:bg-[#fcfdfd]"
                                    >
                                        <option>{activeOrder.usuario}</option>
                                    </select>
                                </div>

                                {/* Origen */}
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-[11px] text-gray-800 select-none">Origen</span>
                                    <input 
                                        type="text" 
                                        value={activeOrder.origen} 
                                        readOnly 
                                        className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[180px] rounded-none focus:outline-none"
                                    />
                                </div>

                                {/* Vinculados a */}
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-[11px] text-gray-800 select-none font-medium">Vinculados a</span>
                                    <select 
                                        value={activeOrder.vinculadoA} 
                                        disabled 
                                        className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[180px] rounded-none focus:outline-none disabled:bg-[#fcfdfd]"
                                    >
                                        <option>{activeOrder.vinculadoA}</option>
                                    </select>
                                </div>

                                {/* Pedido vinculado */}
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center">
                                        <span className="text-[11px] text-gray-800 select-none">Pedido vinculado</span>
                                        <SapLinkArrow />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={activeOrder.pedidoVinculado} 
                                        readOnly 
                                        className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[180px] rounded-none focus:outline-none font-semibold text-right"
                                    />
                                </div>

                                {/* Cliente */}
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center">
                                        <span className="text-[11px] text-gray-800 select-none">Cliente</span>
                                        <SapLinkArrow />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={activeOrder.cliente} 
                                        readOnly 
                                        className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[180px] rounded-none focus:outline-none"
                                    />
                                </div>

                                {/* Centro de Costos */}
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-[11px] text-gray-800 select-none font-medium">Centro de Costos</span>
                                    <input 
                                        type="text" 
                                        value={activeOrder.centroCostos} 
                                        readOnly 
                                        className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[180px] rounded-none focus:outline-none"
                                    />
                                </div>

                                {/* Proyecto */}
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-[11px] text-gray-800 select-none font-medium">Proyecto</span>
                                    <input 
                                        type="text" 
                                        value={activeOrder.proyecto} 
                                        readOnly 
                                        className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[180px] rounded-none focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* TABS CONTAINER */}
                        <div className="mt-2 flex flex-col">
                            {/* TAB HEADERS */}
                            <div className="flex border-b border-[#a3a3a3] gap-[2px] bg-[#e4e1db] pt-1 px-1">
                                <button
                                    onClick={() => setTabActive('componentes')}
                                    className={`px-4 py-1.2 border-t border-x border-transparent font-semibold transition-all rounded-t-sm focus:outline-none select-none text-[11px] -mb-[1px] cursor-pointer ${
                                        tabActive === 'componentes'
                                            ? 'bg-[#f3f0ea] border-[#a3a3a3] text-black z-10'
                                            : 'bg-[#dcd9d2] border-[#c4c1ba] text-gray-600 hover:bg-[#e0ddd6]'
                                    }`}
                                >
                                    Componentes
                                </button>
                                <button
                                    onClick={() => setTabActive('resumen')}
                                    className={`px-4 py-1.2 border-t border-x border-transparent font-semibold transition-all rounded-t-sm focus:outline-none select-none text-[11px] -mb-[1px] cursor-pointer ${
                                        tabActive === 'resumen'
                                            ? 'bg-[#f3f0ea] border-[#a3a3a3] text-black z-10'
                                            : 'bg-[#dcd9d2] border-[#c4c1ba] text-gray-600 hover:bg-[#e0ddd6]'
                                    }`}
                                >
                                    Resumen
                                </button>
                                <button
                                    onClick={() => setTabActive('anexos')}
                                    className={`px-4 py-1.2 border-t border-x border-transparent font-semibold transition-all rounded-t-sm focus:outline-none select-none text-[11px] -mb-[1px] cursor-pointer ${
                                        tabActive === 'anexos'
                                            ? 'bg-[#f3f0ea] border-[#a3a3a3] text-black z-10'
                                            : 'bg-[#dcd9d2] border-[#c4c1ba] text-gray-600 hover:bg-[#e0ddd6]'
                                    }`}
                                >
                                    Anexos
                                </button>
                            </div>

                            {/* TAB BODY CONTENTS */}
                            <div className="border-x border-b border-[#a3a3a3] bg-white p-1 min-h-[220px] flex flex-col justify-between overflow-x-auto shadow-inner">
                                {tabActive === 'componentes' && (
                                    <div className="w-full max-h-[220px] overflow-y-auto overflow-x-auto select-text custom-scrollbar">
                                        <table className="w-full text-left border-collapse text-xs select-text">
                                            <thead>
                                                <tr className="bg-[#eceae6] border-b border-[#c2c0bb] text-[11px]">
                                                    {["#", "Tipo", "Nº", "Descripción", "Cantidad base", "Ratio base", "Ctd.requerida", "Consumido", "Disponible", "U.M.", "Almacén", "M.E."].map((col, index) => (
                                                        <th 
                                                            key={index} 
                                                            className="border-r border-[#d4d4d4] px-2 py-1.5 font-semibold text-gray-700 select-none text-center"
                                                        >
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activeOrder.componentes.map((item, idx) => (
                                                    <tr 
                                                        key={item.id} 
                                                        className={`border-b border-[#e5e5e5] hover:bg-slate-100 ${
                                                            idx % 2 === 0 ? "bg-[#faf9f7]" : "bg-white"
                                                        }`}
                                                    >
                                                        {/* # Row number */}
                                                        <td className="border-r border-[#d4d4d4] px-1 py-1 text-center font-medium text-gray-500 w-8 select-none">
                                                            {item.id}
                                                        </td>
                                                        {/* Tipo */}
                                                        <td className="border-r border-[#d4d4d4] px-2 py-1 text-center w-12 select-none">
                                                            {item.tipo}
                                                        </td>
                                                        {/* Nº (Item Code) */}
                                                        <td className="border-r border-[#d4d4d4] px-2 py-1 whitespace-nowrap font-medium text-blue-900">
                                                            <div className="flex items-center">
                                                                <SapLinkArrow />
                                                                <span className="hover:underline cursor-pointer">{item.no}</span>
                                                            </div>
                                                        </td>
                                                        {/* Descripción */}
                                                        <td className="border-r border-[#d4d4d4] px-2 py-1 truncate max-w-[280px]" title={item.descripcion}>
                                                            {item.descripcion}
                                                        </td>
                                                        {/* Cantidad base */}
                                                        <td className="border-r border-[#d4d4d4] px-2 py-1 text-right w-20">
                                                            {item.cantBase}
                                                        </td>
                                                        {/* Ratio base */}
                                                        <td className="border-r border-[#d4d4d4] px-2 py-1 text-right w-20">
                                                            {item.ratioBase}
                                                        </td>
                                                        {/* Ctd. requerida */}
                                                        <td className="border-r border-[#d4d4d4] px-2 py-1 text-right font-semibold w-24">
                                                            {item.cantRequerida}
                                                        </td>
                                                        {/* Consumido */}
                                                        <td className="border-r border-[#d4d4d4] px-2 py-1 text-right w-20">
                                                            {item.consumido}
                                                        </td>
                                                        {/* Disponible */}
                                                        <td className={`border-r border-[#d4d4d4] px-2 py-1 text-right font-medium w-24 ${
                                                            item.disponible < 0 ? 'text-[#d14747]' : 'text-gray-800'
                                                        }`}>
                                                            {item.disponible.toLocaleString('es-ES')}
                                                        </td>
                                                        {/* Código U.M. */}
                                                        <td className="border-r border-[#d4d4d4] px-2 py-1 text-center w-16">
                                                            {item.unidadMedida}
                                                        </td>
                                                        {/* Almacén */}
                                                        <td className="border-r border-[#d4d4d4] px-2 py-1 text-center w-20">
                                                            <div className="flex items-center justify-center">
                                                                <SapLinkArrow />
                                                                <span>{item.almacen}</span>
                                                            </div>
                                                        </td>
                                                        {/* Método Emisión / M... */}
                                                        <td className="px-2 py-1 text-center w-12">
                                                            {item.metodoEmision}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {tabActive === 'resumen' && (
                                    <div className="p-4 space-y-4 text-gray-800">
                                        <h3 className="text-sm font-semibold border-b border-gray-300 pb-1 text-gray-700">
                                            Resumen de Costos y Recursos
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-[#fcfdfd] border border-gray-300 p-3 shadow-sm space-y-2">
                                                <h4 className="font-semibold text-gray-600">Componentes de Artículo</h4>
                                                <div className="flex justify-between">
                                                    <span>Costo planificado:</span>
                                                    <span className="font-mono font-semibold">${(activeOrder.cantPlanificada * 1450).toLocaleString('es-ES')}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Costo real:</span>
                                                    <span className="font-mono font-semibold">$0</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500 border-t pt-1">
                                                    <span>Desviación:</span>
                                                    <span className="font-mono font-semibold">100%</span>
                                                </div>
                                            </div>

                                            <div className="bg-[#fcfdfd] border border-gray-300 p-3 shadow-sm space-y-2">
                                                <h4 className="font-semibold text-gray-600">Recursos de Mano de Obra</h4>
                                                <div className="flex justify-between">
                                                    <span>Horas planificadas:</span>
                                                    <span className="font-semibold">{(activeOrder.cantPlanificada * 1.5).toFixed(1)} hrs</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Horas reales:</span>
                                                    <span className="font-semibold">0.0 hrs</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500 border-t pt-1">
                                                    <span>Eficiencia:</span>
                                                    <span className="font-mono font-semibold">N/D</span>
                                                </div>
                                            </div>

                                            <div className="bg-[#fcfdfd] border border-gray-300 p-3 shadow-sm space-y-2">
                                                <h4 className="font-semibold text-gray-600">Información del Sistema</h4>
                                                <div className="flex justify-between">
                                                    <span>Última modificación:</span>
                                                    <span>{activeOrder.fechaInicio}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Transacción SAP:</span>
                                                    <span className="font-mono text-xs">PORD_10022</span>
                                                </div>
                                                <div className="flex justify-between border-t pt-1 text-xs">
                                                    <span>Estado de Inventario:</span>
                                                    <span className="text-amber-600 font-semibold">Incompleto</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {tabActive === 'anexos' && (
                                    <div className="p-4 space-y-4">
                                        <div className="flex items-center justify-between border-b border-gray-300 pb-2">
                                            <h3 className="text-sm font-semibold text-gray-700">Archivos Adjuntos (SAP attachments)</h3>
                                            <button className="bg-[#e1e1e1] hover:bg-[#d0d0d0] border border-gray-400 px-3 py-1 font-semibold text-xs text-black cursor-pointer">
                                                Examinar...
                                            </button>
                                        </div>
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-[#eceae6] border-b border-[#c2c0bb]">
                                                    <th className="px-2 py-1.5 font-semibold text-gray-600">#</th>
                                                    <th className="px-2 py-1.5 font-semibold text-gray-600">Ruta de origen del archivo</th>
                                                    <th className="px-2 py-1.5 font-semibold text-gray-600">Fecha del anexo</th>
                                                    <th className="px-2 py-1.5 font-semibold text-gray-600 text-center">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="bg-[#fcfdfd] border-b border-[#e5e5e5]">
                                                    <td className="px-2 py-2 text-gray-500 font-medium">1</td>
                                                    <td className="px-2 py-2 text-blue-800 font-mono hover:underline cursor-pointer">
                                                        \\server-fpk\SAP_Anexos\Planos\{activeOrder.noProducto}_plano.pdf
                                                    </td>
                                                    <td className="px-2 py-2">{activeOrder.fechaOrden}</td>
                                                    <td className="px-2 py-2 text-center">
                                                        <button className="text-blue-600 hover:text-blue-800 font-semibold">Visualizar</button>
                                                    </td>
                                                </tr>
                                                <tr className="bg-white border-b border-[#e5e5e5]">
                                                    <td className="px-2 py-2 text-gray-500 font-medium">2</td>
                                                    <td className="px-2 py-2 text-blue-800 font-mono hover:underline cursor-pointer">
                                                        \\server-fpk\SAP_Anexos\Fichas_Tecnicas\FICHA_RCC_{activeOrder.pedidoVinculado}.xlsx
                                                    </td>
                                                    <td className="px-2 py-2">{activeOrder.fechaOrden}</td>
                                                    <td className="px-2 py-2 text-center">
                                                        <button className="text-blue-600 hover:text-blue-800 font-semibold">Descargar</button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* COMMENTS & PACKAGING AREA */}
                        <div className="flex items-start justify-between w-full mt-1.5">
                            {/* Comentarios */}
                            <div className="flex items-start gap-1">
                                <span className="text-[11px] text-gray-800 select-none w-[75px] shrink-0 pt-1">Comentarios</span>
                                <textarea
                                    value={activeOrder.comentarios}
                                    readOnly
                                    className="bg-white border border-[#b2b2b2] p-1 text-xs text-black w-[250px] h-[50px] rounded-none focus:outline-none resize-none font-sans leading-normal"
                                />
                            </div>

                            {/* Observaciones sobre empaque */}
                            <div className="flex items-start gap-1">
                                <span className="text-[11px] text-gray-800 select-none w-[150px] shrink-0 pt-1 text-right">Observaciones sobre empaque</span>
                                <textarea
                                    value={activeOrder.observacionesEmpaque}
                                    readOnly
                                    className="bg-white border border-[#b2b2b2] p-1 text-xs text-black w-[250px] h-[50px] rounded-none focus:outline-none resize-none font-sans leading-normal"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

