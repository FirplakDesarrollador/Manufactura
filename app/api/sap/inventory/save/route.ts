import { NextResponse } from 'next/server';
import https from 'https';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    // 1. Fetch live furniture data
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const apiKey = (process.env.NEXT_PUBLIC_API_KEY || '').replace(/"/g, '');
    
    if (!apiUrl) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_API_URL is missing' }, { status: 500 });
    }

    const res = await fetch(apiUrl, {
      headers: {
        'api-key': apiKey,
        'ngrok-skip-browser-warning': 'true'
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch live API data' }, { status: 500 });
    }

    const rawText = await res.text();
    let muebles: any[] = [];
    
    try {
      const data = JSON.parse(rawText);
      if (Array.isArray(data)) {
        muebles = data;
      } else if (data && Array.isArray(data.response)) {
        muebles = data.response;
      } else if (data && Array.isArray(data.data)) {
        muebles = data.data;
      }
    } catch (e) {
      console.error("Failed to parse API response as JSON:", e);
      return NextResponse.json({ error: 'Failed to parse live API data' }, { status: 500 });
    }

    // 2. Extract unique SKUs for Cantos and Tableros
    const skuMap = new Map<string, string>(); // sku -> descripcion
    
    muebles.forEach((mueble) => {
      if (mueble.componentes) {
        try {
          let comps: any[] = [];
          if (typeof mueble.componentes === 'string') {
            comps = JSON.parse(mueble.componentes);
          } else if (Array.isArray(mueble.componentes)) {
            comps = mueble.componentes;
          }
          comps.forEach((comp: any) => {
            const isCantoOrTablero = comp.componente.toUpperCase().startsWith("CANTO") || comp.componente.toUpperCase().startsWith("TABLERO");
            if (isCantoOrTablero) {
              skuMap.set(comp.sku, comp.componente);
            }
          });
        } catch(e) {}
      }
    });

    const skusToFetch = Array.from(skuMap.keys());
    if (skusToFetch.length === 0) {
      return NextResponse.json({ message: 'No Cantos or Tableros found to sync' });
    }

    // 3. SAP Login
    const sapUrl = process.env.SAP_API_URL || 'https://200.7.96.194:50000/b1s/v1/Login';
    const baseUrl = sapUrl.substring(0, sapUrl.lastIndexOf('/Login'));
    const agent = new https.Agent({ rejectUnauthorized: false });

    const loginBody = {
      CompanyDB: process.env.SAP_COMPANY_DB || "Firplak_SA",
      Password: process.env.SAP_PASSWORD || "2023Fir#.*",
      UserName: process.env.SAP_USERNAME || "manager"
    };

    const makeRequest = (urlStr: string, method: string, body?: any, cookie?: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const options: https.RequestOptions = {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method,
          agent,
          headers: {
            'Content-Type': 'application/json'
          }
        };
        if (cookie) options.headers!['Cookie'] = cookie;

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const setCookie = res.headers['set-cookie'];
            try {
              const parsed = JSON.parse(data);
              resolve({ status: res.statusCode, data: parsed, cookies: setCookie });
            } catch(e) {
              resolve({ status: res.statusCode, data, cookies: setCookie });
            }
          });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
    };

    const loginRes = await makeRequest(`${baseUrl}/Login`, 'POST', loginBody);

    if (loginRes.status !== 200) {
      console.error("SAP Login failed", loginRes.data);
      return NextResponse.json({ error: 'SAP Login failed' }, { status: 500 });
    }

    const sessionId = loginRes.data.SessionId;
    let cookieStr = `B1SESSION=${sessionId}`;
    if (loginRes.cookies) {
      cookieStr = loginRes.cookies.join('; ');
    }

    // 4. Fetch SAP Inventory
    const inventoryResults: any[] = [];
    const chunkSize = 20;
    for (let i = 0; i < skusToFetch.length; i += chunkSize) {
      const chunk = skusToFetch.slice(i, i + chunkSize);
      
      const filterStr = chunk.map(s => `ItemCode eq '${s}'`).join(' or ');
      const query = `?$select=ItemCode,ItemWarehouseInfoCollection&$filter=${encodeURIComponent(filterStr)}`;
      
      const itemRes = await makeRequest(`${baseUrl}/Items${query}`, 'GET', null, cookieStr);

      if (itemRes.status === 200 && itemRes.data && Array.isArray(itemRes.data.value)) {
        itemRes.data.value.forEach((item: any) => {
          const mp04 = (item.ItemWarehouseInfoCollection || []).find(
            (w: any) => w.WarehouseCode && w.WarehouseCode.toUpperCase() === 'MP-04'
          );
          const mp01 = (item.ItemWarehouseInfoCollection || []).find(
            (w: any) => w.WarehouseCode && w.WarehouseCode.toUpperCase() === 'MP-01'
          );
          
          inventoryResults.push({
            sku: item.ItemCode,
            descripcion: skuMap.get(item.ItemCode) || '',
            stock_planta_mp04: mp04 ? (mp04.InStock || 0) : 0,
            stock_almacen_mp01: mp01 ? (mp01.InStock || 0) : 0,
            fecha_consulta: new Date().toISOString()
          });
        });
      }
    }

    if (inventoryResults.length === 0) {
      return NextResponse.json({ message: 'No inventory data fetched from SAP' });
    }

    // 5. Save to Supabase
    const { data: insertedData, error } = await supabase
      .from('inventario_bodega_historial')
      .insert(inventoryResults);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: 'Failed to insert data to Supabase' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Successfully synced ${inventoryResults.length} items.` });

  } catch (error: any) {
    console.error("Save API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
