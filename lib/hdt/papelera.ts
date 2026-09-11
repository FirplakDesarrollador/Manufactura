import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/hdt/database.types'

export type HdtRow = Database['public']['Tables']['hdts']['Row']
export type StepRow = Database['public']['Tables']['hdt_steps']['Row']

export interface TrashHdtItem {
  trashId: string
  deletedAt: string
  deletedBy: string
  deleteType: 'version' | 'all'
  hdt: HdtRow
  steps: StepRow[]
  allVersions?: HdtRow[]
}

const TRASH_STORAGE_KEY = 'firplak_hdt_papelera_backup'

// Obtener todas las HDTs en la papelera
export const getTrashHdts = (): TrashHdtItem[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Error reading trash from localStorage:', err)
    return []
  }
}

// Guardar lista en la papelera
const saveTrashHdts = (items: TrashHdtItem[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(items))
  } catch (err) {
    console.error('Error saving trash to localStorage:', err)
  }
}

// Mover HDT o Versión a la papelera (Backup + Soft/Hard Delete de listas activas)
export const moveToTrash = async (
  hdt: HdtRow,
  steps: StepRow[],
  deleteType: 'version' | 'all',
  userEmail: string = 'Usuario'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const trashId = `trash_${hdt.id}_${Date.now()}`
    let allVersionsData: HdtRow[] = [hdt]

    if (deleteType === 'all' && hdt.codigo) {
      // Obtener todas las versiones
      const { data: versions } = await supabase
        .from('hdts')
        .select('*')
        .eq('codigo', hdt.codigo)

      if (versions && versions.length > 0) {
        allVersionsData = versions as HdtRow[]
      }

      // Eliminar todos los pasos de todas las versiones
      const versionIds = allVersionsData.map(v => v.id)
      await supabase.from('hdt_steps').delete().in('hdt_id', versionIds)

      // Eliminar las HDTs de la tabla activa
      const { error: delError } = await supabase
        .from('hdts')
        .delete()
        .eq('codigo', hdt.codigo)

      if (delError) throw delError
    } else {
      // Eliminar solo esta versión específica y sus pasos
      await supabase.from('hdt_steps').delete().eq('hdt_id', hdt.id)
      const { error: delError } = await supabase.from('hdts').delete().eq('id', hdt.id)
      if (delError) throw delError

      // Si había otras versiones, marcar la versión anterior como is_current si corresponde
      if (hdt.codigo && hdt.is_current) {
        const { data: remaining } = await supabase
          .from('hdts')
          .select('*')
          .eq('codigo', hdt.codigo)
          .order('version', { ascending: false })
          .limit(1)

        if (remaining && remaining.length > 0) {
          await supabase.from('hdts').update({ is_current: true }).eq('id', remaining[0].id)
        }
      }
    }

    // Almacenar en el backup de la papelera
    const trashItem: TrashHdtItem = {
      trashId,
      deletedAt: new Date().toISOString(),
      deletedBy: userEmail,
      deleteType,
      hdt,
      steps,
      allVersions: allVersionsData
    }

    const currentTrash = getTrashHdts()
    saveTrashHdts([trashItem, ...currentTrash])

    return { success: true }
  } catch (err: any) {
    console.error('Error moving to trash:', err)
    return { success: false, error: err.message || 'Error al mover a la papelera' }
  }
}

// Restaurar HDT o versión desde la papelera a Supabase
export const restoreFromTrash = async (trashId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentTrash = getTrashHdts()
    const itemToRestore = currentTrash.find(t => t.trashId === trashId)

    if (!itemToRestore) {
      return { success: false, error: 'Registro no encontrado en la papelera' }
    }

    const { deleteType, hdt, steps, allVersions } = itemToRestore

    if (deleteType === 'all' && allVersions && allVersions.length > 0) {
      // Restaurar todas las versiones
      for (const v of allVersions) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _, updated_at: __, ...hdtData } = v
        const { data: insertedHdt, error: insHdtErr } = await (supabase.from('hdts') as any)
          .insert([hdtData])
          .select()
          .single()

        if (insHdtErr) throw insHdtErr

        if (v.id === hdt.id && steps && steps.length > 0) {
          const stepsToInsert = steps.map(s => ({
            hdt_id: insertedHdt.id,
            acciones_importantes: s.acciones_importantes || '',
            paso_importante: s.paso_importante || '',
            punto_clave: s.punto_clave || '',
            razon_punto_clave: s.razon_punto_clave || '',
            step_no: s.step_no
          }))
          await (supabase.from('hdt_steps') as any).insert(stepsToInsert)
        }
      }
    } else {
      // Restaurar la versión individual
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _, updated_at: __, ...hdtData } = hdt
      const { data: insertedHdt, error: insHdtErr } = await (supabase.from('hdts') as any)
        .insert([hdtData])
        .select()
        .single()

      if (insHdtErr) throw insHdtErr

      if (steps && steps.length > 0) {
        const stepsToInsert = steps.map(s => ({
          hdt_id: insertedHdt.id,
          acciones_importantes: s.acciones_importantes || '',
          paso_importante: s.paso_importante || '',
          punto_clave: s.punto_clave || '',
          razon_punto_clave: s.razon_punto_clave || '',
          step_no: s.step_no
        }))
        await (supabase.from('hdt_steps') as any).insert(stepsToInsert)
      }
    }

    // Remover de la papelera
    const updatedTrash = currentTrash.filter(t => t.trashId !== trashId)
    saveTrashHdts(updatedTrash)

    return { success: true }
  } catch (err: any) {
    console.error('Error restoring from trash:', err)
    return { success: false, error: err.message || 'Error al restaurar desde la papelera' }
  }
}

// Eliminar definitivamente de la papelera
export const deleteFromTrashPermanently = (trashId: string): boolean => {
  try {
    const currentTrash = getTrashHdts()
    const updated = currentTrash.filter(t => t.trashId !== trashId)
    saveTrashHdts(updated)
    return true
  } catch (err) {
    console.error('Error deleting permanently from trash:', err)
    return false
  }
}

// Vaciar toda la papelera
export const emptyTrash = (): boolean => {
  try {
    saveTrashHdts([])
    return true
  } catch (err) {
    console.error('Error emptying trash:', err)
    return false
  }
}
