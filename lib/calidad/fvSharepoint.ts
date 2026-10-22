import type { FvRegistroRaw } from './fvCalidad';

// Acceso (solo servidor) a la lista SharePoint "Reporte de defectos Fibra de Vidrio" vía Microsoft Graph,
// con las mismas credenciales de aplicación que usa /api/sharepoint.
// Id de Graph del sitio https://firplaksa.sharepoint.com/sites/CalidadMPyTC
const FV_SITE_ID = 'firplaksa.sharepoint.com,adcb8623-7b81-4549-bbf9-656bbe50d264,6fbe00b8-acc2-469c-a94f-eb4bded6361c';
const FV_LIST_ID = '3a2ef9f8-15fa-41cf-b9ab-71ede60f1bdf';

async function getGraphToken(): Promise<string> {
    const tenantId = process.env.SHAREPOINT_TENANT_ID;
    const clientId = process.env.SHAREPOINT_CLIENT_ID;
    const clientSecret = process.env.SHAREPOINT_CLIENT_SECRET;
    if (!tenantId || !clientId || !clientSecret) {
        throw new Error('Faltan variables de entorno de SharePoint (SHAREPOINT_TENANT_ID / CLIENT_ID / CLIENT_SECRET)');
    }

    const resp = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials'
        }),
        cache: 'no-store'
    });
    const data = await resp.json();
    if (!data.access_token) throw new Error('No se pudo autenticar con Microsoft Graph');
    return data.access_token;
}

// Trae los registros FV creados en [desde, hasta) (fechas YYYY-MM-DD, UTC)
export async function fetchRegistrosFv(desde: string, hasta: string): Promise<FvRegistroRaw[]> {
    const token = await getGraphToken();
    const headers = {
        Authorization: `Bearer ${token}`,
        Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly'
    };

    const filter = `fields/Created ge '${desde}T00:00:00Z' and fields/Created lt '${hasta}T00:00:00Z'`;
    let url: string | undefined =
        `https://graph.microsoft.com/v1.0/sites/${FV_SITE_ID}/lists/${FV_LIST_ID}/items` +
        `?expand=fields(select=Title,Created,Linea,Numerodefactura,Buenestado,Defectos)` +
        `&$filter=${encodeURIComponent(filter)}&$top=999`;

    const rows: FvRegistroRaw[] = [];
    while (url) {
        const resp: Response = await fetch(url, { headers, cache: 'no-store' });
        const data = await resp.json();
        if (data.error) throw new Error(`SharePoint: ${data.error.message || data.error.code}`);
        for (const item of data.value || []) {
            const f = item.fields || {};
            rows.push({
                id: Number(item.id),
                created: String(f.Created || item.createdDateTime || ''),
                producto: String(f.Title ?? ''),
                linea: f.Linea ?? null,
                numeroFactura: f.Numerodefactura ?? null,
                buenEstado: typeof f.Buenestado === 'boolean' ? f.Buenestado : null,
                defectos: f.Defectos ?? null
            });
        }
        url = data['@odata.nextLink'];
    }
    return rows;
}
