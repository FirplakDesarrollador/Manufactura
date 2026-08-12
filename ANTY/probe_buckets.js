const https = require('https');

const buckets = ['repuestos', 'repuestos_mantenimiento', 'fotos', 'imagenes', 'parts', 'inventory', 'assets'];
const filename = '418.jpeg'; // From my previous database check
const baseUrl = 'https://vuiuorjzonpyobpelyld.supabase.co/storage/v1/object/public';

async function probeBuckets() {
    for (const bucket of buckets) {
        const url = `${baseUrl}/${bucket}/${encodeURIComponent(filename)}`;
        console.log(`Checking: ${url}`);

        try {
            const status = await new Promise((resolve) => {
                https.get(url, (res) => {
                    resolve(res.statusCode);
                }).on('error', () => resolve(null));
            });
            console.log(`Status for ${bucket}: ${status}`);
            if (status === 200) {
                console.log(`FOUND! Valid bucket: ${bucket}`);
                return;
            }
        } catch (e) {
            console.error(`Error checking ${bucket}:`, e.message);
        }
    }
}

probeBuckets();
