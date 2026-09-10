const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Firplak_Sap2012#',
    server: 'itplakinfo',
    database: 'Planos_Symphony',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        requestTimeout: 300000
    }
};

async function checkCount() {
    try {
        console.log("Conectando a itplakinfo...");
        await sql.connect(config);
        console.log("Ejecutando EXEC [Planos_Symphony].[dbo].[SEMAFORO]...");
        
        const result = await sql.query(`EXEC [Planos_Symphony].[dbo].[SEMAFORO]`);
        
        console.log(`\n================================`);
        console.log(`TOTAL DE REGISTROS DEVUELTOS: ${result.recordset ? result.recordset.length : 0}`);
        console.log(`================================\n`);
        
    } catch (err) {
        console.error("Error ejecutando la consulta:", err);
    } finally {
        await sql.close();
    }
}

checkCount();
