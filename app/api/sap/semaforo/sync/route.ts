import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function mapRow(item: any, index: number) {
    const descKey = Object.keys(item).find(k => k.toLowerCase().includes('descripc')) || 'Descripción Artículo';
    const cantPendKey = Object.keys(item).find(k => k.toLowerCase().includes('pendiente') && !k.toLowerCase().includes('item')) || 'Cant. Pendiente';
    const cantPendItemKey = Object.keys(item).find(k => k.toLowerCase().includes('pend') && k.toLowerCase().includes('item')) || 'Cant. Pend. Item';
    const cantTotKey = Object.keys(item).find(k => k.toLowerCase().includes('total')) || 'Cantidad total';
    const tipoOrdKey = Object.keys(item).find(k => k.toLowerCase().includes('tipo')) || 'Tipo Orden';

    return {
        id: index + 1,
        originnum: item.Originnum ? String(item.Originnum) : '',
        nroOp: item["Nro OP"] ? String(item["Nro OP"]) : (item.orden_fabricacion ? String(item.orden_fabricacion) : ''),
        sku: item.SKU || item.producto_sku || '',
        descripcion: item[descKey] || item.producto_descripcion || '',
        planta: item.Planta || item.linea || 'MS',
        familia: item.Familia || 'PA',
        tipoOrden: item[tipoOrdKey] || 'STANDARD',
        cantPendiente: String(item[cantPendKey] ?? item.cantidad ?? '0'),
        cantPendItem: String(item[cantPendItemKey] ?? '0'),
        cantTotal: String(item[cantTotKey] ?? item.cantidad ?? '0'),
        disponiblePt01: String(item["Disponible PT01"] ?? '0'),
        fechaCreacionOp: item["Fecha Creación OP"] || item.fecha_liberacion || '',
        estado: item.Estado || 'Liberado',
        fechaRecomendadaLiberacion: item["Fecha Recomendada Liberación"] || item.fecha_liberacion || '',
        fechaRealLiberacion: item["Fecha Real Liberación"] || item.fecha_liberacion || '',
        consumoParaLiberar: String(item["Consumo Para Liberar"] ?? '0'),
        colorLiberacionTxt: item["Color Liberación Txt"] || 'Verde',
        colorLiberacion: String(item["Color Liberación"] ?? 'VERDE'),
        cumplimientoLiberacion: item["Cumplimiento Liberación"] || '100%',
        fechaEntregaLote: item["Fecha Entrega Lote"] || item.fecha_entrega_estimada || '',
        fechaRecomendadaDeEntrega: item["Fecha Recomendada de Entrega"] || item.fecha_entrega_estimada || '',
        fechaCierreOp: item["Fecha Cierre OP"] || null,
        fechaIdealEntregaProduccion: item["Fecha Ideal Entrega Producción"] || item.fecha_ideal_produccion || '',
        consumoAmortiguadorPlanta: String(item["Consumo Amortiguador Planta"] ?? '0'),
        colorProduccionTxt: item["Color Producción Txt"] || 'Verde',
        colorProduccion: String(item["Color Producción"] ?? 'VERDE'),
        cumplimientoPlanta: item["Cumplimiento Planta"] || '100%',
        diasRetrazoFirplak: String(item["Dias Retrazo Firplak"] ?? '0'),
        colorFirplakTxt: item["Color Firplak Txt"] || 'Verde',
        colorFirplak: String(item["Color Firplak"] ?? 'VERDE'),
        cumplimientoFirplak: item["Cumplimiento Firplak"] || '100%',
        fechaPrometidaEntregaItem: item["Fecha Prometida Entrega Item"] || item.fecha_entrega_estimada || '',
        destino: item.Destino || 'CEDI',
        numLote: item.NumLote || item.numero_pedido || '',
        molde: item.Molde || item.molde_descripcion || null,
        capacidadMolde: item["Capacidad Molde"] ? String(item["Capacidad Molde"]) : null,
        fechaCargaMolde: item["Fecha Carga Molde"] || '',
        amortiguador: String(item.Amortiguador ?? '0'),
        cliente: item.Cliente || item.cliente || 'FIRPLAK S A',
    };
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // Verificamos un token básico de seguridad
        const authHeader = req.headers.get('authorization');
        if (authHeader !== 'Bearer firplak_sync_2026') {
            return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
        }

        if (!Array.isArray(body) || body.length === 0) {
            return NextResponse.json({ success: false, error: 'Payload vacío o no es un array' }, { status: 400 });
        }

        const rawItems = body;

        const mappedForDb = rawItems.map(mapRow).map((item: any) => ({
            nro_op: item.nroOp || '',
            originnum: item.originnum || '',
            sku: item.sku || '',
            descripcion: item.descripcion || '',
            planta: item.planta || '',
            familia: item.familia || '',
            tipo_orden: item.tipoOrden || '',
            cant_pendiente: item.cantPendiente || '0',
            cant_total: item.cantTotal || '0',
            estado: item.estado || '',
            fecha_creacion_op: item.fechaCreacionOp || '',
            fecha_real_liberacion: item.fechaRealLiberacion || '',
            color_liberacion: item.colorLiberacion || '',
            color_produccion: item.colorProduccion || '',
            color_firplak: item.colorFirplak || '',
            cumplimiento_planta: item.cumplimientoPlanta || '',
            cumplimiento_firplak: item.cumplimientoFirplak || '',
            dias_retrazo_firplak: item.diasRetrazoFirplak || '0',
            cliente: item.cliente || '',
            num_lote: item.numLote || '',
            raw_data: item,
            updated_at: new Date().toISOString()
        }));

        // Primero borramos los datos actuales para tener una copia limpia
        await supabase.from('semaforo').delete().neq('nro_op', '___IMPOSSIBLE_VAL___');

        // Luego insertamos en bloques de 100
        const BATCH_SIZE = 100;
        for (let i = 0; i < mappedForDb.length; i += BATCH_SIZE) {
            const batch = mappedForDb.slice(i, i + BATCH_SIZE);
            await supabase.from('semaforo').upsert(batch, { onConflict: 'nro_op' });
        }

        return NextResponse.json({
            success: true,
            message: `Sincronizados ${rawItems.length} registros exitosamente.`
        });

    } catch (err: any) {
        console.error("Error en /api/sap/semaforo/sync:", err);
        return NextResponse.json({
            success: false,
            error: String(err)
        }, { status: 500 });
    }
}
