import { loginToSAP } from './lib/sap';

(async () => {
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const loginData = await loginToSAP();
        
        // Fetch queries
        const url = `https://200.7.96.194:50000/b1s/v1/SQLQueries?$filter=SqlName eq 'FPK - Semaforo - DJP'`;
        console.log("Fetching:", url);
        
        const res = await fetch(url, {
            headers: { 'Cookie': loginData.cookieHeader }
        });
        
        console.log("Status:", res.status);
        const data = await res.text();
        console.log("Data:", data);
    } catch (e) {
        console.error(e);
    }
})();
