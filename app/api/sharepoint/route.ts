import { NextResponse } from 'next/server';

export async function GET() {
  const tenantId = process.env.SHAREPOINT_TENANT_ID;
  const clientId = process.env.SHAREPOINT_CLIENT_ID;
  const clientSecret = process.env.SHAREPOINT_CLIENT_SECRET;
  const siteId = process.env.SHAREPOINT_SITE_ID;
  const listId = process.env.SHAREPOINT_LIST_ID;
  const tecnicosListId = process.env.SHAREPOINT_LIST_TECNICOS_ID;

  if (!tenantId || !clientId || !clientSecret || !siteId || !listId || !tecnicosListId) {
    return NextResponse.json({ error: 'Missing SharePoint environment variables' }, { status: 500 });
  }

  try {
    // 1. Get Access Token
    const tokenResp = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        scope: 'https://graph.microsoft.com/.default',
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
      cache: 'no-store'
    });

    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) {
      return NextResponse.json({ error: 'Failed to authenticate with Microsoft Graph', details: tokenData }, { status: 401 });
    }
    const token = tokenData.access_token;

    // 2. Fetch list items simultaneously
    const [itemsResp, tecnicosResp] = await Promise.all([
      fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields&$top=5000`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }),
      fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${tecnicosListId}/items?expand=fields&$top=5000`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      })
    ]);

    const itemsData = await itemsResp.json();
    const tecnicosData = await tecnicosResp.json();

    if (!itemsData.value || !tecnicosData.value) {
      return NextResponse.json({ error: 'Failed to fetch items from SharePoint', itemsData, tecnicosData }, { status: 500 });
    }

    // Helper: always return a string, even for numeric SharePoint fields
    const s = (v: any) => v == null ? '' : String(v);

    // 3. Map to format expected by frontend
    const mantenimientosRaw = itemsData.value.map((item: any) => {
      const f = item.fields || {};
      return {
        "TITULO": s(f.Title),
        "MAQUINA": s(f.MAQUINA),
        "PLANTA": s(f.PLANTA),
        "TIEMPO DE EJECUCION": s(f.TIEMPODEEJECUCION),
        "IDTECS": s(f.IDTECS),
        "TIPO DE INTERVENCION": s(f.TIPODEINTERVENCION),
        "FRECUENCIA": s(f.FRECUENCIA),
        "REF FRECUENCIA": s(f.REFFRECUENCIA),
        "DETALLE": s(f.DETALLEDELMANTENIMIENTO)
      };
    });

    const jornadasRaw = tecnicosData.value.map((item: any) => {
      const f = item.fields || {};
      return {
        "ID": s(f.IDTEC),
        "NOMBRE": s(f.Title),
        "TURNO": s(f.Turno),
        "DOCUMENTO": s(f.Documento),
        "TITULO": ''
      };
    });

    return NextResponse.json({ success: true, data: { mantenimientos: mantenimientosRaw, tecnicos: jornadasRaw } });
  } catch (error: any) {
    console.error('Error fetching SharePoint data:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
