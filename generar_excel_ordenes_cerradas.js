require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function generarExcel() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("=== GENERANDO EXCEL DE ÓRDENES CERRADAS ===");

    const todayStr = new Date().toISOString().split('T')[0];

    // Traer las 276 del primer lote
    const { data: lote1, error: err1 } = await supabase
        .from('ordenes_fabricacion')
        .select('*')
        .eq('modificado_por', 'Flujo Cierre 18:00 Conciliacion SAP')
        .order('id', { ascending: true });

    // Traer las 140 del segundo lote (cerradas hoy)
    const { data: lote2, error: err2 } = await supabase
        .from('ordenes_fabricacion')
        .select('*')
        .eq('modificado_por', 'Flujo de PowerAutomate')
        .gte('fecha_entrega_real', todayStr)
        .order('id', { ascending: true });

    if (err1 || err2) {
        console.error("Error al consultar ordenes_fabricacion:", err1 || err2);
        return;
    }

    const ordenes = [...(lote1 || []), ...(lote2 || [])];
    console.log(`Total órdenes recuperadas exactamente cerradas hoy: ${ordenes.length} (Lote 1: ${lote1?.length}, Lote 2: ${lote2?.length})`);

    // Crear Workbook de ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FIRPLAK S.A. - Sistema Manufactura';
    workbook.created = new Date();

    // -------------------------------------------------------------
    // HOJA 1: RESUMEN EJECUTIVO
    // -------------------------------------------------------------
    const wsResumen = workbook.addWorksheet('Resumen Ejecutivo', {
        views: [{ showGridLines: true }]
    });

    wsResumen.columns = [
        { width: 4 },
        { width: 35 },
        { width: 25 },
        { width: 30 }
    ];

    // Título
    wsResumen.mergeCells('B2:D2');
    const titleCell = wsResumen.getCell('B2');
    titleCell.value = 'FIRPLAK S.A. - REPORTE DE CONCILIACIÓN Y CIERRE DE ÓRDENES';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF324354' } }; // Navy Firplak
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    wsResumen.getRow(2).height = 35;

    // Metadatos
    wsResumen.getCell('B4').value = 'Fecha y Hora de Generación:';
    wsResumen.getCell('B4').font = { bold: true };
    wsResumen.getCell('C4').value = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

    wsResumen.getCell('B5').value = 'Total Órdenes Cerradas Exitosamente:';
    wsResumen.getCell('B5').font = { bold: true };
    wsResumen.getCell('C5').value = ordenes.length;
    wsResumen.getCell('C5').font = { bold: true, color: { argb: 'FF2E7D32' }, size: 12 };

    wsResumen.getCell('B6').value = 'Criterio Aplicado:';
    wsResumen.getCell('B6').font = { bold: true };
    wsResumen.getCell('C6').value = '100% CEDI en Planta + 100% Entregado en SAP B1';

    // Tabla desglose por lote
    wsResumen.getCell('B8').value = 'Desglose de Ejecución:';
    wsResumen.getCell('B8').font = { bold: true, size: 11 };

    const headersResumen = ['Lote / Flujo', 'Cantidad Órdenes', 'Estado en Supabase'];
    const rowHeader = wsResumen.getRow(9);
    rowHeader.values = ['', ...headersResumen];
    rowHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ['B9', 'C9', 'D9'].forEach(cell => {
        wsResumen.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B8E90' } }; // Sage Firplak
        wsResumen.getCell(cell).alignment = { horizontal: 'center' };
    });

    const flujo1Count = ordenes.filter(o => o.modificado_por === 'Flujo Cierre 18:00 Conciliacion SAP').length;
    const flujo2Count = ordenes.filter(o => o.modificado_por === 'Flujo de PowerAutomate').length;

    wsResumen.addRow(['', 'Lote 1 (Conciliación SAP B1)', flujo1Count, 'Cerrada (pendiente = false)']);
    wsResumen.addRow(['', 'Lote 2 (Flujo PowerAutomate)', flujo2Count, 'Cerrada (pendiente = false)']);
    wsResumen.addRow(['', 'TOTAL GENERAL', ordenes.length, 'Completadas y concilidadas']);

    const totalRow = wsResumen.getRow(12);
    totalRow.font = { bold: true };
    wsResumen.getCell('C12').font = { bold: true, color: { argb: 'FF2E7D32' } };

    // -------------------------------------------------------------
    // HOJA 2: DETALLE DE ÓRDENES CERRADAS
    // -------------------------------------------------------------
    const wsOrdenes = workbook.addWorksheet('Órdenes Cerradas', {
        views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }]
    });

    wsOrdenes.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Orden Fabricación', key: 'orden_fabricacion', width: 20 },
        { header: 'Pedido', key: 'numero_pedido', width: 16 },
        { header: 'SKU Producto', key: 'producto_sku', width: 24 },
        { header: 'Descripción Producto', key: 'producto_descripcion', width: 45 },
        { header: 'Cantidad', key: 'cantidad', width: 12 },
        { header: 'Cliente', key: 'cliente', width: 35 },
        { header: 'Estado', key: 'estado', width: 14 },
        { header: 'Fecha Entrega Real', key: 'fecha_entrega_real', width: 24 },
        { header: 'Modificado Por', key: 'modificado_por', width: 35 },
        { header: 'Molde SKU', key: 'molde_sku', width: 22 },
        { header: 'Molde Descripción', key: 'molde_descripcion', width: 38 }
    ];

    // Estilo encabezado Hoja 2
    const headerRow2 = wsOrdenes.getRow(1);
    headerRow2.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow2.height = 28;
    headerRow2.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF324354' } }; // Navy Firplak
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'medium', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
    });

    // Agregar filas
    ordenes.forEach((o, index) => {
        const row = wsOrdenes.addRow({
            id: o.id,
            orden_fabricacion: o.orden_fabricacion,
            numero_pedido: o.numero_pedido || '',
            producto_sku: o.producto_sku || '',
            producto_descripcion: o.producto_descripcion || '',
            cantidad: o.cantidad || 0,
            cliente: o.cliente || '',
            estado: 'Cerrada',
            fecha_entrega_real: o.fecha_entrega_real ? new Date(o.fecha_entrega_real).toLocaleString('es-CO') : '',
            modificado_por: o.modificado_por,
            molde_sku: o.molde_sku || '',
            molde_descripcion: o.molde_descripcion || ''
        });

        row.height = 20;

        // Cebra suave
        const isEven = index % 2 === 0;
        const bgArg = isEven ? 'FFFFFFFF' : 'FFF6F3EE'; // Crema Firplak suave

        row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Arial', size: 9 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArg } };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
            };
            // Alinear al centro números
            if ([1, 2, 3, 6, 8].includes(colNumber)) {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            } else {
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
            }
        });
    });

    // -------------------------------------------------------------
    // HOJA 3: DISCREPANCIAS SAP (8 ÓRDENES CON FALTANTES)
    // -------------------------------------------------------------
    const wsDiscrepancias = workbook.addWorksheet('Discrepancias SAP (Novedades)', {
        views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }]
    });

    wsDiscrepancias.columns = [
        { header: 'ID Supabase', key: 'id', width: 14 },
        { header: 'Orden Fabricación', key: 'of', width: 20 },
        { header: 'SKU Producto', key: 'sku', width: 25 },
        { header: 'Cant. Planta (App)', key: 'cantApp', width: 18 },
        { header: 'CEDI Planta (App)', key: 'cediApp', width: 18 },
        { header: 'Planificada SAP', key: 'sapPlanned', width: 18 },
        { header: 'Entregada SAP', key: 'sapCompleted', width: 18 },
        { header: 'Faltantes en SAP', key: 'faltantes', width: 18 },
        { header: 'Estado SAP B1', key: 'status', width: 18 },
        { header: 'Observación para Analistas', key: 'obs', width: 45 }
    ];

    const headerRow3 = wsDiscrepancias.getRow(1);
    headerRow3.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow3.height = 28;
    headerRow3.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD14747' } }; // Rojo Firplak alerta
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const discrepanciasData = [
        { id: 48338, of: '2261361', sku: 'VROP01-0003-000-0100', cantApp: 1, cediApp: 1, sapPlanned: 1, sapCompleted: 0, faltantes: 1, status: 'Liberado (R)' },
        { id: 48723, of: '2261707', sku: 'VROP01-0004-000-0100', cantApp: 4, cediApp: 4, sapPlanned: 4, sapCompleted: 0, faltantes: 4, status: 'Liberado (R)' },
        { id: 48738, of: '2261752', sku: 'VBAN01-0007-000-0100', cantApp: 1, cediApp: 1, sapPlanned: 1, sapCompleted: 0, faltantes: 1, status: 'Liberado (R)' },
        { id: 48745, of: '2261760', sku: 'VBAN01-0041-000-0100', cantApp: 1, cediApp: 1, sapPlanned: 1, sapCompleted: 0, faltantes: 1, status: 'Liberado (R)' },
        { id: 48763, of: '2261459', sku: 'VBAN01-0041-000-0100', cantApp: 4, cediApp: 4, sapPlanned: 4, sapCompleted: 3, faltantes: 1, status: 'Liberado (R)' },
        { id: 48966, of: '2261493', sku: 'VBAN01-0047-000-0100', cantApp: 5, cediApp: 5, sapPlanned: 5, sapCompleted: 0, faltantes: 5, status: 'Liberado (R)' },
        { id: 48870, of: '2261636', sku: 'VROP02-0007-000-0300', cantApp: 14, cediApp: 14, sapPlanned: 14, sapCompleted: 11, faltantes: 3, status: 'Liberado (R)' },
        { id: 48967, of: '2261495', sku: 'VBAN01-0047-000-0100', cantApp: 5, cediApp: 5, sapPlanned: 5, sapCompleted: 3, faltantes: 2, status: 'Liberado (R)' }
    ];

    discrepanciasData.forEach((d) => {
        const row = wsDiscrepancias.addRow({
            id: d.id,
            of: d.of,
            sku: d.sku,
            cantApp: d.cantApp,
            cediApp: d.cediApp,
            sapPlanned: d.sapPlanned,
            sapCompleted: d.sapCompleted,
            faltantes: d.faltantes,
            status: d.status,
            obs: `Terminado 100% en planta. Faltan ${d.faltantes} pz en SAP.`
        });
        row.height = 20;
        row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Arial', size: 9 };
            cell.alignment = { vertical: 'middle', horizontal: colNumber <= 9 ? 'center' : 'left' };
        });
    });

    // Guardar en la raíz del proyecto y en public/
    const outputPathRoot = path.join(__dirname, 'Reporte_Ordenes_Cerradas_FIRPLAK.xlsx');
    const publicDir = path.join(__dirname, 'public', 'reportes');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }
    const outputPathPublic = path.join(publicDir, 'Reporte_Ordenes_Cerradas_FIRPLAK.xlsx');

    await workbook.xlsx.writeFile(outputPathRoot);
    await workbook.xlsx.writeFile(outputPathPublic);

    console.log(`\n✅ ARCHIVO EXCEL GENERADO CON ÉXITO:`);
    console.log(`   1. Raíz: ${outputPathRoot}`);
    console.log(`   2. Public: ${outputPathPublic}`);
}

generarExcel();
