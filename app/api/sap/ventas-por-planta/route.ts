import { NextResponse } from 'next/server';
import { loginToSAP } from '@/lib/sap';

// 1. Tabla de equivalencias de Kit (16 distribuciones)
const EQUIVALENCIAS_KIT: Record<string, Array<{ componente: string; participacion: number; planta: string; cantidadPart: number }>> = {
    'BAN03-Kit Lvm FIRPLA': [
        { componente: 'LAVAMANOS FIRPLAK', participacion: 0.55, planta: 'Marmol', cantidadPart: 2 },
        { componente: 'MUEBLE', participacion: 0.45, planta: 'Muebles', cantidadPart: 2 }
    ],
    'BAN04-Kit Lvm ECO': [
        { componente: 'LAVAMANOS ECO', participacion: 0.40, planta: 'Marmol', cantidadPart: 2 },
        { componente: 'MUEBLE', participacion: 0.60, planta: 'Muebles', cantidadPart: 2 }
    ],
    'BAN13-Kit Lvm CLASS': [
        { componente: 'LAVAMANOS', participacion: 0.45, planta: 'Marmol', cantidadPart: 2 },
        { componente: 'MUEBLE CLASS', participacion: 0.55, planta: 'Muebles', cantidadPart: 2 }
    ],
    'COC03-Kit de cocinas': [
        { componente: 'MESON COCINA', participacion: 0.24, planta: 'RTM', cantidadPart: 4 },
        { componente: 'MUEBLE SUPERIOR', participacion: 0.24, planta: 'Muebles', cantidadPart: 4 },
        { componente: 'MUEBLE INFERIOR', participacion: 0.28, planta: 'Muebles', cantidadPart: 4 },
        { componente: 'CUBIERTA', participacion: 0.24, planta: 'Comercializado', cantidadPart: 4 }
    ],
    'ROP04-Kit lavar AQUA': [
        { componente: 'LAVARROPAS AQUA', participacion: 0.50, planta: 'Marmol', cantidadPart: 2 },
        { componente: 'MUEBLE', participacion: 0.50, planta: 'Muebles', cantidadPart: 2 }
    ],
    'ROP05-Kit lavar ECO': [
        { componente: 'LAVARROPAS ECO', participacion: 0.40, planta: 'Marmol', cantidadPart: 2 },
        { componente: 'MUEBLE', participacion: 0.60, planta: 'Muebles', cantidadPart: 2 }
    ],
    'ROP09-Kit Lvr PRO': [
        { componente: 'LAVARROPAS PRO', participacion: 0.45, planta: 'Marmol', cantidadPart: 2 },
        { componente: 'MUEBLE', participacion: 0.55, planta: 'Muebles', cantidadPart: 2 }
    ],
    'BAN17-Kit Lvm Gold': [
        { componente: 'LAVAMANOS', participacion: 0.45, planta: 'Marmol', cantidadPart: 2 },
        { componente: 'MUEBLE', participacion: 0.55, planta: 'Comercializado', cantidadPart: 2 }
    ],
    'BAN18-Kit Lvm Desinf': [
        { componente: 'LAVAMANOS', participacion: 0.30, planta: 'Marmol', cantidadPart: 5 },
        { componente: 'MUEBLE', participacion: 0.43, planta: 'Muebles', cantidadPart: 5 },
        { componente: 'PLOMERIA', participacion: 0.02, planta: 'Comercializado', cantidadPart: 5 },
        { componente: 'GRIFERIA', participacion: 0.22, planta: 'Comercializado', cantidadPart: 5 },
        { componente: 'MATERIA PRIMA', participacion: 0.05, planta: 'Comercializado', cantidadPart: 5 }
    ],
    'BAN20-Kit LvmIntelig': [
        { componente: 'LAVAMANOS', participacion: 0.18, planta: 'Marmol', cantidadPart: 6 },
        { componente: 'MUEBLE', participacion: 0.19, planta: 'Muebles', cantidadPart: 6 },
        { componente: 'GRIFERIA', participacion: 0.03, planta: 'Comercializado', cantidadPart: 6 },
        { componente: 'PLOMERIA', participacion: 0.02, planta: 'Comercializado', cantidadPart: 6 },
        { componente: 'MATERIA PRIMA', participacion: 0.02, planta: 'Comercializado', cantidadPart: 6 },
        { componente: 'PPRD01', participacion: 0.56, planta: 'Comercializado', cantidadPart: 6 }
    ],
    'BAN25-KitEssen Arma': [
        { componente: 'LAVAMANOS', participacion: 0.40, planta: 'Marmol', cantidadPart: 2 },
        { componente: 'MUEBLE', participacion: 0.60, planta: 'Muebles', cantidadPart: 2 }
    ],
    'BAN21-KitClass Armad': [
        { componente: 'LAVAMANOS', participacion: 0.45, planta: 'Marmol', cantidadPart: 2 },
        { componente: 'MUEBLE', participacion: 0.55, planta: 'Muebles', cantidadPart: 2 }
    ],
    'BAN26-KitLife Armad': [
        { componente: 'LAVAMANOS', participacion: 0.55, planta: 'Marmol', cantidadPart: 2 },
        { componente: 'MUEBLE', participacion: 0.45, planta: 'Muebles', cantidadPart: 2 }
    ],
    'GRI05-Kits Griferia': [
        { componente: 'MATERIA PRIMA', participacion: 0.10, planta: 'Comercializado', cantidadPart: 3 },
        { componente: 'PLOMERIA', participacion: 0.30, planta: 'Comercializado', cantidadPart: 3 },
        { componente: 'GRIFERIA', participacion: 0.60, planta: 'Comercializado', cantidadPart: 3 }
    ],
    'QUA04-Kit Lvm Qztn': [
        { componente: 'MUEBLE', participacion: 0.42, planta: 'Muebles', cantidadPart: 3 },
        { componente: 'MESON', participacion: 0.33, planta: 'RTM', cantidadPart: 3 },
        { componente: 'LAVAMANOS', participacion: 0.25, planta: 'Marmol', cantidadPart: 3 }
    ],
    'BAN32-KitMblSinLvm': [
        { componente: 'TAPA', participacion: 0.25, planta: 'RTM', cantidadPart: 2 },
        { componente: 'LAVAMANOS', participacion: 0.75, planta: 'Marmol', cantidadPart: 2 }
    ],
    'BAN33-KitMbModular': [
        { componente: 'LAVAMANOS', participacion: 0.53, planta: 'Marmol', cantidadPart: 3 },
        { componente: 'MUEBLE', participacion: 0.45, planta: 'Muebles', cantidadPart: 3 },
        { componente: 'MATERIA PRIMA', participacion: 0.02, planta: 'Comercializado', cantidadPart: 3 }
    ],
    'ROP13-Kit Lvr Versa': [
        { componente: 'MUEBLE', participacion: 0.60, planta: 'Muebles', cantidadPart: 2 },
        { componente: 'LAVARROPAS VERSA', participacion: 0.40, planta: 'Marmol', cantidadPart: 2 }
    ]
};

