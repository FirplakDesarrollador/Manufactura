const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vuiuorjzonpyobpelyld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
    console.log("--- ULTIMOS 5 REGISTROS DE TRAZABILIDAD ---");
    const { data: traza, error: errT } = await supabase
        .from('registros_trazabilidad')
        .select('id, orden_fabricacion_id, molde_id, registrer, pintura_fecha, estado')
        .order('id', { ascending: false })
        .limit(5);
    
    if (errT) console.error("Error trazabilidad:", errT);
    else traza.forEach(t => console.log(`ID: ${t.id} | OF: ${t.orden_fabricacion_id} | Molde: ${t.molde_id} | Registrer: ${t.registrer} | Fecha: ${t.pintura_fecha} | Estado: ${t.estado}`));

    console.log("\n--- ULTIMOS 5 MOLDES ACTUALIZADOS ---");
    const { data: moldes, error: errM } = await supabase
        .from('moldes')
        .select('id, serial, estado, vueltas_actuales, vueltas_acumuladas, modified_at')
        .order('modified_at', { ascending: false })
        .limit(5);
    
    if (errM) console.error("Error moldes:", errM);
    else moldes.forEach(m => console.log(`ID: ${m.id} | Serial: ${m.serial} | Estado: ${m.estado} | V.Actuales: ${m.vueltas_actuales} | V.Acumuladas: ${m.vueltas_acumuladas} | Mod: ${m.modified_at}`));
}

checkData();
