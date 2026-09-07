import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { loginToSAP } from '@/lib/sap';

export async function POST(req: Request) {
  try {
    const { skus, date } = await req.json();

    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json({ error: 'No SKUs provided' }, { status: 400 });
    }

    // Clean SKUs (trim spaces and filter out empty strings)
    const cleanSkus = Array.from(new Set(skus.map((s: string) => String(s).trim()))).filter(Boolean);

    const today = new Date().toISOString().split('T')[0];
    const isHistorical = date && date < today;

    if (isHistorical) {
      // 1. Try exact date search in Supabase
      let { data, error } = await supabase
        .from('inventario_bodega_historial')
        .select('*')
        .gte('fecha_consulta', `${date}T00:00:00.000Z`)
        .lt('fecha_consulta', `${date}T23:59:59.999Z`)
        .in('sku', cleanSkus);

      if (error) {
        console.error("Supabase historical inventory error:", error);
        return NextResponse.json({ error: 'Failed to fetch historical inventory' }, { status: 500 });
      }

      // If no records for exact date, try to find latest records on or before that date
      if (!data || data.length === 0) {
        const { data: fallbackData } = await supabase
          .from('inventario_bodega_historial')
          .select('*')
          .lte('fecha_consulta', `${date}T23:59:59.999Z`)
          .in('sku', cleanSkus)
          .order('fecha_consulta', { ascending: false });

        if (fallbackData && fallbackData.length > 0) {
          data = fallbackData;
        }
      }

      const inventory: Record<string, { mp04: number, mp01: number } | null> = {};
      cleanSkus.forEach((s: string) => inventory[s] = null);

      if (data) {
        data.forEach(item => {
          const itemSkuTrimmed = String(item.sku).trim();
          const skuKey = cleanSkus.find(s => s.toUpperCase() === itemSkuTrimmed.toUpperCase()) || itemSkuTrimmed;
          if (!inventory[skuKey]) {
            inventory[skuKey] = {
              mp04: Number(item.stock_planta_mp04) || 0,
              mp01: Number(item.stock_almacen_mp01) || 0
            };
          }
        });
      }
      
      return NextResponse.json({ inventory, isHistorical: true });
    }

    // Live SAP Query using loginToSAP
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const loginData = await loginToSAP();
    const baseUrl = process.env.SAP_API_URL?.replace('/Login', '') || 'https://200.7.96.194:50000/b1s/v1';

    const inventory: Record<string, { mp04: number, mp01: number } | null> = {};
    cleanSkus.forEach(s => inventory[s] = null);

    // Chunk SKUs into groups of 20 to avoid URL length limits
    const chunkSize = 20;
    for (let i = 0; i < cleanSkus.length; i += chunkSize) {
      const chunk = cleanSkus.slice(i, i + chunkSize);
      
      const filterStr = chunk.map(s => `ItemCode eq '${s}'`).join(' or ');
      const query = `?$select=ItemCode,ItemWarehouseInfoCollection&$filter=${encodeURIComponent(filterStr)}`;
      
      const response = await fetch(`${baseUrl}/Items${query}`, {
        method: 'GET',
        headers: {
          'Cookie': loginData.cookieHeader,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const itemResData = await response.json();
        if (itemResData && Array.isArray(itemResData.value)) {
          itemResData.value.forEach((item: any) => {
            const itemCodeClean = String(item.ItemCode || '').trim();
            const mp04 = (item.ItemWarehouseInfoCollection || []).find(
              (w: any) => w.WarehouseCode && w.WarehouseCode.toUpperCase().replace(/\s+/g, '') === 'MP-04'
            );
            const mp01 = (item.ItemWarehouseInfoCollection || []).find(
              (w: any) => w.WarehouseCode && w.WarehouseCode.toUpperCase().replace(/\s+/g, '') === 'MP-01'
            );
            
            const matchingSku = cleanSkus.find(s => s.toUpperCase() === itemCodeClean.toUpperCase()) || itemCodeClean;
            inventory[matchingSku] = {
              mp04: mp04 ? Number(mp04.InStock || 0) : 0,
              mp01: mp01 ? Number(mp01.InStock || 0) : 0
            };
          });
        }
      } else {
        const errText = await response.text();
        console.error("SAP Items fetch error:", response.status, errText);
      }
    }

    // Save live inventory snapshot to Supabase asynchronously
    const inventoryResults = Object.entries(inventory)
      .filter(([_, val]) => val !== null)
      .map(([sku, val]) => ({
        sku,
        stock_planta_mp04: val?.mp04 || 0,
        stock_almacen_mp01: val?.mp01 || 0,
        fecha_consulta: new Date().toISOString()
      }));

    if (inventoryResults.length > 0) {
      supabase.from('inventario_bodega_historial').insert(inventoryResults).then(({ error }) => {
        if (error) console.error("Error saving inventory snapshot:", error);
      });
    }

    return NextResponse.json({ inventory, isHistorical: false });

  } catch (error: any) {
    console.error("API error in /api/sap/inventory:", error);
    return NextResponse.json({ error: error.message || 'Error al consultar SAP' }, { status: 500 });
  }
}

