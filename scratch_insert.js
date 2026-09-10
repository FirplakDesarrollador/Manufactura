const sql = require('mssql');
const fs = require('fs');

const config = {
    user: 'sa',
    password: 'Firplak_Sap2012#',
    server: 'itplakinfo',
    options: { encrypt: false, trustServerCertificate: true }
};

async function insertUDT() {
    try {
        await sql.connect(config);
        const query = fs.readFileSync('update_udt.sql', 'utf8');
        await sql.query(query);
        console.log("Datos insertados correctamente en [@F_SEMAFORO]");
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}
insertUDT();
