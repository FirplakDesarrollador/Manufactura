async function testApi() {
    try {
        const res = await fetch('http://localhost:3000/api/sap/semaforo');
        const data = await res.json();
        console.log(`Success: ${data.success}`);
        console.log(`Source: ${data.source}`);
        if(data.data) {
            console.log(`Records: ${data.data.length}`);
            if(data.data.length > 0) {
                console.log("Sample Record:", JSON.stringify(data.data[0], null, 2));
            }
        } else {
            console.log(data);
        }
    } catch(err) {
        console.error(err);
    }
}
testApi();
