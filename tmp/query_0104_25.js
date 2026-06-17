const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vuiuorjzonpyobpelyld.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const id = 1970;
  console.log('Querying for molde id:', id);
  
  const queries = [
    { table: 'trazabilidad_ms', col: 'molde_id' },
    { table: 'trazabilidad_ms', col: 'molde' },
    { table: 'registros_trazabilidad', col: 'molde_id' },
    { table: 'query_trazabilidad_ms', col: 'molde_id' },
    { table: 'query_trazabilidad_ms', col: 'molde' },
  ];

  for (const q of queries) {
    const { data, error } = await supabase.from(q.table).select('*').eq(q.col, id).limit(50);
    if (error) {
      // console.log(`Error in ${q.table} on col ${q.col}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`\n=== Found in table: ${q.table} matching ${q.col} ===`);
      console.log(JSON.stringify(data, null, 2));
    }
  }
}
run();
