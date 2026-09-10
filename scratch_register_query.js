import fs from 'fs';

const envPath = '.env';
const envFile = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/(^"|"$)/g, '');
    }
  }
});
Object.assign(process.env, envVars);
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const sqlText = `SELECT [Originnum], [Nro OP], [SKU], [Descripción Artículo], [Planta], [Familia], [Tipo Orden], [Cant. Pendiente], [Cant. Pend. Item], [Cantidad total], [Disponible PT01], [Fecha Creación OP], [Estado], [Fecha Recomendada Liberación], [Fecha Real Liberación], [Consumo Para Liberar], [Color Liberación Txt], [Color Liberación], [Cumplimiento Liberación], [Fecha Entrega Lote], [Fecha Recomendada de Entrega], [Fecha Cierre OP], [Fecha Ideal Entrega Producción], [Consumo Amortiguador Planta], [Color Producción Txt], [Color Producción], [Cumplimiento Planta], [Dias Retrazo Firplak], [Color Firplak Txt], [Color Firplak], [Cumplimiento Firplak], [Fecha Prometida Entrega Item], [Destino], [NumLote], [Molde], [Capacidad Molde], [Fecha Carga Molde], [Amortiguador], [Cliente] FROM SEMAFORO_SNAPSHOT`;

async function main() {
  const loginRes = await fetch(process.env.SAP_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      CompanyDB: process.env.SAP_COMPANY_DB,
      Password: process.env.SAP_PASSWORD,
      UserName: process.env.SAP_USERNAME
    })
  });
  const loginData = await loginRes.json();
  const routeIdMatch = (loginRes.headers.get("set-cookie") || "").match(/ROUTEID=([^;]+)/);
  const cookieHeader = `B1SESSION=${loginData.SessionId}; ROUTEID=${routeIdMatch ? routeIdMatch[1] : ""}`;
  
  const baseUrl = process.env.SAP_API_URL.replace('/Login', '');

  console.log("=== Registrando query en Service Layer con columnas explicitas ===");
  try {
    const url = `${baseUrl}/SQLQueries`;
    const res = await fetch(url, { 
        method: 'POST',
        headers: { 
            'Cookie': cookieHeader,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "SqlCode": "semaforo_v2",
            "SqlName": "semaforo_v2",
            "SqlText": sqlText
        })
    });
    
    if(res.ok || res.status === 201) {
        console.log("Exito: Query registrada en Service Layer.");
    } else {
        console.log("Error POST:", res.status, await res.text());
        
        // Si ya existe, intentamos actualizar
        if(res.status === 400) {
             console.log("Intentando actualizar con PATCH...");
             const patchRes = await fetch(`${url}('semaforo_v2')`, {
                method: 'PATCH',
                headers: { 
                    'Cookie': cookieHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "SqlText": sqlText
                })
             });
             console.log("Patch status:", patchRes.status, await patchRes.text());
        }
    }
  } catch (err) {
    console.log("Error:", err.message);
  }
}

main();
