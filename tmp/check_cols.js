const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vuiuorjzonpyobpelyld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCols() {
    console.log("--- COLUMNAS DE REGISTROS_TRAZABILIDAD ---");
    const { data, error } = await supabase
        .from('registros_trazabilidad')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error("Error:", error);
    } else if (data && data.length > 0) {
        console.log(Object.keys(data[0]).join(', '));
    } else {
        console.log("Tabla vacía o no encontrada.");
    }
}

checkCols();
