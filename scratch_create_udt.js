const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
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

const columns = [
  {"Name":"Originnum","Desc":"Originnum","Type":"db_Alpha","SubType":"st_None","Size":50},
  {"Name":"NroOP","Desc":"Nro OP","Type":"db_Alpha","SubType":"st_None","Size":50},
  {"Name":"SKU","Desc":"SKU","Type":"db_Alpha","SubType":"st_None","Size":100},
  {"Name":"DescArticulo","Desc":"Descripcion Articulo","Type":"db_Alpha","SubType":"st_None","Size":200},
  {"Name":"Planta","Desc":"Planta","Type":"db_Alpha","SubType":"st_None","Size":100},
  {"Name":"Familia","Desc":"Familia","Type":"db_Alpha","SubType":"st_None","Size":50},
  {"Name":"TipoOrden","Desc":"Tipo Orden","Type":"db_Alpha","SubType":"st_None","Size":50},
  {"Name":"CantPendiente","Desc":"Cant Pendiente","Type":"db_Float","SubType":"st_Quantity","Size":11},
  {"Name":"CantPendItem","Desc":"Cant Pend Item","Type":"db_Float","SubType":"st_Quantity","Size":11},
  {"Name":"CantidadTotal","Desc":"Cantidad total","Type":"db_Float","SubType":"st_Quantity","Size":11},
  {"Name":"DisponiblePT01","Desc":"Disponible PT01","Type":"db_Float","SubType":"st_Quantity","Size":11},
  {"Name":"FechaCreacionOP","Desc":"Fecha Creacion OP","Type":"db_Date","SubType":"st_None","Size":10},
  {"Name":"Estado","Desc":"Estado","Type":"db_Alpha","SubType":"st_None","Size":50},
  {"Name":"FechaRecoLib","Desc":"Fecha Reco Liberacion","Type":"db_Date","SubType":"st_None","Size":10},
  {"Name":"FechaRealLib","Desc":"Fecha Real Liberacion","Type":"db_Date","SubType":"st_None","Size":10},
  {"Name":"ConsumoParaLib","Desc":"Consumo Para Liberar","Type":"db_Float","SubType":"st_Quantity","Size":11},
  {"Name":"ColorLibTxt","Desc":"Color Liberacion Txt","Type":"db_Alpha","SubType":"st_None","Size":20},
  {"Name":"ColorLib","Desc":"Color Liberacion","Type":"db_Float","SubType":"st_Quantity","Size":11},
  {"Name":"CumpLib","Desc":"Cumplimiento Liberacion","Type":"db_Alpha","SubType":"st_None","Size":50},
  {"Name":"FechaEntLote","Desc":"Fecha Entrega Lote","Type":"db_Date","SubType":"st_None","Size":10},
  {"Name":"FechaRecoEnt","Desc":"Fecha Reco Entrega","Type":"db_Date","SubType":"st_None","Size":10},
  {"Name":"FechaCierreOP","Desc":"Fecha Cierre OP","Type":"db_Date","SubType":"st_None","Size":10},
  {"Name":"FechaIdealEnt","Desc":"Fecha Ideal Entr Prod","Type":"db_Date","SubType":"st_None","Size":10},
  {"Name":"ConsumoAmort","Desc":"Consumo Amort Planta","Type":"db_Float","SubType":"st_Quantity","Size":11},
  {"Name":"ColorProdTxt","Desc":"Color Produccion Txt","Type":"db_Alpha","SubType":"st_None","Size":20},
  {"Name":"ColorProd","Desc":"Color Produccion","Type":"db_Float","SubType":"st_Quantity","Size":11},
  {"Name":"CumpPlanta","Desc":"Cumplimiento Planta","Type":"db_Alpha","SubType":"st_None","Size":50},
  {"Name":"DiasRetrazo","Desc":"Dias Retrazo Firplak","Type":"db_Float","SubType":"st_Quantity","Size":11},
  {"Name":"ColorFirplakTxt","Desc":"Color Firplak Txt","Type":"db_Alpha","SubType":"st_None","Size":20},
  {"Name":"ColorFirplak","Desc":"Color Firplak","Type":"db_Float","SubType":"st_Quantity","Size":11},
  {"Name":"CumpFirplak","Desc":"Cumplimiento Firplak","Type":"db_Alpha","SubType":"st_None","Size":50},
  {"Name":"FechaPromEnt","Desc":"Fecha Prometida Entrega","Type":"db_Date","SubType":"st_None","Size":10},
  {"Name":"Destino","Desc":"Destino","Type":"db_Alpha","SubType":"st_None","Size":50},
  {"Name":"NumLote","Desc":"NumLote","Type":"db_Alpha","SubType":"st_None","Size":50},
  {"Name":"Molde","Desc":"Molde","Type":"db_Alpha","SubType":"st_None","Size":100},
  {"Name":"CapacidadMolde","Desc":"Capacidad Molde","Type":"db_Alpha","SubType":"st_None","Size":100},
  {"Name":"FechaCargaMolde","Desc":"Fecha Carga Molde","Type":"db_Date","SubType":"st_None","Size":10},
  {"Name":"Amortiguador","Desc":"Amortiguador","Type":"db_Float","SubType":"st_Quantity","Size":11},
  {"Name":"Cliente","Desc":"Cliente","Type":"db_Alpha","SubType":"st_None","Size":200}
];

