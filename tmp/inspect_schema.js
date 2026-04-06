const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vuiuorjzonpyobpelyld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
    console.log("--- COLUMNAS DE REGISTROS_TRAZABILIDAD ---");
    const { data: records, error } = await supabase
        .from('registros_trazabilidad')
        .select('*')
        .limit(1);
    
    if (error) {
        console.log("Error sup:", error.message, error.details);
    } else if (records && records.length > 0) {
        const keys = Object.keys(records[0]);
        console.log("Total columnas:", keys.length);
        // Print in chunks to avoid truncation
        for (let i = 0; i < keys.length; i += 5) {
            console.log(keys.slice(i, i + 5).join(', '));
        }
    }

    console.log("\n--- COLUMNAS DE MOLDES ---");
    const { data: moldes, error: errorM } = await supabase
        .from('moldes')
        .select('*')
        .limit(1);
    
    if (errorM) {
        console.log("Error moldes:", errorM.message);
    } else if (moldes && moldes.length > 0) {
        const keysM = Object.keys(moldes[0]);
        console.log("Total columnas:", keysM.length);
        for (let i = 0; i < keysM.length; i += 5) {
            console.log(keysM.slice(i, i + 5).join(', '));
        }
    }
}

inspectSchema();
