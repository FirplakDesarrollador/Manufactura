const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Firplak_Sap2012#',
    server: 'itplakinfo',
    database: 'Planos_Symphony',
    options: { encrypt: false, trustServerCertificate: true }
};

async function checkSP() {
    try {
        await sql.connect(config);
        const result = await sql.query(`EXEC sp_helptext '[dbo].[SP_ACTUALIZAR_SEMAFORO_SNAPSHOT]'`);
        const lines = result.recordset.map(r => r.Text).join('');
        console.log(lines);
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}
checkSP();
