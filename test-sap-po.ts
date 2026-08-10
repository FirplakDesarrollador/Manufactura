import { loginToSAP } from './lib/sap';
import fs from 'fs';

async function testSAP() {
    try {
        const loginData = await loginToSAP();
        // Attempt to run SQL query
        const sqlQuery = {
            SqlCode: "ExecSemaforo",
            SqlName: "ExecSemaforo",
            SqlText: "EXEC [Planos_Symphony].[dbo].[SEMAFORO]"
        };
        
        // 1. Create query (might fail if exists, that's fine)
        const createRes = await fetch(`https://200.7.96.194:50000/b1s/v1/SQLQueries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': loginData.cookieHeader,
            },
            body: JSON.stringify(sqlQuery)
        });
        
        console.log("Create status:", createRes.status);
        if(!createRes.ok) console.log("Create error:", await createRes.text());
        
        // 2. Execute query
        const res = await fetch(`https://200.7.96.194:50000/b1s/v1/SQLQueries('ExecSemaforo')/List`, {
            method: 'GET',
            headers: {
                'Cookie': loginData.cookieHeader,
            }
        });
        
        console.log("Execute status:", res.status);
        if(!res.ok) console.log("Execute error:", await res.text());
        else {
            const data = await res.json();
            fs.writeFileSync('sap-response.json', JSON.stringify(data, null, 2));
            console.log("Saved to sap-response.json");
        }
    } catch (e) {
        console.error(e);
    }
}

testSAP();
