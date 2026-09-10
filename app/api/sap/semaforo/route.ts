import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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
        const mappedRecords = allRecords.map((r, index) => ({
            id: index + 1,
            originnum: r.U_Originnum,
            nroOp: r.U_NroOP,
            sku: r.U_SKU,
            descripcion: r.U_DescArticulo,
            planta: r.U_Planta,
            familia: r.U_Familia,
            tipoOrden: r.U_TipoOrden,
            cantPendiente: r.U_CantPendiente,
            cantPendItem: r.U_CantPendItem,
            cantTotal: r.U_CantidadTotal,
            disponiblePt01: r.U_DisponiblePT01,
            fechaCreacionOp: r.U_FechaCreacionOP,
            estado: r.U_Estado,
            fechaRecomendadaLiberacion: r.U_FechaRecoLib,
            fechaRealLiberacion: r.U_FechaRealLib,
            consumoParaLiberar: r.U_ConsumoParaLib,
            colorLiberacionTxt: r.U_ColorLibTxt,
            colorLiberacion: r.U_ColorLib,
            cumplimientoLiberacion: r.U_CumpLib,
            fechaEntregaLote: r.U_FechaEntLote,
            fechaRecomendadaEntrega: r.U_FechaRecoEnt,
            fechaCierreOp: r.U_FechaCierreOP,
            fechaIdealEntregaProduccion: r.U_FechaIdealEnt,
            consumoAmortiguadorPlanta: r.U_ConsumoAmort,
            colorProduccionTxt: r.U_ColorProdTxt,
            colorProduccion: r.U_ColorProd,
            cumplimientoPlanta: r.U_CumpPlanta,
            diasRetrazoFirplak: r.U_DiasRetrazo,
            colorFirplakTxt: r.U_ColorFirplakTxt,
            colorFirplak: r.U_ColorFirplak,
            cumplimientoFirplak: r.U_CumpFirplak,
            fechaPrometidaEntregaItem: r.U_FechaPromEnt,
            destino: r.U_Destino,
            numLote: r.U_NumLote,
            molde: r.U_Molde,
            capacidadMolde: r.U_CapacidadMolde,
            fechaCargaMolde: r.U_FechaCargaMolde,
            amortiguador: r.U_Amortiguador,
            cliente: r.U_Cliente
        }));

        return NextResponse.json({
            success: true,
            source: 'SAP Service Layer (@F_SEMAFORO UDT)',
            data: mappedRecords,
            total: mappedRecords.length
        });

    } catch (error) {
        console.error("Error en API semáforo (Service Layer UDT):", error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch from SAP Service Layer', details: error.message },
            { status: 500 }
        );
    }
}
