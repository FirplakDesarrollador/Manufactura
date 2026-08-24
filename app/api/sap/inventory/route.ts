import { NextResponse } from 'next/server';
import https from 'https';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { skus, date } = await req.json();

    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json({ error: 'No SKUs provided' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const isHistorical = date && date < today;

    if (isHistorical) {
      const { data, error } = await supabase
        .from('inventario_bodega_historial')
        .select('*')
        .gte('fecha_consulta', `${date}T00:00:00.000Z`)
        .lt('fecha_consulta', `${date}T23:59:59.999Z`)
        .in('sku', skus);

      if (error) {
        console.error("Supabase historical inventory error:", error);
        return NextResponse.json({ error: 'Failed to fetch historical inventory' }, { status: 500 });
      }

      const inventory: Record<string, { mp04: number, mp01: number } | null> = {};
      skus.forEach((s: string) => inventory[s] = null);

      if (data) {
        data.forEach(item => {
          inventory[item.sku] = {
            mp04: item.stock_planta_mp04 || 0,
            mp01: item.stock_almacen_mp01 || 0
          };
        });
      }
      
      return NextResponse.json({ inventory });
    }


    const sapUrl = process.env.SAP_API_URL || 'https://200.7.96.194:50000/b1s/v1/Login';
    const baseUrl = sapUrl.substring(0, sapUrl.lastIndexOf('/Login'));
    const agent = new https.Agent({ rejectUnauthorized: false });

    const loginBody = {
      CompanyDB: process.env.SAP_COMPANY_DB || "Firplak_SA",
      Password: process.env.SAP_PASSWORD || "2023Fir#.*",
      UserName: process.env.SAP_USERNAME || "manager"
    };

    // Helper to make https requests bypassing fetch SSL issues in Next.js
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

    const inventory: Record<string, { mp04: number, mp01: number } | null> = {};
    skus.forEach(s => inventory[s] = null);

    // Chunk SKUs into groups of 20 to avoid URL length limits
    const chunkSize = 20;
    for (let i = 0; i < skus.length; i += chunkSize) {
      const chunk = skus.slice(i, i + chunkSize);
      
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
          
          inventory[item.ItemCode] = {
            mp04: mp04 ? (mp04.InStock || 0) : 0,
            mp01: mp01 ? (mp01.InStock || 0) : 0
          };
        });
      }
    }

    return NextResponse.json({ inventory });

  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
