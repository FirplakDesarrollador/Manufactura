import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/hdt/database.types'

type StepRow = Database['public']['Tables']['hdt_steps']['Row']
type StepInsert = Database['public']['Tables']['hdt_steps']['Insert']

const STORAGE_BUCKET = 'fichas-media'

export function toStepInserts(steps: Partial<StepRow>[], hdtId: string): StepInsert[] {
    return steps.map(step => ({
        hdt_id: hdtId,
        acciones_importantes: step.acciones_importantes || '',
        paso_importante: step.paso_importante || '',
        punto_clave: step.punto_clave || '',
        razon_punto_clave: step.razon_punto_clave || '',
        imagen_referencia: step.imagen_referencia || null,
        step_no: step.step_no
    }))
}

// Inserta los pasos de una HDT. Si la columna imagen_referencia aún no existe en
// Supabase, reintenta sin ella para no perder los pasos (se borran antes de insertar).
export async function insertHdtSteps(rows: StepInsert[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = () => supabase.from('hdt_steps') as any
    const { error } = await table().insert(rows)
    if (error && /imagen_referencia/.test(error.message || '')) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const sinImagen = rows.map(({ imagen_referencia: _, ...r }) => r)
        return table().insert(sinImagen)
    }
    return { error }
}

export async function uploadStepImage(file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `hdt/paso-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, file)
    if (error) throw error
    return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName).data.publicUrl
}
