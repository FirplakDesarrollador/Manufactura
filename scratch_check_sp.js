const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Firplak_Sap2012#',
    server: 'itplakinfo',
    database: 'Firplak_SA',
    options: { encrypt: false, trustServerCertificate: true }
};

async function checkSP() {
    try {
        await sql.connect(config);
        const result = await sql.query(`EXEC [Planos_Symphony].[dbo].[SEMAFORO]`);
        console.log(`Filas de EXEC SEMAFORO: ${result.recordset.length}`);
        
        const result2 = await sql.query(`SELECT COUNT(*) as cnt FROM [Firplak_SA].[dbo].[SEMAFORO_SNAPSHOT]`);
        console.log(`Filas de SEMAFORO_SNAPSHOT: ${result2.recordset[0].cnt}`);
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}
checkSP();
