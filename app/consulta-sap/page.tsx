'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/opt-sistemica/Header'
import componentsData from './components_data.json'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { Boxes, FileSpreadsheet, Download, RefreshCw, Copy, Check } from 'lucide-react'

interface ComponentItem {
    id: number;
    tipo: string;
    no: string;
    descripcion: string;
    cantBase: number | string;
    ratioBase: number | string;
    cantRequerida: number | string;
    consumido: number | string;
    disponible: number | string;
    unidadMedida: string;
    almacen: string;
    metodoEmision: string;
    ctaWip?: string;
    dimension1?: string;
    secuenciaRuta?: string;
    docAprovisionamiento?: string;
    permitirDocAprov?: boolean;
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
    cantCompletada?: number;
    cantRechazada?: number;
    fechaCierreReal?: string;
    asientoContable?: string;
    componentes: ComponentItem[];
}

interface SemaforoItem {
    id: number;
    originnum: string;
    nroOp: string;
    sku: string;
    descripcion: string;
    planta: string;
    familia: string;
    tipoOrden: string;
    cantPendiente: string;
    cantPendItem: string;
    cantTotal: string;
}

// Datos del Query Manager SAP: FPK - Semaforo - DJP (Proceso Produccion)
const SEMAFORO_MOCK_DATA: SemaforoItem[] = [
    { id: 1, originnum: "160954", nroOp: "10072539", sku: "VBAN05-0069-000-0437", descripcion: "MUEBLE BASICO PISO LVM 40X30 CON MANIJAS SODER/MALI", planta: "MBL", familia: "MBL", tipoOrden: "STOCK", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "8.00" },
    { id: 2, originnum: "160936", nroOp: "2257438", sku: "VCOC04-0018-B2C-0500", descripcion: "LAVAPLATOS KOA 84X56 GRIS NIEBLA BRILLANTE (CAJA INDIVIDUAL)", planta: "MS", familia: "PC", tipoOrden: "STOCK", cantPendiente: "1.00", cantPendItem: "1.00", cantTotal: "1.00" },
    { id: 3, originnum: "2003500", nroOp: "2257243", sku: "VROP02-0003-000-0300", descripcion: "LAVARROPAS ECO 48X60 NATURAL", planta: "MS", familia: "PA", tipoOrden: "STANDARD", cantPendiente: "0.00", cantPendItem: "10.00", cantTotal: "13.00" },
    { id: 4, originnum: "160512", nroOp: "10071978", sku: "VCOC01-0134-000-0321", descripcion: "MUEBLE INFERIOR COCINA OBSI 150X55CM CANTO 2MM BLANCO CARB2/SODER MALI", planta: "MBL", familia: "MBL", tipoOrden: "STANDARD", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "2.00" },
    { id: 5, originnum: "158421", nroOp: "10070138", sku: "VROP03-0003-000-0100", descripcion: "MUEBLE LVR 60X60 BLANCO CARB2-PUR", planta: "MBL", familia: "MBL", tipoOrden: "STANDARD", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "45.00" },
    { id: 6, originnum: "161110", nroOp: "2257748", sku: "VROP01-0002-000-0100", descripcion: "LAVARROPAS AQUA 48X60 BRILLANTE CON FLAUTA BLANCO", planta: "MS", familia: "PC", tipoOrden: "STOCK", cantPendiente: "3.00", cantPendItem: "3.00", cantTotal: "3.00" },
    { id: 7, originnum: "2003470", nroOp: "2255974", sku: "VBAN01-0039-000-0100", descripcion: "LAVAMANOS SIENA 79X48 BRILLANTE BLANCO", planta: "MS", familia: "PC", tipoOrden: "STANDARD", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "9.00" },
    { id: 8, originnum: "2003474", nroOp: "10071701", sku: "VROP03-0033-000-1379", descripcion: "MUEBLE LVR 40X35 LOTO LISO CARB2", planta: "MBL", familia: "MBL", tipoOrden: "STANDARD", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "11.00" },
    { id: 9, originnum: "2003496", nroOp: "20005990", sku: "VCOC08-3015-000-1342", descripcion: "TABLERO COMPUESTO - PN24 3/436", planta: "CEFI", familia: "PFZ-CEMA", tipoOrden: "STANDARD", cantPendiente: "17.00", cantPendItem: "17.00", cantTotal: "17.00" },
    { id: 10, originnum: "2003496", nroOp: "20005989", sku: "VCOC08-3014-000-1342", descripcion: "TABLERO COMPUESTO - PN14 3/436", planta: "CEFI", familia: "PFZ-CEMA", tipoOrden: "STANDARD", cantPendiente: "14.00", cantPendItem: "14.00", cantTotal: "14.00" },
    { id: 11, originnum: "2003496", nroOp: "20005966", sku: "VCOC08-3110-000-1358", descripcion: "TABLERO COMPUESTO - WSM152514-18MM", planta: "CEFI", familia: "PFZ-CEMA", tipoOrden: "STANDARD", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "8.00" },
    { id: 12, originnum: "160654", nroOp: "10072191", sku: "VCOC01-0138-000-0322", descripcion: "MUEBLE SUPERIOR COCINA AGATA 180X60CM CANTO 2MM BLANCO CARB2/GRACIA SIKUANI", planta: "MBL", familia: "MBL", tipoOrden: "STOCK", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "9.00" },
    { id: 13, originnum: "160854", nroOp: "2257340", sku: "VHPT03-0003-000-0100", descripcion: "HIDROMASAJE NORUEGA ISLA 156 BLANCO-C2-KT-CP-PULSADOR", planta: "FV", familia: "FVH", tipoOrden: "STANDARD", cantPendiente: "0.00", cantPendItem: "5.00", cantTotal: "1.00" },
    { id: 14, originnum: "2003486", nroOp: "20005869", sku: "VCOC08-3239-000-0408", descripcion: "HRJ CC249622 1/2 TK4 1/2 3S-R + DFE - C601 MBL CLOSET 1 PUERTA 3 ENTREPAÑOS BLANCO CARB2", planta: "CEFI", familia: "MBL CEFI", tipoOrden: "STANDARD", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "1.00" },
    { id: 15, originnum: "160501", nroOp: "10072027", sku: "VBAN05-0128-000-0442", descripcion: "MUEBLE POLOCK ELEVADO LVM 48X38 GRACIA/SIKUANI", planta: "MBL", familia: "MBL", tipoOrden: "STANDARD", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "2.00" },
    { id: 16, originnum: "160887", nroOp: "10072513", sku: "VBAN05-0137-000-0437", descripcion: "MUEBLE ELEVADO LVM 44.5X43.5 SIN MANIJAS SODER/MALI", planta: "MBL", familia: "MBL", tipoOrden: "STANDARD", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "1.00" },
    { id: 17, originnum: "159726", nroOp: "10071135", sku: "VBAN05-0137-000-0437", descripcion: "MUEBLE ELEVADO LVM 44.5X43.5 SIN MANIJAS SODER/MALI", planta: "MBL", familia: "MBL", tipoOrden: "STANDARD", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "1.00" },
    { id: 18, originnum: "160704", nroOp: "10072284", sku: "VBAN05-0133-000-0437", descripcion: "MUEBLE VAN GOGH ELEVADO 63X38 SODER/MALI", planta: "MBL", familia: "MBL", tipoOrden: "STANDARD", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "2.00" },
    { id: 19, originnum: "160418", nroOp: "2256648", sku: "VBAN01-0056-000-0100", descripcion: "LAVAMANOS OSLO 48X38 BRILLANTE BLANCO", planta: "MS", familia: "PC", tipoOrden: "STOCK", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "15.00" },
    { id: 20, originnum: "160700", nroOp: "10072280", sku: "VBAN05-0072-000-0439", descripcion: "MUEBLE RAYO 48X38 MITTE/TAMBO", planta: "MBL", familia: "MBL", tipoOrden: "STOCK", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "13.00" },
    { id: 21, originnum: "160026", nroOp: "10071461", sku: "VBAN05-0125-000-0437", descripcion: "MUEBLE DA VINCI PISO LVM 48X43 SODER/MALI", planta: "MBL", familia: "MBL", tipoOrden: "STANDARD", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "4.00" },
    { id: 22, originnum: "159915", nroOp: "10071365", sku: "VBAN05-0127-000-0439", descripcion: "MUEBLE MACAO LIFE LVM 48X43 CANTO 2MM FULL EXTENSION MITTE/TAMBO", planta: "MBL", familia: "MBL", tipoOrden: "STANDARD", cantPendiente: "0.00", cantPendItem: "-", cantTotal: "5.00" }
];

