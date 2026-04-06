const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vuiuorjzonpyobpelyld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectRow() {
    console.log("--- INSPECCIONANDO UN REGISTRO COMPLETO DE TRAZABILIDAD ---");
    const { data: records, error } = await supabase
        .from('registros_trazabilidad')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error("Error al consultar:", error);
    } else if (records && records.length > 0) {
        // Obtenemos las claves
        const keys = Object.keys(records[0]);
        console.log("Columnas:", keys.length);
        
        // El registro completo
        console.log(JSON.stringify(records[0], null, 2));
    } else {
        console.log("No se encontraron registros.");
    }
}

inspectRow();