// 2. Diccionario de Planta Base (115 equivalencias)
const PLANTA_BASE: Record<string, string> = {
    'BAN31-SuperfMaderLvm': 'Muebles', 'BAN34-Lvm Submontar': 'Marmol', 'EST01-Estruct secund': 'Fibra',
    'ROP14-Lvr Versa': 'Marmol', 'MPD03-Fibra vidrio': 'Fibra', 'OUT01-ZOutdoorTurcoSauna': 'Fibra',
    'BAN01-Lavam FIRPLAK': 'Marmol', 'BAN02-Lavamanos ECO': 'Marmol', 'BAN03-Kit Lvm FIRPLA': 'M&M',
    'BAN04-Kit Lvm ECO': 'M&M', 'BAN05-Muebles Lavam': 'Muebles', 'BAN06-Gabinetes baño': 'Muebles',
    'BAN07-Pie de duchas': 'Fibra', 'BAN08-Cabinas ducha': 'Fibra', 'BAN09-Acce cab ducha': 'Comercializado',
    'BAN10-Sanitarios': 'Comercializado', 'BAN11-Espejos': 'Comercializado', 'BAN12-Mueb LVM Class': 'Muebles',
    'BAN13-Kit Lvm CLASS': 'M&M', 'BAN15-Mb LVMClassGol': 'Muebles', 'BAN16-GabinetClassGo': 'Muebles',
    'BAN17-Kit Lvm Gold': 'M&M', 'BAN18-Kit Lvm Desinf': 'Marmol', 'BAN19-Sop lvm desinf': 'Comercializado',
    'CIV01-Canales ACO': 'Comercializado', 'CIV02-zocalos': 'RTM', 'CIV03-Ecovial': 'RTM',
    'COC01-Mueble cocina': 'Muebles', 'COC02-Alacenas': 'Muebles', 'COC03-Kit de cocinas': 'M&M',
    'COC04-Lavaplatos': 'Marmol', 'COC05-mesones ECO': 'Marmol', 'COC06-Electrodomest': 'Comercializado',
    'COC07-Meson Granito': 'Marmol', 'EXH01-Elemento Exhib': 'Comercializado', 'GRI01-Grif Importada': 'Comercializado',
    'GRI02-Grif DELTA Res': 'Comercializado', 'GRI03-Grif Nacional': 'Comercializado', 'GRI04-Grif DELTA Com': 'Comercializado',
    'GRI05-Kits Griferia': 'Comercializado', 'HEM01-Hidros PREMIUM': 'Fibra', 'HEM02-Hidroaero PREM': 'Fibra',
    'HEM03-Hidros CONSTRU': 'Fibra', 'HEM04-Hidroaero CONS': 'Fibra', 'HEM05-Hidros MULTIPE': 'Fibra',
    'HEM06-Hidroaero MULT': 'Fibra', 'HPT01-Hidros OCEANO': 'Fibra', 'HPT02-HidroAero HSPA': 'Fibra',
    'HPT03-Hidros FORMA': 'Fibra', 'HPT05-HidroaerSPAMUL': 'Fibra', 'HPT06-Hidroaero OCEA': 'Fibra',
    'HPT07-Hidro HSPA': 'Fibra', 'HPT08-Hidroaero FORM': 'Fibra', 'HPT09-Hidro SPAMULTI': 'Fibra',
    'INS01-Instalaciones': 'Servicios', 'INS02-Reparaciones': 'Servicios', 'INS03-Ases instalac': 'Servicios',
    'IPR01-Otros Ind prod': 'Servicios', 'MPD04-Acces hidros': 'Servicios', 'MPD05-Decks': 'Comercializado',
    'OMP03-Pegantes': 'Servicios', 'OMP04-Otras m primas': 'Servicios', 'PER01-Cuidado Person': 'Servicios',
    'PLM01-Plomer coc-rop': 'Comercializado', 'PLM02-Plomeria baños': 'Comercializado', 'PLM03-Cajas y tapas': 'Servicios',
    'PRD01-Subprod prodn': 'Servicios', 'PYM01-Prot muest com': 'Servicios', 'REP01-Rep hidromasaj': 'Servicios',
    'REP02-Repues muebles': 'Servicios', 'REP03-Repue griferia': 'Servicios', 'REV01-Mosaicos-paño': 'Comercializado',
    'REV02-Pisos-Paredes': 'Comercializado', 'ROP01-LVR AQUA-const': 'Marmol', 'ROP02-Lavarropas ECO': 'Marmol',
    'ROP03-Muebl lavarrop': 'Muebles', 'ROP04-Kit lavar AQUA': 'M&M', 'ROP05-Kit lavar ECO': 'M&M',
    'ROP06-LVR PRO': 'Marmol', 'ROP07-Muebl lvr Pro': 'Muebles', 'ROP08-Complem lvr': 'Comercializado',
    'ROP09-Kit Lvr PRO': 'M&M', 'SMC01-CocRop Lvm SMC': 'Comercializado', 'TIN01-Bañera Firplak': 'Fibra',
    'TIN02-Bañeras ECO': 'Fibra', 'TIN03-Bañera sin APR': 'Fibra', 'ZNOPE-No Operacional': 'Marmol',
    'MPD06-Maderas-Cantos': 'Comercializado', 'BAN27-Muebl Modu Ban': 'Muebles', 'COC08-Muebl ModuCoci': 'Muebles',
    'QUA02-SupQuarzTransf': 'Quarztone', 'BAN20-Kit LvmIntelig': 'M&M', 'BAN21-KitClass Armad': 'M&M',
    'BAN22-MuebClass Arma': 'Muebles', 'BAN23-MuebLife Armad': 'Muebles', 'BAN24-MuebEssen Arma': 'Muebles',
    'BAN26-KitLife Armad': 'M&M', 'MPD07-Herrajes Muebl': 'Comercializado', 'EMP04-Empaq fabricad': 'Comercializado',
    'PAP03-Muestra Colore': 'Fibra', 'PYM02-Prot mues fabr': 'Muebles', 'QUA02-SupQuarzTrCoci': 'Quarztone',
    'MPD09-Piezas Muebles': 'Servicios', 'QUA04-Kit Lvm Qztn': 'Quarztone', 'ROP10-Mub Modu Lvr': 'Muebles',
    'ACC01-Accesorios': 'Comercializado', 'QUA01-Superf Quartzs': 'Quarztone', 'QUA03-SupQuarzTrBaño': 'Quarztone',
    'BAN25-KitEssen Arma': 'M&M', 'EMP02-Material empaq': 'Servicios', 'IPR02-Abrasivos': 'Servicios',
    'BAN29-SuperfBañoMS': 'Marmol', 'BAN28-LavamanoVessel': 'Marmol', 'HCM01-CuidMntoHidro': 'Comercializado',
    'BAN30-MuebAuxiliares': 'Muebles', 'ROP11-MuebLVR Armad': 'Muebles', 'ROP12-MueLVR PRO Arm': 'Muebles',
    'CLO01-Closets Modul': 'Muebles', 'IPR03-Ind prod Muebl': 'Comercializado', 'COC09-MueblCociArmad': 'Muebles',
    'OMP02-Tornillo-ferre': 'Comercializado'
};

