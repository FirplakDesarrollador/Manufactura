import { NextResponse } from 'next/server';

interface SemaforoApiRow {
  Planta?: string;
  Familia?: string;
  "Cumplimiento Planta"?: string;
  "Fecha Ideal Entrega Producción"?: string;
  [key: string]: any;
}

interface SemaforoApiResponse {
  error: boolean;
  message: string;
  response: SemaforoApiRow[];
}

const PLANT_ALIASES: Record<string, string[]> = {
  MS: ['MS', 'MARMOL', 'MÁRMOL SINTÉTICO', 'MARMOL SINTETICO'],
  FV: ['FV', 'FIBRA', 'FIBRA DE VIDRIO'],
  MBL: ['ESPGAB', 'MBLP', 'MUEBLE', 'MBL', 'MUEBLES'],
  CEFI: ['MBL CEFI', 'PFZ-CEMA', 'CEFI', 'MBL-CEFI'],
  QZ: ['QUARTZSTONE', 'RTM', 'RTMM', 'CUARZO', 'QZ']
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let fecha = searchParams.get('fecha'); // Expects 'YYYY-MM-DD' or 'DD/MM/YYYY'

  if (!fecha) {
    // Default to yesterday in YYYY-MM-DD
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const y = yest.getFullYear();
    const m = String(yest.getMonth() + 1).padStart(2, '0');
    const d = String(yest.getDate()).padStart(2, '0');
    fecha = `${y}-${m}-${d}`;
  }

  // Normalize date format if passed as DD/MM/YYYY
  if (fecha.includes('/')) {
    const parts = fecha.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        fecha = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }

  const apiUrl = process.env.SEMAFORO_API_URL || "https://hispanic-paintings-rio-kit.trycloudflare.com/semaforo";
  const apiKey = process.env.SEMAFORO_API_KEY || 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3R5cGUiOiJ1c2VyIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjQyNzY3Njg3LCJleHBpcmVkX3VwIjoxNjQyNzY4NzAxfQ.6eYkakHhU6IvM_Nqd7c6hdAhY79iDoG2RUp9Hi9-2us';

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'api-key': apiKey,
        'ngrok-skip-browser-warning': 'true',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, error: `Error consultando Semáforo: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const result: SemaforoApiResponse = await response.json();
    const rows = result.response || [];

    const plantResults: Record<string, { cumplio: number; noCumplio: number; total: number; nivelServicio: number }> = {};

    for (const [plantKey, aliases] of Object.entries(PLANT_ALIASES)) {
      const plantRows = rows.filter(r => {
        const p = (r.Planta || '').toUpperCase().trim();
        const f = (r.Familia || '').toUpperCase().trim();
        return aliases.some(a => p.includes(a) || f.includes(a));
      });

      const onDateRows = plantRows.filter(r => {
        const d = r['Fecha Ideal Entrega Producción'] || '';
        return d.startsWith(fecha!);
      });

      let cumplio = 0;
      let noCumplio = 0;

      onDateRows.forEach(r => {
        const c = (r['Cumplimiento Planta'] || '').trim();
        if (c === 'Cumplió' || c === 'Si cumplió') {
          cumplio++;
        } else if (c === 'No Cumplió' || c === 'No cumplió') {
          noCumplio++;
        }
      });

      const total = cumplio + noCumplio;
      const rawPct = total > 0 ? (cumplio / total) * 100 : 0;
      const rounded1Decimal = Math.round(rawPct * 10) / 10;

      plantResults[plantKey] = {
        cumplio,
        noCumplio,
        total,
        nivelServicio: rounded1Decimal
      };
    }

    return NextResponse.json({
      success: true,
      fecha,
      plantas: plantResults
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al calcular nivel de servicio' },
      { status: 500 }
    );
  }
}
