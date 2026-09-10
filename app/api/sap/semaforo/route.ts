import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
    try {
        console.log("Iniciando solicitud a SAP Service Layer para semaforo_v3...");
        const sapUrl = process.env.SAP_API_URL;
        
        const loginRes = await fetch(sapUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                CompanyDB: process.env.SAP_COMPANY_DB,
                Password: process.env.SAP_PASSWORD,
                UserName: process.env.SAP_USERNAME
            }),
            cache: 'no-store'
        });

        if (!loginRes.ok) {
            throw new Error(`Error en Login SAP: ${loginRes.status}`);
        }

        const loginData = await loginRes.json();
        const routeIdMatch = (loginRes.headers.get("set-cookie") || "").match(/ROUTEID=([^;]+)/);
        const cookieHeader = `B1SESSION=${loginData.SessionId}; ROUTEID=${routeIdMatch ? routeIdMatch[1] : ""}`;
        const baseUrl = sapUrl.replace('/Login', '');

        // Obtener todos los registros paginados (max 10000)
        let allRecords = [];
        let nextUrl = `${baseUrl}/U_F_SEMAFORO?$inlinecount=allpages`;
        
        while (nextUrl) {
            const listRes = await fetch(nextUrl, {
                headers: {
                    'Cookie': cookieHeader,
                    'Prefer': 'odata.maxpagesize=5000'
                },
                cache: 'no-store'
            });

            if (!listRes.ok) {
                const errText = await listRes.text();
                throw new Error(`Error al consultar semaforo_v3: ${listRes.status} - ${errText}`);
            }

            const data = await listRes.json();
            allRecords = allRecords.concat(data.value || []);
            
            if (data['odata.nextLink']) {
                nextUrl = `${baseUrl}/${data['odata.nextLink']}`;
            } else {
                nextUrl = null;
            }
        }

        console.log(`Consulta completada. Total registros obtenidos de SAP: ${allRecords.length}`);

        // Mapear de U_... a los nombres originales esperados por el frontend
        const mappedRecords = allRecords.map(r => ({
            "Originnum": r.U_Originnum,
            "Nro OP": r.U_NroOP,
            "SKU": r.U_SKU,
            "Descripción Artículo": r.U_DescArticulo,
            "Planta": r.U_Planta,
            "Familia": r.U_Familia,
            "Tipo Orden": r.U_TipoOrden,
            "Cant. Pendiente": r.U_CantPendiente,
            "Cant. Pend. Item": r.U_CantPendItem,
            "Cantidad total": r.U_CantidadTotal,
            "Disponible PT01": r.U_DisponiblePT01,
            "Fecha Creación OP": r.U_FechaCreacionOP,
            "Estado": r.U_Estado,
            "Fecha Recomendada Liberación": r.U_FechaRecoLib,
            "Fecha Real Liberación": r.U_FechaRealLib,
            "Consumo Para Liberar": r.U_ConsumoParaLib,
            "Color Liberación Txt": r.U_ColorLibTxt,
            "Color Liberación": r.U_ColorLib,
            "Cumplimiento Liberación": r.U_CumpLib,
            "Fecha Entrega Lote": r.U_FechaEntLote,
            "Fecha Recomendada de Entrega": r.U_FechaRecoEnt,
            "Fecha Cierre OP": r.U_FechaCierreOP,
            "Fecha Ideal Entrega Producción": r.U_FechaIdealEnt,
            "Consumo Amortiguador Planta": r.U_ConsumoAmort,
            "Color Producción Txt": r.U_ColorProdTxt,
            "Color Producción": r.U_ColorProd,
            "Cumplimiento Planta": r.U_CumpPlanta,
            "Dias Retrazo Firplak": r.U_DiasRetrazo,
            "Color Firplak Txt": r.U_ColorFirplakTxt,
            "Color Firplak": r.U_ColorFirplak,
            "Cumplimiento Firplak": r.U_CumpFirplak,
            "Fecha Prometida Entrega Item": r.U_FechaPromEnt,
            "Destino": r.U_Destino,
            "NumLote": r.U_NumLote,
            "Molde": r.U_Molde,
            "Capacidad Molde": r.U_CapacidadMolde,
            "Fecha Carga Molde": r.U_FechaCargaMolde,
            "Amortiguador": r.U_Amortiguador,
            "Cliente": r.U_Cliente
        }));

        return NextResponse.json({
            success: true,
            source: 'SAP Service Layer (@F_SEMAFORO UDT)',
            data: mappedRecords
        });

    } catch (error) {
        console.error("Error en API semáforo (Service Layer UDT):", error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch from SAP Service Layer', details: error.message },
            { status: 500 }
        );
    }
}