export async function GET(request: Request) {
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const { searchParams } = new URL(request.url);
        const fechaIni = searchParams.get('fechaIni') || `${new Date().getFullYear()}-01-01`;
        const fechaFin = searchParams.get('fechaFin') || new Date().toISOString().split('T')[0];

        const loginData = await loginToSAP();
        const baseUrl = process.env.SAP_API_URL?.replace('/Login', '') || 'https://200.7.96.194:50000/b1s/v1';

        // Consultar facturas y notas de crédito de SAP Service Layer
        const queryUrl = `${baseUrl}/SQLQueries('ventas_por_planta')/List`;

        const response = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'Cookie': loginData.cookieHeader || loginData,
                'Content-Type': 'application/json',
                'Prefer': 'odata.maxpagesize=5000'
            },
            cache: 'no-store'
        });

        let rawRows: any[] = [];
        if (response.ok) {
            const json = await response.json();
            rawRows = json.value || [];
        }

        const resultRows: any[] = [];

        rawRows.forEach((row: any) => {
            const grupoArticulo = String(row.GrupoArticulo || '').trim();
            const kitComponents = EQUIVALENCIAS_KIT[grupoArticulo];

            if (kitComponents && kitComponents.length > 0) {
                // Lógica 10B: Distribución de Kits
                kitComponents.forEach(comp => {
                    const cantidadPart = comp.cantidadPart || 1;
                    const distribCantidad = cantidadPart > 0 ? (Number(row.Cantidad) || 0) / cantidadPart : Number(row.Cantidad) || 0;
                    const valorTotalDist = (Number(row.ValorTotal) || 0) * comp.participacion;
                    const contribBrutaDist = (Number(row.ContribucionBruta) || 0) * comp.participacion;
                    const costoTotalDist = valorTotalDist - contribBrutaDist;

                    resultRows.push({
                        ...row,
                        Planta: comp.planta,
                        ComponenteKIT: comp.componente,
                        Cantidad: Math.round(distribCantidad * 1000000) / 1000000,
                        ValorTotal: Math.round(valorTotalDist * 100) / 100,
                        CostoTotal: Math.round(costoTotalDist * 100) / 100,
                        ContribucionBruta: Math.round(contribBrutaDist * 100) / 100
                    });
                });
            } else {
                // Lógica 10A: Artículos No Distribuibles
                const plantaMapped = PLANTA_BASE[grupoArticulo] || 'SIN PLANTA';
                resultRows.push({
                    ...row,
                    Planta: plantaMapped,
                    ComponenteKIT: null
                });
            }
        });

        return NextResponse.json({
            success: true,
            totalOriginales: rawRows.length,
            totalDistribuidos: resultRows.length,
            fechaInicio: fechaIni,
            fechaFin: fechaFin,
            endpoint: "/SQLQueries('ventas_por_planta')/List",
            data: resultRows
        });

    } catch (error: any) {
        console.error("Error en /api/sap/ventas-por-planta:", error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al consultar Ventas por Planta'
        }, { status: 500 });
    }
}