// Orden del pantallazo exacto de SAP
const order2257338: OrderData = {
    tipo: "Estándar",
    estado: "Liberado",
    noProducto: "VHPT03-0003-000-0100",
    descripcionProducto: "HIDROMASAJE NORUEGA ISLA 156 BLANCO-C2-KT-0100",
    cantPlanificada: 3,
    nombreUN: "UN",
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
    comentarios: "",
    observacionesEmpaque: "",
    cantCompletada: 0,
    cantRechazada: 0,
    fechaCierreReal: "",
    asientoContable: "",
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

    const componentPool = componentsData as ComponentItem[];

    return {
        tipo: "Estándar",
        estado: orderState,
        noProducto: prodInfo.code,
        descripcionProducto: prodInfo.desc,
        cantPlanificada: cantPlan,
        nombreUN: "UN",
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
        comentarios: "",
        observacionesEmpaque: "",
        cantCompletada: 0,
        cantRechazada: 0,
        fechaCierreReal: "",
        asientoContable: "",
        componentes: componentPool
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

    // SubHeader Tabs: Consulta Ordenes vs Query - Semáforo
    const [subHeaderTab, setSubHeaderTab] = useState<'consulta-ordenes' | 'query-semaforo'>('consulta-ordenes')

    // Estados de búsqueda e interfaz SAP (Consulta Ordenes)
    const [searchQuery, setSearchQuery] = useState("2257338")
    const [activeOrder, setActiveOrder] = useState<OrderData>(order2257338)
    const [tabActive, setTabActive] = useState<'componentes' | 'resumen' | 'anexos'>('componentes')
    const [currentTime, setCurrentTime] = useState("")

    // Estado para ordenamiento de tabla Componentes
    const [compSortCol, setCompSortCol] = useState<keyof ComponentItem | null>(null)
    const [compSortDir, setCompSortDir] = useState<'asc' | 'desc'>('asc')

    // Anchos redimensionables para tabla Componentes
    const [compColWidths, setCompColWidths] = useState<Record<string, number>>({
        id: 45,
        tipo: 70,
        no: 190,
        descripcion: 340,
        cantBase: 100,
        ratioBase: 90,
        cantRequerida: 110,
        consumido: 90,
        disponible: 110,
        unidadMedida: 170,
        almacen: 90,
        metodoEmision: 120,
        ctaWip: 90,
        dimension1: 100,
        secuenciaRuta: 120,
        docAprovisionamiento: 190,
        permitirDocAprov: 210
    });

    // Anchos redimensionables para tabla Query - Semáforo
    const [semaforoColWidths, setSemaforoColWidths] = useState<Record<string, number>>({
        id: 45,
        originnum: 100,
        nroOp: 110,
        sku: 190,
        descripcion: 350,
        planta: 75,
        familia: 85,
        tipoOrden: 110,
        cantPendiente: 110,
        cantPendItem: 110,
        cantTotal: 110
    });

    // Estados para pestaña Query - Semáforo
    const [semaforoFilter, setSemaforoFilter] = useState("")
    const [isExecuting, setIsExecuting] = useState(false)
    const [copiedData, setCopiedData] = useState(false)

    // Estado para ordenamiento de tabla Query - Semáforo
    const [semaforoSortCol, setSemaforoSortCol] = useState<keyof SemaforoItem | null>(null)
    const [semaforoSortDir, setSemaforoSortDir] = useState<'asc' | 'desc'>('asc')

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

    const fetchOrderFromSAP = async (orderNum: string) => {
        const loadingId = toast.loading(`Consultando orden ${orderNum} en SAP...`);
        try {
            const res = await fetch(`/api/sap/production-orders/${orderNum}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.error || "Orden no encontrada en SAP", { id: loadingId });
                return;
            }
            const data = await res.json();
            setActiveOrder(data);
            setCompSortCol(null);
            toast.success(`Orden ${orderNum} cargada correctamente`, { id: loadingId });
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión con SAP", { id: loadingId });
        }
    }

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (searchQuery.trim() === "") return
        fetchOrderFromSAP(searchQuery.trim());
    }

    useEffect(() => {
        // Cargar orden inicial al montar el componente
        fetchOrderFromSAP(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Lógica para arrastrar y redimensionar ancho de columnas (Tabla Componentes)
    const handleCompResizeStart = (colKey: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const startWidth = compColWidths[colKey] || 100;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.max(35, startWidth + deltaX);
            setCompColWidths(prev => ({
                ...prev,
                [colKey]: newWidth
            }));
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Lógica para arrastrar y redimensionar ancho de columnas (Tabla Semáforo)
    const handleSemaforoResizeStart = (colKey: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const startWidth = semaforoColWidths[colKey] || 100;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.max(35, startWidth + deltaX);
            setSemaforoColWidths(prev => ({
                ...prev,
                [colKey]: newWidth
            }));
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Manejo de ordenamiento de Componentes
    const handleCompSort = (col: keyof ComponentItem) => {
        if (compSortCol === col) {
            setCompSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setCompSortCol(col);
            setCompSortDir('asc');
        }
    };

    const sortedComponentes = [...activeOrder.componentes].sort((a, b) => {
        if (!compSortCol) return 0;
        const valA = a[compSortCol];
        const valB = b[compSortCol];
        if (valA === valB) return 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
            return compSortDir === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();
        return compSortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    // Manejo de ordenamiento de Semáforo
    const handleSemaforoSort = (col: keyof SemaforoItem) => {
        if (semaforoSortCol === col) {
            setSemaforoSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSemaforoSortCol(col);
            setSemaforoSortDir('asc');
        }
    };

    // Filtrar los datos de Semáforo
    const filteredSemaforoData = SEMAFORO_MOCK_DATA.filter(item => {
        if (!semaforoFilter.trim()) return true;
        const q = semaforoFilter.toLowerCase();
        return (
            item.originnum.toLowerCase().includes(q) ||
            item.nroOp.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q) ||
            item.descripcion.toLowerCase().includes(q) ||
            item.planta.toLowerCase().includes(q) ||
            item.familia.toLowerCase().includes(q) ||
            item.tipoOrden.toLowerCase().includes(q)
        );
    });

    const sortedSemaforoData = [...filteredSemaforoData].sort((a, b) => {
        if (!semaforoSortCol) return 0;
        const valA = a[semaforoSortCol];
        const valB = b[semaforoSortCol];
        if (valA === valB) return 0;

        const numA = parseFloat(String(valA).replace(',', '.'));
        const numB = parseFloat(String(valB).replace(',', '.'));
        if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'number' && typeof valB !== 'number' && !String(valA).includes('-') && !String(valB).includes('-')) {
            return semaforoSortDir === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return semaforoSortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    // Exportar Query a Excel
    const handleExportExcel = () => {
        try {
            const exportRows = sortedSemaforoData.map(item => ({
                "#": item.id,
                "Originnum": item.originnum,
                "Nro OP": item.nroOp,
                "SKU": item.sku,
                "Descripción Artículo": item.descripcion,
                "Planta": item.planta,
                "Familia": item.familia,
                "Tipo Orden": item.tipoOrden,
                "Cant. Pendiente": item.cantPendiente,
                "Cant. Pend. Item": item.cantPendItem,
                "Cantidad total": item.cantTotal
            }));

            const ws = XLSX.utils.json_to_sheet(exportRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "FPK - Semaforo");
            XLSX.writeFile(wb, "FPK_Semaforo_DJP.xlsx");
            toast.success("Query FPK-Semaforo descargado a Excel exitosamente");
        } catch (err) {
            console.error(err);
            toast.error("Error al generar el archivo Excel");
        }
    };

    // Simular Re-ejecución del Query SAP
    const handleExecuteQuery = () => {
        setIsExecuting(true);
        setTimeout(() => {
            setIsExecuting(false);
            toast.success("Query ejecutado correctamente desde SAP");
        }, 600);
    };

    // Copiar tabla al portapapeles
    const handleCopyData = () => {
        const headerText = "#\tOriginnum\tNro OP\tSKU\tDescripción Artículo\tPlanta\tFamilia\tTipo Orden\tCant. Pendiente\tCant. Pend. Item\tCantidad total\n";
        const rowsText = sortedSemaforoData.map(item => 
            `${item.id}\t${item.originnum}\t${item.nroOp}\t${item.sku}\t${item.descripcion}\t${item.planta}\t${item.familia}\t${item.tipoOrden}\t${item.cantPendiente}\t${item.cantPendItem}\t${item.cantTotal}`
        ).join('\n');
        
        navigator.clipboard.writeText(headerText + rowsText);
        setCopiedData(true);
        toast.success("Datos copiados al portapapeles");
        setTimeout(() => setCopiedData(false), 2000);
    };

    const renderSortIcon = (currentCol: string, activeCol: string | null, dir: 'asc' | 'desc') => {
        if (activeCol !== currentCol) return <span className="text-gray-400 opacity-30 ml-1 text-[10px]">↕</span>;
        return <span className="text-amber-600 font-bold ml-1 text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span>;
    };

    // Componente visual para la línea divisoria vertical redimensionable
    const ResizerHandle = ({ colKey, onResize }: { colKey: string; onResize: (colKey: string, e: React.MouseEvent) => void }) => (
        <div
            onMouseDown={(e) => onResize(colKey, e)}
            onClick={(e) => e.stopPropagation()}
            className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center z-20 group"
            title="Haga clic y arrastre para redimensionar columna"
        >
            <div className="w-[2px] h-full opacity-0 group-hover:opacity-100 group-active:opacity-100 bg-amber-500 transition-opacity" />
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-[#324354] flex items-center justify-center">
                <div className="text-white text-xl">Cargando...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000] pb-12 select-none">
            <Header
                title="Consulta SAP"
                subtitle="Módulo de Consulta"
                userEmail={user?.email}
                showLogout={true}
                onLogout={handleLogout}
            />

            {/* SUBHEADER BAR FIXED WITH TABS */}
            <div className="bg-white border-b border-[#e2ded5] py-1.5 px-3 shadow-sm relative z-30 w-full font-sans sticky top-0">
                <div className="max-w-7xl mx-auto flex flex-row flex-nowrap gap-2 justify-center overflow-x-auto scrollbar-hide py-0.5">
                    <button
                        onClick={() => setSubHeaderTab('consulta-ordenes')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap ${
                            subHeaderTab === 'consulta-ordenes'
                                ? 'bg-[#324354] text-white shadow-md'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                        <Boxes size={16} />
                        <span>Consulta Ordenes</span>
                    </button>

                    <button
                        onClick={() => setSubHeaderTab('query-semaforo')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap ${
                            subHeaderTab === 'query-semaforo'
                                ? 'bg-[#324354] text-white shadow-md'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                        <FileSpreadsheet size={16} />
                        <span>Query - Semáforo</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {subHeaderTab === 'consulta-ordenes' ? (
                /* TAB 1: CONSULTA ORDENES (VISTA ORIGINAL DE ORDEN DE FABRICACION SAP) */
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
                            
                            {/* Search container */}
                            <div>
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
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[150px] rounded-none focus:outline-none disabled:bg-[#fcfdfd] font-semibold text-emerald-800"
                                        >
                                            <option>Liberado</option>
                                            <option>Planificado</option>
                                            <option>Cerrado</option>
                                        </select>
                                    </div>

                                    {/* Nº producto */}
                                    <div className="flex items-center">
                                        <span className="w-[130px] shrink-0 text-[11px] text-gray-800 select-none flex items-center">
                                            Nº producto <SapLinkArrow />
                                        </span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.noProducto} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs font-mono font-bold text-black w-[200px] rounded-none focus:outline-none select-text" 
                                        />
                                    </div>

                                    {/* Descripción producto */}
                                    <div className="flex items-center">
                                        <span className="w-[130px] shrink-0 text-[11px] text-gray-800 select-none">Descripción producto</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.descripcionProducto} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[450px] rounded-none focus:outline-none select-text truncate font-medium" 
                                        />
                                    </div>

                                    {/* Cantidad planificada y Nombre de */}
                                    <div className="flex items-center">
                                        <span className="w-[130px] shrink-0 text-[11px] text-gray-800 select-none">Cantidad planificada</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.cantPlanificada} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs font-semibold text-black w-[60px] text-right rounded-none focus:outline-none select-text" 
                                        />
                                        <span className="ml-3 text-[11px] text-gray-800 select-none mr-1">Nombre de</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.nombreUN} 
                                            readOnly 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[150px] rounded-none focus:outline-none" 
                                        />
                                    </div>

                                    {/* Almacén */}
                                    <div className="flex items-center">
                                        <span className="w-[130px] shrink-0 text-[11px] text-gray-800 select-none flex items-center">
                                            Almacén <SapLinkArrow />
                                        </span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.almacen} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[100px] rounded-none focus:outline-none font-bold" 
                                        />
                                    </div>

                                    {/* Socio de negocio */}
                                    <div className="flex items-center">
                                        <span className="w-[130px] shrink-0 text-[11px] text-gray-800 select-none">Socio de negocio</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.socioNegocio} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[200px] rounded-none focus:outline-none font-mono" 
                                        />
                                    </div>

                                    {/* Cálculo de fecha enr. */}
                                    <div className="flex items-center">
                                        <span className="w-[130px] shrink-0 text-[11px] text-gray-800 select-none">Cálculo de fecha enr.</span>
                                        <select 
                                            value={activeOrder.metodoEnrutamiento} 
                                            disabled 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[150px] rounded-none focus:outline-none disabled:bg-[#fcfdfd]"
                                        >
                                            <option>En Fecha de inicio</option>
                                            <option>En Fecha de finalización</option>
                                        </select>
                                    </div>

                                    {/* Aprovisionar artículos */}
                                    <div className="flex items-center pt-0.5">
                                        <input 
                                            type="checkbox" 
                                            checked={activeOrder.aprovisionarArticulos} 
                                            disabled 
                                            className="w-3.5 h-3.5 border-[#b2b2b2] rounded-none text-amber-600 focus:ring-0 mr-2" 
                                        />
                                        <span className="text-[11px] text-gray-800 select-none">Aprovisionar artículos no almacenados</span>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN FIELDS */}
                                <div className="space-y-0.5 shrink-0">
                                    {/* Nº OF-Produ */}
                                    <div className="flex items-center justify-end">
                                        <span className="w-[140px] text-[11px] text-gray-800 text-right mr-2 select-none">Nº OF-Produ</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.noOrden} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs font-bold text-black w-[150px] text-right rounded-none focus:outline-none select-text" 
                                        />
                                    </div>

                                    {/* Fecha orden de fabricac */}
                                    <div className="flex items-center justify-end">
                                        <span className="w-[140px] text-[11px] text-gray-800 text-right mr-2 select-none">Fecha orden de fabricac</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.fechaOrden} 
                                            readOnly 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[150px] text-right rounded-none focus:outline-none" 
                                        />
                                    </div>

                                    {/* Fecha de inicio */}
                                    <div className="flex items-center justify-end">
                                        <span className="w-[140px] text-[11px] text-gray-800 text-right mr-2 select-none">Fecha de inicio</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.fechaInicio} 
                                            readOnly 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[150px] text-right rounded-none focus:outline-none" 
                                        />
                                    </div>

                                    {/* Fecha de finalización */}
                                    <div className="flex items-center justify-end">
                                        <span className="w-[140px] text-[11px] text-gray-800 text-right mr-2 select-none">Fecha de finalización</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.fechaFinalizacion} 
                                            readOnly 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[150px] text-right rounded-none focus:outline-none" 
                                        />
                                    </div>

                                    {/* Usuario */}
                                    <div className="flex items-center justify-end">
                                        <span className="w-[140px] text-[11px] text-gray-800 text-right mr-2 select-none">Usuario</span>
                                        <select 
                                            value={activeOrder.usuario} 
                                            disabled 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[150px] rounded-none focus:outline-none disabled:bg-[#fcfdfd]"
                                        >
                                            <option>{activeOrder.usuario}</option>
                                        </select>
                                    </div>

                                    {/* Origen */}
                                    <div className="flex items-center justify-end">
                                        <span className="w-[140px] text-[11px] text-gray-800 text-right mr-2 select-none">Origen</span>
                                        <select 
                                            value={activeOrder.origen} 
                                            disabled 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[150px] rounded-none focus:outline-none disabled:bg-[#fcfdfd]"
                                        >
                                            <option>Pedido de cliente</option>
                                            <option>Manual</option>
                                        </select>
                                    </div>

                                    {/* Vinculados a */}
                                    <div className="flex items-center justify-end">
                                        <span className="w-[140px] text-[11px] text-gray-800 text-right mr-2 select-none">Vinculados a</span>
                                        <select 
                                            value={activeOrder.vinculadoA} 
                                            disabled 
                                            className="bg-[#fcfdfd] border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[150px] rounded-none focus:outline-none disabled:bg-[#fcfdfd]"
                                        >
                                            <option>Pedido de cliente</option>
                                        </select>
                                    </div>

                                    {/* Pedido vinculado */}
                                    <div className="flex items-center justify-end">
                                        <span className="w-[140px] text-[11px] text-gray-800 text-right mr-2 select-none flex items-center justify-end">
                                            Pedido vinculado <SapLinkArrow />
                                        </span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.pedidoVinculado} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs font-mono font-bold text-black w-[150px] text-right rounded-none focus:outline-none select-text" 
                                        />
                                    </div>

                                    {/* Cliente */}
                                    <div className="flex items-center justify-end">
                                        <span className="w-[140px] text-[11px] text-gray-800 text-right mr-2 select-none flex items-center justify-end">
                                            Cliente <SapLinkArrow />
                                        </span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.cliente} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs font-mono text-black w-[150px] text-right rounded-none focus:outline-none select-text" 
                                        />
                                    </div>

                                    {/* Centro de Costos */}
                                    <div className="flex items-center justify-end">
                                        <span className="w-[140px] text-[11px] text-gray-800 text-right mr-2 select-none">Centro de Costos</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.centroCostos} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[150px] text-right rounded-none focus:outline-none select-text" 
                                        />
                                    </div>

                                    {/* Proyecto */}
                                    <div className="flex items-center justify-end">
                                        <span className="w-[140px] text-[11px] text-gray-800 text-right mr-2 select-none">Proyecto</span>
                                        <input 
                                            type="text" 
                                            value={activeOrder.proyecto} 
                                            readOnly 
                                            className="bg-white border border-[#b2b2b2] px-1 py-0.5 text-xs text-black w-[150px] text-right rounded-none focus:outline-none select-text" 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* TABS COMPONENTES / RESUMEN / ANEXOS */}
                            <div className="mt-2 flex flex-col">
                                <div className="flex border-b border-[#a3a3a3] gap-1 pl-1">
                                    <button 
                                        onClick={() => setTabActive('componentes')}
                                        className={`px-4 py-1 text-xs font-semibold rounded-t-sm border-t border-l border-r transition-colors select-none ${
                                            tabActive === 'componentes' 
                                                ? 'bg-white border-[#a3a3a3] border-b-white text-black -mb-[1px] z-10 font-bold' 
                                                : 'bg-[#dedbd5] border-[#c0beb9] text-gray-700 hover:bg-[#e6e3dd]'
                                        }`}
                                    >
                                        Componentes ({activeOrder.componentes.length})
                                    </button>
                                    <button 
                                        onClick={() => setTabActive('resumen')}
                                        className={`px-4 py-1 text-xs font-semibold rounded-t-sm border-t border-l border-r transition-colors select-none ${
                                            tabActive === 'resumen' 
                                                ? 'bg-white border-[#a3a3a3] border-b-white text-black -mb-[1px] z-10 font-bold' 
                                                : 'bg-[#dedbd5] border-[#c0beb9] text-gray-700 hover:bg-[#e6e3dd]'
                                        }`}
                                    >
                                        Resumen
                                    </button>
                                    <button 
                                        onClick={() => setTabActive('anexos')}
                                        className={`px-4 py-1 text-xs font-semibold rounded-t-sm border-t border-l border-r transition-colors select-none ${
                                            tabActive === 'anexos' 
                                                ? 'bg-white border-[#a3a3a3] border-b-white text-black -mb-[1px] z-10 font-bold' 
                                                : 'bg-[#dedbd5] border-[#c0beb9] text-gray-700 hover:bg-[#e6e3dd]'
                                        }`}
                                    >
                                        Anexos
                                    </button>
                                </div>

                                {/* TAB CONTENT CONTAINER WITH RESIZABLE COLUMNS */}
                                <div className="bg-white border-x border-b border-[#a3a3a3] shadow-inner min-h-[350px] overflow-hidden">
                                    
                                    {tabActive === 'componentes' && (
                                        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                                            <table className="border-collapse text-[11px] font-sans table-fixed w-max">
                                                <thead className="sticky top-0 bg-[#eceae6] border-b border-[#c2c0bb] shadow-sm select-none z-10">
                                                    <tr className="text-gray-700 font-semibold">
                                                        {/* # */}
                                                        <th 
                                                            style={{ width: `${compColWidths.id}px` }}
                                                            onClick={() => handleCompSort('id')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-center cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-center">
                                                                <span>#</span>
                                                                {renderSortIcon('id', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="id" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Tipo */}
                                                        <th 
                                                            style={{ width: `${compColWidths.tipo}px` }}
                                                            onClick={() => handleCompSort('tipo')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-center cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-center">
                                                                <span>Tipo</span>
                                                                {renderSortIcon('tipo', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="tipo" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Nº */}
                                                        <th 
                                                            style={{ width: `${compColWidths.no}px` }}
                                                            onClick={() => handleCompSort('no')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-left cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-start overflow-hidden">
                                                                <span className="truncate">Nº</span>
                                                                {renderSortIcon('no', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="no" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Descripción */}
                                                        <th 
                                                            style={{ width: `${compColWidths.descripcion}px` }}
                                                            onClick={() => handleCompSort('descripcion')} 
                                                            className="relative px-2 py-1 border-r border-[#c2c0bb] text-left cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-start overflow-hidden">
                                                                <span className="truncate">Descripción</span>
                                                                {renderSortIcon('descripcion', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="descripcion" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Cantidad base */}
                                                        <th 
                                                            style={{ width: `${compColWidths.cantBase}px` }}
                                                            onClick={() => handleCompSort('cantBase')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-right cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-end overflow-hidden">
                                                                <span className="truncate">Cantidad base</span>
                                                                {renderSortIcon('cantBase', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="cantBase" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Ratio base */}
                                                        <th 
                                                            style={{ width: `${compColWidths.ratioBase}px` }}
                                                            onClick={() => handleCompSort('ratioBase')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-right cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-end overflow-hidden">
                                                                <span className="truncate">Ratio base</span>
                                                                {renderSortIcon('ratioBase', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="ratioBase" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Ctd.requerida */}
                                                        <th 
                                                            style={{ width: `${compColWidths.cantRequerida}px` }}
                                                            onClick={() => handleCompSort('cantRequerida')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-right font-bold text-black cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-end overflow-hidden">
                                                                <span className="truncate">Ctd.requerida</span>
                                                                {renderSortIcon('cantRequerida', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="cantRequerida" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Consumido */}
                                                        <th 
                                                            style={{ width: `${compColWidths.consumido}px` }}
                                                            onClick={() => handleCompSort('consumido')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-right cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-end overflow-hidden">
                                                                <span className="truncate">Consumido</span>
                                                                {renderSortIcon('consumido', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="consumido" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Disponible */}
                                                        <th 
                                                            style={{ width: `${compColWidths.disponible}px` }}
                                                            onClick={() => handleCompSort('disponible')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-right font-bold cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-end overflow-hidden">
                                                                <span className="truncate">Disponible</span>
                                                                {renderSortIcon('disponible', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="disponible" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Código de unidad de medida */}
                                                        <th 
                                                            style={{ width: `${compColWidths.unidadMedida}px` }}
                                                            onClick={() => handleCompSort('unidadMedida')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-left cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-start overflow-hidden">
                                                                <span className="truncate">Código de unidad de medida</span>
                                                                {renderSortIcon('unidadMedida', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="unidadMedida" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Almacén */}
                                                        <th 
                                                            style={{ width: `${compColWidths.almacen}px` }}
                                                            onClick={() => handleCompSort('almacen')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-center cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-center overflow-hidden">
                                                                <span className="truncate">Almacén</span>
                                                                {renderSortIcon('almacen', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="almacen" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Método emisión */}
                                                        <th 
                                                            style={{ width: `${compColWidths.metodoEmision}px` }}
                                                            onClick={() => handleCompSort('metodoEmision')} 
                                                            className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-left cursor-pointer hover:bg-[#dedbd5]"
                                                        >
                                                            <div className="flex items-center justify-start overflow-hidden">
                                                                <span className="truncate">Método emisión</span>
                                                                {renderSortIcon('metodoEmision', compSortCol, compSortDir)}
                                                            </div>
                                                            <ResizerHandle colKey="metodoEmision" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Cta.WIP */}
                                                        <th style={{ width: `${compColWidths.ctaWip}px` }} className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-left overflow-hidden">
                                                            <span className="truncate">Cta.WIP</span>
                                                            <ResizerHandle colKey="ctaWip" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Dimensión 1 */}
                                                        <th style={{ width: `${compColWidths.dimension1}px` }} className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-center overflow-hidden">
                                                            <span className="truncate">Dimensión 1</span>
                                                            <ResizerHandle colKey="dimension1" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Secuencia de ruta */}
                                                        <th style={{ width: `${compColWidths.secuenciaRuta}px` }} className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-left overflow-hidden">
                                                            <span className="truncate">Secuencia de ruta</span>
                                                            <ResizerHandle colKey="secuenciaRuta" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Documento de aprovisionamiento */}
                                                        <th style={{ width: `${compColWidths.docAprovisionamiento}px` }} className="relative px-1.5 py-1 border-r border-[#c2c0bb] text-left overflow-hidden">
                                                            <span className="truncate">Documento de aprovisionamiento</span>
                                                            <ResizerHandle colKey="docAprovisionamiento" onResize={handleCompResizeStart} />
                                                        </th>

                                                        {/* Permitir doc.de aprovisionamiento */}
                                                        <th style={{ width: `${compColWidths.permitirDocAprov}px` }} className="relative px-1.5 py-1 text-center overflow-hidden">
                                                            <span className="truncate">Permitir doc.de aprovisionamiento</span>
                                                            <ResizerHandle colKey="permitirDocAprov" onResize={handleCompResizeStart} />
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#e5e5e5] bg-white">
                                                    {sortedComponentes.map((item) => (
                                                        <tr key={item.id} className="hover:bg-[#f2f7ff] transition-colors select-text">
                                                            <td style={{ width: `${compColWidths.id}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-center text-gray-500 select-none font-mono overflow-hidden">
                                                                {item.id}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.tipo}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-center text-gray-700 overflow-hidden truncate">
                                                                {item.tipo}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.no}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] font-mono text-black whitespace-nowrap overflow-hidden">
                                                                <span className="flex items-center">
                                                                    <SapLinkArrow />
                                                                    <span className="truncate">{item.no}</span>
                                                                </span>
                                                            </td>
                                                            <td style={{ width: `${compColWidths.descripcion}px` }} className="px-2 py-0.5 border-r border-[#e5e5e5] text-black font-medium truncate overflow-hidden" title={item.descripcion}>
                                                                {item.descripcion}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.cantBase}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-right text-gray-800 font-mono overflow-hidden truncate">
                                                                {item.cantBase}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.ratioBase}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-right text-gray-800 font-mono overflow-hidden truncate">
                                                                {item.ratioBase}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.cantRequerida}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-right font-bold font-mono text-black overflow-hidden truncate">
                                                                {typeof item.cantRequerida === 'number' ? item.cantRequerida.toLocaleString('es-CO') : item.cantRequerida}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.consumido}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-right text-gray-600 font-mono overflow-hidden truncate">
                                                                {item.consumido}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.disponible}px` }} className={`px-1.5 py-0.5 border-r border-[#e5e5e5] text-right font-mono font-bold overflow-hidden truncate ${
                                                                String(item.disponible).startsWith('-') ? 'text-[#d14747]' : 'text-black'
                                                            }`}>
                                                                {item.disponible}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.unidadMedida}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-left text-gray-700 overflow-hidden truncate">
                                                                {item.unidadMedida}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.almacen}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-center text-black font-mono whitespace-nowrap overflow-hidden">
                                                                <span className="flex items-center justify-center">
                                                                    <SapLinkArrow />
                                                                    <span>{item.almacen}</span>
                                                                </span>
                                                            </td>
                                                            <td style={{ width: `${compColWidths.metodoEmision}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-left text-gray-700 overflow-hidden truncate">
                                                                {item.metodoEmision}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.ctaWip}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-left text-gray-600 font-mono overflow-hidden truncate">
                                                                {item.ctaWip || ""}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.dimension1}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-center text-gray-700 font-mono overflow-hidden truncate">
                                                                {item.dimension1 || "0"}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.secuenciaRuta}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-left text-gray-600 overflow-hidden truncate">
                                                                {item.secuenciaRuta || ""}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.docAprovisionamiento}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-left text-gray-600 overflow-hidden truncate">
                                                                {item.docAprovisionamiento || ""}
                                                            </td>
                                                            <td style={{ width: `${compColWidths.permitirDocAprov}px` }} className="px-1.5 py-0.5 text-center overflow-hidden">
                                                                <input type="checkbox" checked={item.permitirDocAprov || false} disabled className="w-3.5 h-3.5 border-[#b2b2b2] rounded-none text-amber-600 focus:ring-0" />
                                                            </td>
                                                        </tr>
                                                    ))}

                                                    {/* FILA 85 DE CIERRE VACÍA DE SAP */}
                                                    <tr className="bg-white h-6 hover:bg-[#f2f7ff] transition-colors select-text">
                                                        <td style={{ width: `${compColWidths.id}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-center text-gray-500 font-mono">85</td>
                                                        <td style={{ width: `${compColWidths.tipo}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.no}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.descripcion}px` }} className="px-2 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.cantBase}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.ratioBase}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.cantRequerida}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-right font-mono">0</td>
                                                        <td style={{ width: `${compColWidths.consumido}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-right font-mono">0</td>
                                                        <td style={{ width: `${compColWidths.disponible}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-right font-mono font-bold">0</td>
                                                        <td style={{ width: `${compColWidths.unidadMedida}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.almacen}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.metodoEmision}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.ctaWip}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.dimension1}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-center font-mono">0</td>
                                                        <td style={{ width: `${compColWidths.secuenciaRuta}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5] text-center font-mono">0</td>
                                                        <td style={{ width: `${compColWidths.docAprovisionamiento}px` }} className="px-1.5 py-0.5 border-r border-[#e5e5e5]"></td>
                                                        <td style={{ width: `${compColWidths.permitirDocAprov}px` }} className="px-1.5 py-0.5 text-center">
                                                            <input type="checkbox" disabled className="w-3.5 h-3.5 border-[#b2b2b2] rounded-none text-amber-600 focus:ring-0" />
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {tabActive === 'resumen' && (
                                        <div className="p-3.5 bg-[#fcfdfd] text-xs font-sans text-black min-h-[320px]">
                                            <div className="flex flex-wrap lg:flex-nowrap justify-between gap-8 items-start max-w-6xl">
                                                
                                                {/* SECCIÓN 1: COSTOS */}
                                                <div className="space-y-1.5 w-[340px] shrink-0">
                                                    <h4 className="font-semibold text-gray-800 border-b border-gray-300 pb-0.5 mb-2 text-xs">Costos</h4>
                                                    
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px]">Costo de componente real-SAL</span>
                                                        <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[140px] text-right text-xs rounded-none focus:outline-none" />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px]">Costo de componente de recurso real</span>
                                                        <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[140px] text-right text-xs rounded-none focus:outline-none" />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px] font-bold">Costo adicional real MO+CIF</span>
                                                        <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[140px] text-right text-xs rounded-none focus:outline-none" />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px] font-bold">Costo de producto real+VALE P</span>
                                                        <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[140px] text-right text-xs rounded-none focus:outline-none" />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px]">Coste real de subproductos</span>
                                                        <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[140px] text-right text-xs rounded-none focus:outline-none" />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px]">Desviación total</span>
                                                        <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[140px] text-right text-xs rounded-none focus:outline-none" />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px]">Asiento contable</span>
                                                        <input 
                                                            type="text" 
                                                            value={activeOrder.asientoContable || ""} 
                                                            readOnly 
                                                            className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[210px] text-xs text-black rounded-none focus:outline-none truncate" 
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-800 text-[11px]">Documento de referencia</span>
                                                        <div className="w-[140px] flex justify-center">
                                                            <button className="bg-gradient-to-b from-[#f5eee0] to-[#ded6c3] hover:from-[#ebdcc5] hover:to-[#cebe9f] border border-[#a3987e] px-3 py-0.5 text-xs text-black cursor-pointer font-bold rounded-none shadow-xs flex items-center justify-center h-[20px]">
                                                                ...
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* SECCIÓN 2: CANTIDADES Y FECHAS */}
                                                <div className="space-y-4 w-[280px] shrink-0">
                                                    {/* CANTIDADES */}
                                                    <div className="space-y-1.5">
                                                        <h4 className="font-semibold text-gray-800 border-b border-gray-300 pb-0.5 mb-2 text-xs">Cantidades</h4>
                                                        
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Cantidad planificada</span>
                                                            <input type="text" value={activeOrder.cantPlanificada} readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none font-semibold" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Cantidad completada</span>
                                                            <input type="text" value={activeOrder.cantCompletada ?? ""} readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Cantidad rechazada</span>
                                                            <input type="text" value={activeOrder.cantRechazada ?? ""} readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>
                                                    </div>

                                                    {/* FECHAS */}
                                                    <div className="space-y-1.5 pt-2">
                                                        <h4 className="font-semibold text-gray-800 border-b border-gray-300 pb-0.5 mb-2 text-xs">Fechas</h4>
                                                        
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Fecha de finalización</span>
                                                            <input type="text" value={activeOrder.fechaFinalizacion} readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-center text-xs rounded-none focus:outline-none" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Fecha de cierre real</span>
                                                            <input type="text" value={activeOrder.fechaCierreReal || ""} readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-center text-xs rounded-none focus:outline-none" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Vencido</span>
                                                            <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-center text-xs rounded-none focus:outline-none" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* SECCIÓN 3: TIEMPOS PLANIFICADOS Y DÍAS PLANIFICADOS */}
                                                <div className="space-y-4 w-[280px] shrink-0">
                                                    {/* TIEMPOS PLANIFICADOS */}
                                                    <div className="space-y-1.5">
                                                        <h4 className="font-semibold text-gray-800 border-b border-gray-300 pb-0.5 mb-2 text-xs">Tiempos planificados</h4>
                                                        
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Tiempo de producción total</span>
                                                            <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Tiempo adicional total</span>
                                                            <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Tiempo de ejecución total</span>
                                                            <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>
                                                    </div>

                                                    {/* DÍAS PLANIFICADOS */}
                                                    <div className="space-y-1.5 pt-2">
                                                        <h4 className="font-semibold text-gray-800 border-b border-gray-300 pb-0.5 mb-2 text-xs">Días planificados</h4>
                                                        
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Total de días solicitados</span>
                                                            <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Total de días de espera</span>
                                                            <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-800 text-[11px]">Días totales</span>
                                                            <input type="text" readOnly className="bg-white border border-[#b2b2b2] px-1 py-0.5 w-[120px] text-right text-xs rounded-none focus:outline-none" />
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    )}

                                    {tabActive === 'anexos' && (
                                        <div className="p-2 bg-[#f3f0ea] flex gap-2 min-h-[350px]">
                                            {/* TABLA DE ANEXOS CON TODAS LAS COLUMNAS SAP */}
                                            <div className="flex-1 border border-[#a3a3a3] bg-white overflow-x-auto max-h-[360px] shadow-inner">
                                                <table className="w-full border-collapse text-[11px] font-sans text-left min-w-[950px]">
                                                    <thead className="sticky top-0 bg-[#eceae6] border-b border-[#c2c0bb] shadow-sm select-none z-10">
                                                        <tr className="text-gray-700 font-semibold">
                                                            <th className="px-1.5 py-1 border-r border-[#c2c0bb] text-center w-8">#</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left min-w-[180px]">Vía de acceso destino</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left min-w-[180px]">Nombre de archivo</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left w-32">Extensión de archivo</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-right w-36">Tamaño del archivo</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-center w-32">Fecha del anexo</th>
                                                            <th className="px-2 py-1 border-r border-[#c2c0bb] text-left w-36">Adjuntado por</th>
                                                            <th className="px-2 py-1 text-left min-w-[160px] relative">
                                                                <div className="flex items-center justify-between">
                                                                    <span>Texto libre</span>
                                                                    <span className="text-gray-400 font-normal hover:text-black cursor-pointer text-xs pr-1" title="Ampliar">↗</span>
                                                                </div>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[#e5e5e5] bg-white">
                                                        {/* Filas vacías de cuadrícula SAP */}
                                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                                            <tr key={num} className="border-b border-[#e5e5e5] h-6 bg-white hover:bg-[#f2f7ff] transition-colors">
                                                                <td className="px-1.5 py-1 border-r border-[#e5e5e5] text-center text-gray-400 font-mono text-xs">{num}</td>
                                                                <td className="px-2 py-1 border-r border-[#e5e5e5]"></td>
                                                                <td className="px-2 py-1 border-r border-[#e5e5e5]"></td>
                                                                <td className="px-2 py-1 border-r border-[#e5e5e5]"></td>
                                                                <td className="px-2 py-1 border-r border-[#e5e5e5]"></td>
                                                                <td className="px-2 py-1 border-r border-[#e5e5e5]"></td>
                                                                <td className="px-2 py-1 border-r border-[#e5e5e5]"></td>
                                                                <td className="px-2 py-1"></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* BOTONES LATERALES DERECHOS SAP */}
                                            <div className="flex flex-col gap-2 shrink-0 pt-1">
                                                <button className="bg-gradient-to-b from-[#f5eee0] to-[#ded6c3] hover:from-[#ebdcc5] hover:to-[#cebe9f] border border-[#a3987e] px-4 py-1 text-xs text-black cursor-pointer font-bold rounded-none shadow-xs text-center w-24">
                                                    Explorar
                                                </button>
                                                <button className="bg-gradient-to-b from-[#f5eee0] to-[#ded6c3] hover:from-[#ebdcc5] hover:to-[#cebe9f] border border-[#a3987e] px-4 py-1 text-xs text-black cursor-pointer font-bold rounded-none shadow-xs text-center w-24">
                                                    Visualizar
                                                </button>
                                                <button className="bg-gradient-to-b from-[#f5eee0] to-[#ded6c3] hover:from-[#ebdcc5] hover:to-[#cebe9f] border border-[#a3987e] px-4 py-1 text-xs text-black cursor-pointer font-bold rounded-none shadow-xs text-center w-24">
                                                    Borrar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* COMMENTS & PACKAGING AREA */}
                            <div className="flex items-start justify-between w-full mt-1.5">
                                <div className="flex items-start gap-1">
                                    <span className="text-[11px] text-gray-800 select-none w-[75px] shrink-0 pt-1">Comentarios</span>
                                    <textarea
                                        value={activeOrder.comentarios}
                                        readOnly
                                        className="bg-white border border-[#b2b2b2] p-1 text-xs text-black w-[250px] h-[50px] rounded-none focus:outline-none resize-none font-sans leading-normal"
                                    />
                                </div>

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
            ) : (
                /* TAB 2: QUERY - SEMAFORO (QUERY MANAGER DE SAP) */
                <main className="flex-1 max-w-[1700px] w-full mx-auto p-2 md:p-3 flex flex-col gap-3 font-sans">
                    
                    {/* SAP QUERY MANAGER WINDOW REPLICA CONTAINER */}
                    <div className="bg-[#eceae6] border border-[#a3a3a3] shadow-2xl flex flex-col font-sans select-none text-xs w-full text-black overflow-hidden relative">
                        
                        {/* SAP WINDOW TITLE BAR */}
                        <div className="bg-gradient-to-r from-[#eceae6] to-[#d6d3cc] px-3 py-1.5 flex items-center justify-between border-b border-[#a3a3a3]">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-amber-500 rounded-sm flex items-center justify-center text-[10px] text-white font-black select-none shadow-sm">
                                    Q
                                </div>
                                <span className="font-semibold text-gray-800 text-[11px] tracking-wide">
                                    FPK - Semaforo - DJP — Query Manager (Proceso Produccion)
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExportExcel}
                                    className="flex items-center gap-1.5 bg-[#107c41] hover:bg-[#0b5c30] text-white font-bold px-3 py-1 rounded text-xs transition-colors shadow-sm cursor-pointer"
                                    title="Exportar consulta a Excel"
                                >
                                    <Download size={14} />
                                    <span>Descargar a Excel</span>
                                </button>
                            </div>
                        </div>

                        {/* SAP GOLD SHARP ACCENT BORDER */}
                        <div className="h-[3px] bg-[#f4b000] w-full"></div>

                        {/* QUERY MANAGER BODY */}
                        <div className="p-3 bg-[#f3f0ea] flex flex-col gap-3">
                            
                            {/* SQL QUERY BOX (MOCK EXEC STATEMENT FROM IMAGE 4) */}
                            <div className="bg-white border border-[#b2b2b2] p-2 flex flex-col gap-1 shadow-inner">
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex justify-between items-center">
                                    <span>Sentencia SQL — Query Manager SAP</span>
                                    <span className="text-gray-400 font-mono text-[10px]">Consulta: FPK - Semaforo - DJP</span>
                                </div>
                                <div className="bg-[#f8f9fa] border border-gray-200 p-2 font-mono text-xs text-slate-800 rounded select-text">
                                    EXEC [Planos_Symphony].[dbo].[SEMAFORO]
                                </div>
                            </div>

                            {/* FILTER & SAP ACTIONS BAR */}
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#eceae6] border border-[#c0beb9] p-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-700">Buscar en resultados:</span>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={semaforoFilter}
                                            onChange={(e) => setSemaforoFilter(e.target.value)}
                                            placeholder="SKU, N° OP, Planta, Artículo..."
                                            className="bg-white border border-[#b2b2b2] px-2 py-1 text-xs text-black w-64 outline-none focus:border-[#324354]"
                                        />
                                        {semaforoFilter && (
                                            <button
                                                onClick={() => setSemaforoFilter('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black text-xs font-bold"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleExecuteQuery}
                                        disabled={isExecuting}
                                        className="bg-[#e1e1e1] hover:bg-[#d0d0d0] border border-gray-400 px-3 py-1 font-semibold text-xs text-black cursor-pointer flex items-center gap-1 active:bg-[#c5c5c5]"
                                    >
                                        <RefreshCw size={13} className={isExecuting ? "animate-spin" : ""} />
                                        <span>Ejecutar</span>
                                    </button>

                                    <button
                                        onClick={handleCopyData}
                                        className="bg-[#e1e1e1] hover:bg-[#d0d0d0] border border-gray-400 px-3 py-1 font-semibold text-xs text-black cursor-pointer flex items-center gap-1 active:bg-[#c5c5c5]"
                                    >
                                        {copiedData ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                                        <span>{copiedData ? "¡Copiado!" : "Copiar datos"}</span>
                                    </button>

                                    <button
                                        onClick={handleExportExcel}
                                        className="bg-[#107c41] hover:bg-[#0b5c30] text-white border border-[#0b5c30] px-3.5 py-1 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm"
                                    >
                                        <Download size={13} />
                                        <span>Descargar a Excel</span>
                                    </button>
                                </div>
                            </div>

                            {/* RESULTS TABLE WITH SORTABLE & RESIZABLE HEADERS (SAP STYLE) */}
                            <div className="border border-[#a3a3a3] bg-white overflow-x-auto max-h-[550px] shadow-sm select-text">
                                <table className="border-collapse text-xs font-sans text-left table-fixed w-max">
                                    <thead className="sticky top-0 bg-[#eceae6] border-b border-[#a3a3a3] z-10 shadow-sm select-none">
                                        <tr className="text-gray-700 font-semibold">
                                            <th 
                                                style={{ width: `${semaforoColWidths.id}px` }}
                                                onClick={() => handleSemaforoSort('id')}
                                                className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]"
                                            >
                                                <div className="flex items-center justify-center">
                                                    <span>#</span>
                                                    {renderSortIcon('id', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="id" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            <th 
                                                style={{ width: `${semaforoColWidths.originnum}px` }}
                                                onClick={() => handleSemaforoSort('originnum')}
                                                className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 cursor-pointer hover:bg-[#dedbd5]"
                                            >
                                                <div className="flex items-center justify-start overflow-hidden">
                                                    <span className="truncate">Originnum</span>
                                                    {renderSortIcon('originnum', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="originnum" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            <th 
                                                style={{ width: `${semaforoColWidths.nroOp}px` }}
                                                onClick={() => handleSemaforoSort('nroOp')}
                                                className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 cursor-pointer hover:bg-[#dedbd5]"
                                            >
                                                <div className="flex items-center justify-start overflow-hidden">
                                                    <span className="truncate">Nro OP</span>
                                                    {renderSortIcon('nroOp', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="nroOp" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            <th 
                                                style={{ width: `${semaforoColWidths.sku}px` }}
                                                onClick={() => handleSemaforoSort('sku')}
                                                className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 cursor-pointer hover:bg-[#dedbd5]"
                                            >
                                                <div className="flex items-center justify-start overflow-hidden">
                                                    <span className="truncate">SKU</span>
                                                    {renderSortIcon('sku', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="sku" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            <th 
                                                style={{ width: `${semaforoColWidths.descripcion}px` }}
                                                onClick={() => handleSemaforoSort('descripcion')}
                                                className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 cursor-pointer hover:bg-[#dedbd5]"
                                            >
                                                <div className="flex items-center justify-start overflow-hidden">
                                                    <span className="truncate">Descripción Artículo</span>
                                                    {renderSortIcon('descripcion', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="descripcion" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            <th 
                                                style={{ width: `${semaforoColWidths.planta}px` }}
                                                onClick={() => handleSemaforoSort('planta')}
                                                className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]"
                                            >
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Planta</span>
                                                    {renderSortIcon('planta', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="planta" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            <th 
                                                style={{ width: `${semaforoColWidths.familia}px` }}
                                                onClick={() => handleSemaforoSort('familia')}
                                                className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-center cursor-pointer hover:bg-[#dedbd5]"
                                            >
                                                <div className="flex items-center justify-center overflow-hidden">
                                                    <span className="truncate">Familia</span>
                                                    {renderSortIcon('familia', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="familia" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            <th 
                                                style={{ width: `${semaforoColWidths.tipoOrden}px` }}
                                                onClick={() => handleSemaforoSort('tipoOrden')}
                                                className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 cursor-pointer hover:bg-[#dedbd5]"
                                            >
                                                <div className="flex items-center justify-start overflow-hidden">
                                                    <span className="truncate">Tipo Orden</span>
                                                    {renderSortIcon('tipoOrden', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="tipoOrden" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            <th 
                                                style={{ width: `${semaforoColWidths.cantPendiente}px` }}
                                                onClick={() => handleSemaforoSort('cantPendiente')}
                                                className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]"
                                            >
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Cant. Pendiente</span>
                                                    {renderSortIcon('cantPendiente', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="cantPendiente" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            <th 
                                                style={{ width: `${semaforoColWidths.cantPendItem}px` }}
                                                onClick={() => handleSemaforoSort('cantPendItem')}
                                                className="relative px-2 py-1.5 border-r border-[#c2c0bb] font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]"
                                            >
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Cant. Pend. Item</span>
                                                    {renderSortIcon('cantPendItem', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="cantPendItem" onResize={handleSemaforoResizeStart} />
                                            </th>
                                            <th 
                                                style={{ width: `${semaforoColWidths.cantTotal}px` }}
                                                onClick={() => handleSemaforoSort('cantTotal')}
                                                className="relative px-2 py-1.5 font-bold text-gray-700 text-right cursor-pointer hover:bg-[#dedbd5]"
                                            >
                                                <div className="flex items-center justify-end overflow-hidden">
                                                    <span className="truncate">Cantidad total</span>
                                                    {renderSortIcon('cantTotal', semaforoSortCol, semaforoSortDir)}
                                                </div>
                                                <ResizerHandle colKey="cantTotal" onResize={handleSemaforoResizeStart} />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedSemaforoData.length > 0 ? (
                                            sortedSemaforoData.map((row, idx) => (
                                                <tr
                                                    key={row.id}
                                                    className={`border-b border-[#e5e5e5] hover:bg-[#f2f7ff] transition-colors ${
                                                        idx % 2 === 0 ? 'bg-[#fcfdfd]' : 'bg-[#f7f6f2]'
                                                    }`}
                                                >
                                                    <td style={{ width: `${semaforoColWidths.id}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-gray-500 font-medium text-center overflow-hidden">{row.id}</td>
                                                    <td style={{ width: `${semaforoColWidths.originnum}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] font-mono text-slate-800 overflow-hidden truncate">{row.originnum}</td>
                                                    <td style={{ width: `${semaforoColWidths.nroOp}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] font-mono font-semibold text-blue-900 overflow-hidden truncate">{row.nroOp}</td>
                                                    <td style={{ width: `${semaforoColWidths.sku}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] font-mono text-slate-700 overflow-hidden truncate">{row.sku}</td>
                                                    <td style={{ width: `${semaforoColWidths.descripcion}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] font-medium text-slate-900 overflow-hidden truncate" title={row.descripcion}>{row.descripcion}</td>
                                                    <td style={{ width: `${semaforoColWidths.planta}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-semibold text-slate-700 overflow-hidden truncate">{row.planta}</td>
                                                    <td style={{ width: `${semaforoColWidths.familia}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-center font-medium text-slate-600 overflow-hidden truncate">{row.familia}</td>
                                                    <td style={{ width: `${semaforoColWidths.tipoOrden}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] overflow-hidden truncate">
                                                        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                                            row.tipoOrden === 'STOCK' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-blue-100 text-blue-800 border border-blue-300'
                                                        }`}>
                                                            {row.tipoOrden}
                                                        </span>
                                                    </td>
                                                    <td style={{ width: `${semaforoColWidths.cantPendiente}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-right font-mono font-semibold text-slate-800 overflow-hidden truncate">{row.cantPendiente}</td>
                                                    <td style={{ width: `${semaforoColWidths.cantPendItem}px` }} className="px-2 py-1.5 border-r border-[#e5e5e5] text-right font-mono text-slate-700 overflow-hidden truncate">{row.cantPendItem}</td>
                                                    <td style={{ width: `${semaforoColWidths.cantTotal}px` }} className="px-2 py-1.5 text-right font-mono font-bold text-slate-900 overflow-hidden truncate">{row.cantTotal}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={11} className="py-8 text-center text-gray-500 italic bg-white">
                                                    No se encontraron registros que coincidan con la búsqueda.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* SAP BOTTOM FOOTER BAR */}
                            <div className="bg-[#eceae6] border border-[#a3a3a3] px-3 py-1 flex items-center justify-between text-[11px] text-gray-700">
                                <div className="flex items-center gap-4">
                                    <span>({sortedSemaforoData.length} registros cargados)</span>
                                    <span className="text-gray-400">|</span>
                                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                        Operación finalizada con éxito [Mensaje 200-48]
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-gray-500">27/07/2026</span>
                                    <span className="font-bold text-amber-600 text-xs">SAP Business One</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </main>
            )}
        </div>
    )
}
