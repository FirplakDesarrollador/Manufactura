const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vuiuorjzonpyobpelyld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTrazabilidadMS() {
    console.log("--- CHEQUEANDO TABLA trazabilidad_ms ---");
    const { data, error } = await supabase
        .from('trazabilidad_ms')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error("Error:", error.message);
    } else if (data && data.length > 0) {
        console.log("¡ENCONTRADA! Columnas:", Object.keys(data[0]).join(', '));
    } else {
        console.log("Tabla vacía o no encontrada.");
    }
}

checkTrazabilidadMS();
