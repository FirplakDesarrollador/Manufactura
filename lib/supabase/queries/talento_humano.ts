import { supabaseTalentoHumano } from '../../supabase_talento_humano'

export async function getEmpleadoById(id: string) {
    if (!id) return null

    try {
        const { data, error } = await supabaseTalentoHumano
            .from('empleados')
            .select('id, nombreCompleto, foto')
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching employee:', error)
            return null
        }

        return data
    } catch (err) {
        console.error('Unexpected error fetching employee:', err)
        return null
    }
}
