const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Firplak_Sap2012#',
    server: 'itplakinfo',
    database: 'Firplak_SA',
    options: { encrypt: false, trustServerCertificate: true }
};

async function getCols() {
    try {
        await sql.connect(config);
        const result = await sql.query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'SEMAFORO_SNAPSHOT'
        `);
        console.log(JSON.stringify(result.recordset, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}
getCols();
