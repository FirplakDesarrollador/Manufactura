// Uso (desde la carpeta del proyecto): node scripts/productividad-historico.js .
// Lee "Nivel de productividad.xlsx" y escribe los SQL del histórico en datos-locales/productividad_historico (no se suben a GitHub).
// Genera los SQL del histórico de productividad desde "Nivel de productividad.xlsx" (valores calculados por Excel)
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const raiz = process.argv[2]
const salida = path.join(raiz, 'datos-locales', 'productividad_historico')
fs.mkdirSync(salida, { recursive: true })
for (const f of fs.readdirSync(salida)) fs.unlinkSync(path.join(salida, f))

const wb = XLSX.readFile(path.join(raiz, 'Nivel de productividad.xlsx'), { sheets: ['BD_MS', 'BD_MBL', 'BD_CEFI', 'BD_RTM', 'BD_FV', 'BD_PAROS', 'BD_FPK'] })

const fecha = v => {
  if (v == null || v === '') return null
  if (typeof v === 'number') { const d = XLSX.SSF.parse_date_code(v); if (!d || !d.y) return null; return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` }
  const m = String(v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!m) return null
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
  return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
}
const num = v => (typeof v === 'number' && isFinite(v) ? Math.round(v * 1e6) / 1e6 : null)
const clave = h => String(h || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const sql = v => (v == null ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)

const MAPAS = {
  MS: { hoja: 'BD_MS', c: { min_funcional: 52, min_inducido: 53, min_explotacion: 54, min_averia: 55, min_averia_real: 57, paros_averia_real: 58, tiempo_min: 8, mo_teorica: 17, mo_real: 20, obj_piezas: 18, real_piezas: 31, pct_prod_piezas: 38, obj_prod: 39, obj_phh: 40, real_phh: 41, prod_phh: 42, kg_objetivo: 43, kg_real: 33, pct_prod_kg: 44, kghh_real: 45, kghh_objetivo: 47, pct_prod_kghh: 48 },
        h: { 8: 'TIEMPO_REAL_PRODUCCION_(min)', 31: 'Real Acabado', 38: '% PROD. PIEZAS', 44: '% PROD. KILOGRAMOS', 33: 'Kg entregados al CEDI' } },
  FV: { hoja: 'BD_FV', c: { min_funcional: 25, min_inducido: 26, min_explotacion: 27, min_averia: 28, min_averia_real: 30, paros_averia_real: 31, tiempo_min: 4, mo_teorica: 6, mo_real: 7, obj_piezas: 8, real_piezas: 17, pct_prod_piezas: 19, obj_prod: 20, obj_phh: 21, real_phh: 22, prod_phh: 23 }, h: { 17: 'Real Acabado conversion', 19: '% PROD. PIEZAS' } },
  RTM: { hoja: 'BD_RTM', c: { min_funcional: 21, min_inducido: 22, min_explotacion: 23, min_averia: 24, min_averia_real: 26, paros_averia_real: 27, tiempo_min: 4, mo_teorica: 6, mo_real: 7, obj_piezas: 8, real_piezas: 13, pct_prod_piezas: 15, obj_prod: 16, obj_phh: 17, real_phh: 18, prod_phh: 19 }, h: { 13: 'Total piezas dia RTM', 15: '% PROD. PIEZAS' } },
  CEFI: { hoja: 'BD_CEFI', c: { min_funcional: 43, min_inducido: 44, min_explotacion: 45, min_averia: 46, min_averia_real: 48, paros_averia_real: 49, tiempo_min: 4, mo_teorica: 6, mo_real: 7, obj_piezas: 8, real_piezas: 27, pct_prod_piezas: 31, obj_prod: 32, obj_phh: 33, real_phh: 34, prod_phh: 35 }, h: { 27: 'Empaque Total Piezas dia', 31: '% PROD. PIEZAS' } },
  MBL: { hoja: 'BD_MBL', c: { min_funcional: 122, min_inducido: 123, min_explotacion: 124, min_averia: 125, min_averia_real: 127, paros_averia_real: 128, tiempo_min: 4, mo_teorica: 5, mo_real: 24, obj_piezas: 25, real_piezas: 101, pct_prod_piezas: 105, obj_prod: 106, obj_phh: 107, real_phh: 108, prod_phh: 109 }, h: { 101: 'TALADRO TOTAL PIEZAS DIA', 105: '% PROD. PIEZAS' } },
}
const COLS = ['tiempo_min', 'mo_teorica', 'mo_real', 'obj_piezas', 'real_piezas', 'pct_prod_piezas', 'obj_prod', 'obj_phh', 'real_phh', 'prod_phh', 'kg_objetivo', 'kg_real', 'pct_prod_kg', 'kghh_real', 'kghh_objetivo', 'pct_prod_kghh', 'min_funcional', 'min_inducido', 'min_explotacion', 'min_averia', 'min_averia_real', 'paros_averia_real']
// Columnas de pérdidas que se recalculan desde prod_paros (no van al detalle)
const NO_DETALLE = new Set(['dia', 'semana', 'planta', 'auxiliar', 'funcional', 'inducido', 'explotacion', 'averia', 'cantidad_paros_averia', 'total_averias_reales', 'cantidad_paros_averia_reales', 'tmp', 'fppm', 'tmp_real', 'fppm_real', 'funcional', 'inducido', 'explotacion', 'averias', 'total_perdidas', 'verificacion_perdidas', 'ajuste_de_tiempo'])

let archivo = 1
const escribir = (nombre, texto) => { const f = path.join(salida, `${String(archivo++).padStart(2, '0')}_${nombre}.sql`); fs.writeFileSync(f, texto); console.log(path.basename(f), (texto.length / 1024 / 1024).toFixed(2), 'MB') }

const resumen = {}
for (const [planta, cfg] of Object.entries(MAPAS)) {
  const ws = wb.Sheets[cfg.hoja]
  const filas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })
  const enc = filas[0].map(h => String(h ?? '').trim())
  for (const [i, nombre] of Object.entries(cfg.h)) if (enc[i] !== nombre) throw new Error(`${cfg.hoja}: columna ${i} es "${enc[i]}", se esperaba "${nombre}"`)
  const usadas = new Set(Object.values(cfg.c))
  const vistos = new Set()
  const valores = []
  for (const f of filas.slice(1)) {
    const fe = fecha(f[0])
    if (!fe || vistos.has(fe)) continue // el Excel toma la primera fila del día (BUSCARV)
    if (f[3] == null && f[4] == null) continue
    vistos.add(fe)
    const det = {}
    enc.forEach((h, i) => {
      if (!h || usadas.has(i)) return
      const k = clave(h); if (!k || NO_DETALLE.has(k) || k.startsWith('pct_') ) return
      const v = f[i]; if (v == null || v === '') return
      det[k] = typeof v === 'number' ? num(v) : String(v).trim()
    })
    const fila = [sql(fe), sql(planta), ...COLS.map(c => sql(cfg.c[c] != null ? (c.startsWith('min_') || c === 'paros_averia_real' ? (num(f[cfg.c[c]]) ?? 0) : num(f[cfg.c[c]])) : null)), `'${JSON.stringify(det).replace(/'/g, "''")}'::jsonb`, "'excel_historico'"]
    valores.push(`(${fila.join(',')})`)
  }
  resumen[planta] = valores.length
  const partes = []
  for (let i = 0; i < valores.length; i += 400) {
    partes.push(`insert into public.prod_dia_planta (fecha, planta, ${COLS.join(', ')}, detalle, origen) values\n${valores.slice(i, i + 400).join(',\n')}\non conflict (fecha, planta) do update set ${[...COLS, 'detalle', 'origen'].map(c => `${c} = excluded.${c}`).join(', ')}, updated_at = now();`)
  }
  for (let i = 0, n = 1; i < partes.length; i += 1, n++) escribir(`dias_${planta}${partes.length > 1 ? `_${n}` : ''}`, `-- Histórico ${planta} desde el Excel. Se puede volver a ejecutar: reemplaza por fecha y planta.\n${partes[i]}\n`)
}

