const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vuiuorjzonpyobpelyld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectMoldes() {
    console.log("--- INSPECCIONANDO EL TIEMPO DE LA ESTRUCTURA DE MOLDES ---");
    const { data: moldes, error } = await supabase
        .from('moldes')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error("Error al consultar moldes:", error);
    } else if (moldes && moldes.length > 0) {
        console.log("Columnas de moldes:", Object.keys(moldes[0]).join(', '));
    } else {
        console.log("No se encontraron moldes.");
    }
}

inspectMoldes();
