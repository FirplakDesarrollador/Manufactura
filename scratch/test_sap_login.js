const https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const sapUrl = process.env.SAP_API_URL || 'https://200.7.96.194:50000/b1s/v1/Login';
const sapDb = process.env.SAP_COMPANY_DB || 'Firplak_SA';
const sapUser = process.env.SAP_USERNAME || 'manager';
const sapPass = process.env.SAP_PASSWORD || '2023Fir#.*';

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const t0 = Date.now();
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, data, elapsed: Date.now() - t0 });
            });
        });
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Timeout after ${options.timeout}ms`));
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function run() {
    try {
        console.log('1. Logging in...');
        const loginUrl = new URL(sapUrl);
        const postData = JSON.stringify({ CompanyDB: sapDb, Password: sapPass, UserName: sapUser });
        const loginRes = await makeRequest({
            hostname: loginUrl.hostname,
            port: loginUrl.port,
            path: loginUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 20000
        }, postData);

        console.log(`Login status: ${loginRes.status} (${loginRes.elapsed}ms)`);
        const session = JSON.parse(loginRes.data);
        const sessionId = session.SessionId;
        console.log('SessionId:', sessionId);

        console.log('2. Querying ordenes_pendientes_clean...');
        const q1 = await makeRequest({
            hostname: loginUrl.hostname,
            port: loginUrl.port,
            path: "/b1s/v1/SQLQueries('ordenes_pendientes_clean')/List",
            method: 'GET',
            headers: {
                'Cookie': `B1SESSION=${sessionId}`,
                'Prefer': 'odata.maxpagesize=500'
            },
            timeout: 60000
        });
        console.log(`q1 status: ${q1.status} (${q1.elapsed}ms)`);
        const d1 = JSON.parse(q1.data);
        console.log(`q1 count: ${d1.value ? d1.value.length : 0}`);

        console.log('3. Querying ordenes_marmol_sl136...');
        const q2 = await makeRequest({
            hostname: loginUrl.hostname,
            port: loginUrl.port,
            path: "/b1s/v1/SQLQueries('ordenes_marmol_sl136')/List",
            method: 'GET',
            headers: {
                'Cookie': `B1SESSION=${sessionId}`,
                'Prefer': 'odata.maxpagesize=500'
            },
            timeout: 60000
        });
        console.log(`q2 status: ${q2.status} (${q2.elapsed}ms)`);
        const d2 = JSON.parse(q2.data);
        console.log(`q2 count: ${d2.value ? d2.value.length : 0}`);

    } catch (err) {
        console.error('Error:', err);
    }
}

run();