// Paros
{
  const filas = XLSX.utils.sheet_to_json(wb.Sheets['BD_PAROS'], { header: 1, raw: true, defval: null })
  const vals = []
  for (const f of filas.slice(1)) {
    const fe = fecha(f[0]); if (!fe || !f[1]) continue
    const t = v => (v == null || String(v).trim() === '' ? null : String(v).trim())
    vals.push(`(${[sql(fe), sql(t(f[1])), sql(t(f[2])), sql(t(f[3])), sql(t(f[4])), sql(t(f[5])), sql(t(f[6])), sql(num(f[7]) ?? 0), sql(t(f[8])), sql(t(f[9])), sql(t(f[10])), "'excel_historico'"].join(',')})`)
  }
  resumen.PAROS = vals.length
  const POR_ARCHIVO = 5000
  for (let a = 0; a < vals.length; a += POR_ARCHIVO) {
    const bloque = vals.slice(a, a + POR_ARCHIVO)
    const partes = []
    for (let i = 0; i < bloque.length; i += 500) partes.push(`insert into public.prod_paros (fecha, planta, proceso, familia, modo_perdida, equipo, descripcion, minutos, tipo, area_responsable, responsable, origen) values\n${bloque.slice(i, i + 500).join(',\n')};`)
    const cabeza = a === 0 ? `-- Paros históricos (BD_PAROS). Primero borra solo los cargados antes desde el Excel, para poder volver a ejecutar.\ndelete from public.prod_paros where origen = 'excel_historico';\n` : `-- Paros históricos (continuación). Ejecutar después del archivo anterior.\n`
    escribir(`paros_${Math.floor(a / POR_ARCHIVO) + 1}`, cabeza + partes.join('\n\n') + '\n')
  }
}

// Plantas activas (BD_FPK)
{
  const filas = XLSX.utils.sheet_to_json(wb.Sheets['BD_FPK'], { header: 1, raw: true, defval: null })
  const vals = []
  for (const f of filas.slice(1)) {
    const fe = fecha(f[0]); const p = f[6] == null ? '' : String(f[6]).trim()
    if (fe && p) vals.push(`(${sql(fe)}, ${sql(p)})`)
  }
  resumen.PLANTAS_ACTIVAS = vals.length
  escribir('plantas_activas', `insert into public.prod_plantas_activas (fecha, plantas) values\n${vals.join(',\n')}\non conflict (fecha) do update set plantas = excluded.plantas;\n`)
}
console.log(resumen)