async function createUDT() {
    try {
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

        console.log("1. Creando UDT [@F_SEMAFORO]...");
        let res = await fetch(`${baseUrl}/UserTablesMD`, {
            method: 'POST',
            headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                TableName: "F_SEMAFORO",
                TableDescription: "Semaforo Snapshot Produccion",
                TableType: "bott_NoObject"
            })
        });
        
        let text = await res.text();
        if(!res.ok && !text.includes("already exists")) {
            console.error("Error creating table:", text);
            return;
        }
        console.log("Tabla F_SEMAFORO lista.");

        for(let col of columns) {
            console.log(`2. Creando campo U_${col.Name}...`);
            let fieldRes = await fetch(`${baseUrl}/UserFieldsMD`, {
                method: 'POST',
                headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    TableName: "@F_SEMAFORO",
                    Name: col.Name,
                    Description: col.Desc,
                    Type: col.Type,
                    SubType: col.SubType,
                    Size: col.Size
                })
            });
            let fText = await fieldRes.text();
            if(!fieldRes.ok && !fText.includes("already exists")) {
                console.error(`Error creating field ${col.Name}:`, fText);
            }
        }
        
        console.log("UDT y columnas creadas.");

        // Create query
        const sqlQueryPayload = {
            SqlCode: "semaforo_v3",
            SqlName: "Semaforo V3 UDT",
            SqlText: `SELECT [U_Originnum], [U_NroOP], [U_SKU], [U_DescArticulo], [U_Planta], [U_Familia], [U_TipoOrden], [U_CantPendiente], [U_CantPendItem], [U_CantidadTotal], [U_DisponiblePT01], [U_FechaCreacionOP], [U_Estado], [U_FechaRecoLib], [U_FechaRealLib], [U_ConsumoParaLib], [U_ColorLibTxt], [U_ColorLib], [U_CumpLib], [U_FechaEntLote], [U_FechaRecoEnt], [U_FechaCierreOP], [U_FechaIdealEnt], [U_ConsumoAmort], [U_ColorProdTxt], [U_ColorProd], [U_CumpPlanta], [U_DiasRetrazo], [U_ColorFirplakTxt], [U_ColorFirplak], [U_CumpFirplak], [U_FechaPromEnt], [U_Destino], [U_NumLote], [U_Molde], [U_CapacidadMolde], [U_FechaCargaMolde], [U_Amortiguador], [U_Cliente] FROM [@F_SEMAFORO]`
        };
        
        let qRes = await fetch(`${baseUrl}/SQLQueries`, {
            method: 'POST',
            headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify(sqlQueryPayload)
        });
        
        if (!qRes.ok) {
            console.log("Intentando actualizar query...");
            await fetch(`${baseUrl}/SQLQueries('semaforo_v3')`, {
                method: 'PATCH',
                headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({ SqlText: sqlQueryPayload.SqlText })
            });
        }
        
        console.log("Query 'semaforo_v3' lista en Service Layer.");

    } catch(err) {
        console.error(err);
    }
}
createUDT();
