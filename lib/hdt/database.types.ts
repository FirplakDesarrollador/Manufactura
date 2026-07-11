export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      hdts: {
        Row: {
          id: string
          codigo: string
          proceso: string | null
          labor: string | null
          version: number | null
          fecha_elaboracion: string | null
          elaboro: string | null
          modifico: string | null
          herramientas: string | null
          insumos: string | null
          epp: string | null
          prohibido_y_porque: string | null
          tratamiento_anomalias: string | null
          is_current: boolean
          updated_at: string
          updated_by: string | null
          planta: string | null
        }
        Insert: {
          id?: string
          codigo: string
          proceso?: string | null
          labor?: string | null
          version?: number | null
          fecha_elaboracion?: string | null
          elaboro?: string | null
          modifico?: string | null
          herramientas?: string | null
          insumos?: string | null
          epp?: string | null
          prohibido_y_porque?: string | null
          tratamiento_anomalias?: string | null
          is_current?: boolean
          updated_at?: string
          updated_by?: string | null
          planta?: string | null
        }
        Update: {
          id?: string
          codigo?: string
          proceso?: string | null
          labor?: string | null
          version?: number | null
          fecha_elaboracion?: string | null
          elaboro?: string | null
          modifico?: string | null
          herramientas?: string | null
          insumos?: string | null
          epp?: string | null
          prohibido_y_porque?: string | null
          tratamiento_anomalias?: string | null
          is_current?: boolean
          updated_at?: string
          updated_by?: string | null
          planta?: string | null
        }
      }
      hdt_steps: {
        Row: {
          id: string
          hdt_id: string
          step_no: number | null
          acciones_importantes: string | null
          paso_importante: string | null
          punto_clave: string | null
          razon_punto_clave: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          hdt_id: string
          step_no?: number | null
          acciones_importantes?: string | null
          paso_importante?: string | null
          punto_clave?: string | null
          razon_punto_clave?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          hdt_id?: string
          step_no?: number | null
          acciones_importantes?: string | null
          paso_importante?: string | null
          punto_clave?: string | null
          razon_punto_clave?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      empleados: {
        Row: {
          id: number
          nombreCompleto: string
          cargo: string | null
          planta: string | null
          email: string | null
          // Add other fields as needed based on the schema provided
        }
        Insert: {
          id?: number
          nombreCompleto: string
          cargo?: string | null
          planta?: string | null
          email?: string | null
        }
        Update: {
          id?: number
          nombreCompleto?: string
          cargo?: string | null
          planta?: string | null
          email?: string | null
        }
      }
      plantas: {
        Row: {
          id: number
          planta: string
          created_at: string
        }
        Insert: {
          id?: number
          planta: string
          created_at?: string
        }
        Update: {
          id?: number
          planta?: string
          created_at?: string
        }
      }
    }
  }
}
