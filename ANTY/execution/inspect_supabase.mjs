import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Cargar variables de entorno desde .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan variables de entorno en .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectTable() {
    console.log('Consultando tabla REPUESTOS_MANTENIMIENTO...')
    const { data, error } = await supabase
        .from('REPUESTOS_MANTENIMIENTO')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error:', error.message)
    } else if (data && data.length > 0) {
        console.log('Estructura de la fila encontrada:')
        console.log(JSON.stringify(data[0], null, 2))
    } else {
        console.log('No se encontraron datos en la tabla.')
    }
}

inspectTable()
