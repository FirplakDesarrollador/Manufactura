const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://vuiuorjzonpyobpelyld.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXVvcmp6b25weW9icGVseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY4MDM2OTksImV4cCI6MjAyMjM3OTY5OX0.ARDJuGYox9CY3K8z287nEEFBmWVLTs6yCLkHHeMMTKw'
);

const supabaseTH = createClient(
  'https://jdtjtkncptwqdhlxmzds.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGp0a25jcHR3cWRobHhtemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTExODQwMDAsImV4cCI6MjAwNjc2MDAwMH0.CKSoqx81iXamo3ftitaQwOiyJ3OsIOMO8xlxwEBp5oE'
);

async function check() {
  let out = '';
  const log = (...args) => {
    out += args.join(' ') + '\n';
  };

  const { data: empleados, error: empErr } = await supabaseTH.from('empleados').select('*');
  if (empErr) {
    log('Empleados error:', empErr);
  } else {
    log('Total employees:', empleados.length);
    const plantas = new Set(empleados.map(e => e.planta));
    log('Unique plantas in empleados:', JSON.stringify(Array.from(plantas)));
    const active = empleados.filter(e => e.activo);
    log('Active employees:', active.length);
    const activePlantas = new Set(active.map(e => e.planta));
    log('Unique plantas in active employees:', JSON.stringify(Array.from(activePlantas)));

    const activeCargosByPlanta = {};
    active.forEach(e => {
      if (!activeCargosByPlanta[e.planta]) activeCargosByPlanta[e.planta] = new Set();
      if (e.cargo) activeCargosByPlanta[e.planta].add(e.cargo);
    });

    for (const p in activeCargosByPlanta) {
      log(`Plant: ${p}, Total active cargos: ${activeCargosByPlanta[p].size}`);
      log(`Sample cargos:`, JSON.stringify(Array.from(activeCargosByPlanta[p]).slice(0, 10)));
    }
  }

  fs.writeFileSync('tmp/out_th.txt', out);
  console.log('Done!');
}

check();
