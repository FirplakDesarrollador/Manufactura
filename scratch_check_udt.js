const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Firplak_Sap2012#',
    server: 'itplakinfo',
    database: 'Firplak_SA',
    options: { encrypt: false, trustServerCertificate: true }
};

async function checkRows() {
    try {
        await sql.connect(config);
        const result = await sql.query(`SELECT COUNT(*) as count FROM [@F_SEMAFORO]`);
        console.log(result.recordset);
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}
checkRows();
