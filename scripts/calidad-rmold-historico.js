// Histórico de Calidad RMOLD (Reparación de Moldes) desde la hoja MOLDES de los Excel "NO CONFORMES <MES> <AÑO>.xlsm".
// Uso: node scripts/calidad-rmold-historico.js <excel1> [excel2 …]
// Genera datos-locales/calidad_rmold_historico.sql (no se sube: datos-locales está en .gitignore).
//
// El Excel solo trae totales por día (piezas revisadas, piezas no conformes y cantidad por defecto), sin el molde.
// Por cada día se crean las piezas revisadas en rmold_reporte_defectos (origen 'excel_historico', sin molde):
//   - las no conformes con sus defectos (los defectos del día se reparten entre ellas; una pieza puede tener varios)
//   - el resto, buenas (sin defectos)
// Así el IFI, el pareto y el histórico dan lo mismo que el Excel. Se puede volver a ejecutar: borra lo cargado antes.
const path = require('path')
const fs = require('fs')
const XLSX = require(path.join(__dirname, '..', 'node_modules', 'xlsx'))

const NOMBRES = ['Despiques', 'Rayas', 'Tallones', 'Acumulación de cera', 'Poros', 'Deformación', 'Rayas de lija',
    'Molde fisurado', 'Sin brillo', 'Burbuja', 'Masilla', 'Piel de naranja']

const archivos = process.argv.slice(2)
if (archivos.length === 0) { console.error('Indique los archivos de Excel'); process.exit(1) }

const dias = new Map() // fecha → { revisadas, noConformes, defectos: number[12] }
for (const f of archivos) {
    const wb = XLSX.readFile(f)
    const ws = wb.Sheets['MOLDES']
    if (!ws) throw new Error(`${f}: no tiene la hoja MOLDES`)
    const filas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' })
    const encabezado = filas[1]
    // Filas: 3–14 defectos (código 1–12), 16 piezas revisadas, 18 piezas no conformes (índices base 0: 2–13, 15, 17)
    if (String(filas[15][1]).trim().toUpperCase().indexOf('PIEZAS REVISADAS') < 0) throw new Error(`${f}: la fila 16 no es "TOTAL DE PIEZAS REVISADAS"`)
    if (String(filas[17][1]).trim().toUpperCase().indexOf('NO CONFORMES') < 0) throw new Error(`${f}: la fila 18 no es "TOTAL PIEZAS NO CONFORMES"`)
    // Cada archivo solo aporta los días de su mes (el mes con más fechas en el encabezado): las hojas traen días del
    // mes siguiente (enero llega al 02/02 y febrero empieza el 02/02) y no deben pisarse ni duplicarse
    const meses = {}
    encabezado.forEach(v => { if (typeof v === 'number') { const m = XLSX.SSF.format('yyyy-mm', v); meses[m] = (meses[m] || 0) + 1 } })
    const mesArchivo = Object.entries(meses).sort((a, b) => b[1] - a[1])[0]?.[0]
    for (let c = 2; c < encabezado.length; c++) {
        if (typeof encabezado[c] !== 'number') continue
        const fecha = XLSX.SSF.format('yyyy-mm-dd', encabezado[c])
        if (fecha.slice(0, 7) !== mesArchivo) continue
        const revisadas = Number(filas[15][c]) || 0
        if (revisadas <= 0) continue
        const defectos = Array.from({ length: 12 }, (_, i) => Number(filas[2 + i][c]) || 0)
        const noConformes = Number(filas[17][c]) || 0
        dias.set(fecha, { revisadas, noConformes, defectos })
    }
}

// La columna defecto es un arreglo (igual que en MS: un elemento JSON por defecto). Se escribe como literal de
// arreglo de PostgreSQL ('{}' vacío, '{"{\"id\":2,…}"}'), sin tipo explícito: toma el de la columna (jsonb[] o json[]).
const json = v => {
    const elems = v.map(o => `"${JSON.stringify(o).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    return `'${`{${elems.join(',')}}`.replace(/'/g, "''")}'`
}
const valores = []
let totRev = 0, totNc = 0, totDef = 0
for (const [fecha, d] of [...dias.entries()].sort()) {
    const totalDefectos = d.defectos.reduce((a, b) => a + b, 0)
    // Si hay defectos pero el Excel no trae piezas no conformes, cada defecto cuenta como una pieza
    const nc = Math.min(d.revisadas, d.noConformes || (totalDefectos > 0 ? Math.min(totalDefectos, d.revisadas) : 0))
    const piezas = Array.from({ length: d.revisadas }, () => [])
    // Reparto: cada ocurrencia de defecto a la siguiente pieza no conforme que aún no lo tenga
    let k = 0
    d.defectos.forEach((n, i) => {
        for (let j = 0; j < n; j++) {
            for (let intento = 0; intento < nc; intento++) {
                const p = piezas[(k + intento) % nc]
                if (!p.some(x => x.id === i + 1)) { p.push({ id: i + 1, defecto: `${i + 1}. ${NOMBRES[i]}` }); k = (k + intento + 1) % nc; break }
            }
        }
    })
    // Mediodía de Bogotá (17:00 UTC): la fecha UTC y la local coinciden
    piezas.forEach((defs, idx) => {
        const hora = new Date(Date.parse(`${fecha}T17:00:00Z`) + idx * 60000).toISOString()
        valores.push(`('${hora}', ${json(defs)}, 'excel_historico')`)
    })
    totRev += d.revisadas; totNc += piezas.filter(p => p.length).length; totDef += totalDefectos
}

const sql = `-- Histórico de Calidad RMOLD desde el Excel de no conformes (hoja MOLDES): ${dias.size} días, ${totRev} piezas revisadas,
-- ${totNc} no conformes, ${totDef} defectos. Generado por scripts/calidad-rmold-historico.js. Ejecutar después de calidad_rmold.sql.
-- Se puede volver a ejecutar: primero borra lo que se cargó del Excel.
delete from public.rmold_reporte_defectos where origen = 'excel_historico';
insert into public.rmold_reporte_defectos (created_at, defecto, origen) values
${valores.join(',\n')};

-- Verificación por mes
select to_char(created_at, 'YYYY-MM') mes, count(*) revisadas,
       count(*) filter (where coalesce(cardinality(defecto), 0) > 0) no_conformes
  from public.rmold_reporte_defectos where origen = 'excel_historico' group by 1 order by 1;
`
const salida = path.join(__dirname, '..', 'datos-locales', 'calidad_rmold_historico.sql')
fs.mkdirSync(path.dirname(salida), { recursive: true })
fs.writeFileSync(salida, sql)
console.log(`${salida}: ${dias.size} días, ${totRev} revisadas, ${totNc} no conformes, ${totDef} defectos`)
