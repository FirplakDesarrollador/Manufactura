'use client'

import NextImage from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Home, Save, Plus, Trash2, Loader2, AlertCircle, CheckCircle2, Search, X, User, LayoutGrid, Printer, History, Clock, Check, GripVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { supabaseTalentoHumano } from '@/lib/supabase_talento_humano'
import { Database } from '@/lib/hdt/database.types'
import { isAuthorizedEditor } from '@/lib/hdt/authorized-editors'

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    TouchSensor
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers'

type HdtRow = Database['public']['Tables']['hdts']['Row']
type StepRow = Database['public']['Tables']['hdt_steps']['Row']

// CONSTANTS
// const PLANTAS = [
//     'Marmol sintetico', 'Fibra de vidrio', 'Muebles', 'CEFI', 'RTM',
//     'Quarzstone', 'Fabricación de moles', 'Reparación de moldes',
//     'Calidad', 'Mantenimiento', 'Servicios'
// ]

const EPP_OPTIONS = [
    'Protección auditiva', 'Gafas', 'Botas de seguridad', 'Guantes de nitrilo', 'Guantes de carnaza',
    'Mangas', 'Delantal', 'Media cara', 'Tapabocas', 'Mascarilla', 'Casco'
]

interface Personnel {
    id: number;
    nombreCompleto: string;
    cargo: string | null;
}

interface Product {
    producto_sku: string;
    producto_descripcion: string;
}

interface NumberedTextareaProps {
    id?: string;
    value: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    readOnly: boolean;
    placeholder: string;
    name: string;
    onStepChange?: (index: number, e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    index: number;
    minHeight?: string;
    showNumbering?: boolean;
}

function NumberedTextarea({ id, value, readOnly, placeholder, name, onStepChange, index, minHeight = 'min-h-[80px]', onChange, showNumbering = false }: NumberedTextareaProps) {
    const lines = value ? value.split('\n') : [''];

    return (
        <div className={`flex gap-3 w-full h-full ${minHeight} p-3 transition-colors ${readOnly ? 'bg-zinc-50/50' : 'bg-transparent hover:bg-zinc-50/30'} print:block print:p-0 print:bg-transparent`}>
            {showNumbering && (
                <div className="flex flex-col text-[10px] font-bold text-zinc-400 select-none text-right min-w-[14px] opacity-60 leading-5 pt-[3px] print:hidden">
                    {lines.map((_, i) => (
                        <div key={i} className="h-5 flex items-center justify-end">{i + 1}.</div>
                    ))}
                </div>
            )}
            <textarea
                id={id}
                name={name}
                readOnly={readOnly}
                value={value}
                onChange={(e) => {
                    if (onStepChange) {
                        onStepChange(index, e);
                    } else if (onChange) {
                        onChange(e);
                    }
                }}
                className="flex-1 bg-transparent focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary/30 resize-none text-sm font-medium leading-5 p-0 placeholder:text-zinc-300 placeholder:italic rounded print:hidden"
                placeholder={readOnly ? "" : placeholder}
                rows={lines.length || 1}
            />
            {/* Print-only content */}
            <div className="hidden print:block text-[9.5pt] leading-tight whitespace-pre-wrap break-words text-black min-h-0 h-auto overflow-visible p-0 m-0">
                {value || ''}
            </div>
        </div>
    );
}

interface HdtFormProps {
    hdtId?: string
    mode: 'create' | 'edit' | 'view' | 'breakdown'
}

// supabase client is imported directly
const thSupabase = supabaseTalentoHumano

export default function HdtForm({ hdtId, mode }: HdtFormProps) {
    const router = useRouter()

    const [currentMode, setCurrentMode] = useState<'create' | 'edit' | 'view' | 'breakdown'>(mode)
    const [loading, setLoading] = useState(mode === 'edit' || mode === 'view')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [versionHistory, setVersionHistory] = useState<HdtRow[]>([])
    const [creatingVersion, setCreatingVersion] = useState(false)
    const [canDelete, setCanDelete] = useState(false)
    // Form State
    const [formData, setFormData] = useState<Partial<HdtRow>>({
        planta: '',
        labor: '',
        version: 1,
        fecha_elaboracion: new Date().toISOString().split('T')[0],
        elaboro: '',
        modifico: '',
        herramientas: '',
        insumos: '',
        epp: '',
        prohibido_y_porque: '',
        tratamiento_anomalias: '',
        codigo: '',
        proceso: ''
    })

    const [steps, setSteps] = useState<(Partial<StepRow> & { tempId: string })[]>([
        { acciones_importantes: '', paso_importante: '', punto_clave: '', razon_punto_clave: '', step_no: 1, tempId: Math.random().toString(36).substring(2, 9) }
    ])

    // Search & Selection state
    const [laborSearch, setLaborSearch] = useState('')
    const [laborResults, setLaborResults] = useState<Product[]>([])
    const [isSearchingLabor, setIsSearchingLabor] = useState(false)
    const [showLaborResults, setShowLaborResults] = useState(false)
    const laborRef = useRef<HTMLDivElement>(null)

    const [selectedEpps, setSelectedEpps] = useState<string[]>([])
    const [showEppDropdown, setShowEppDropdown] = useState(false)
    const eppRef = useRef<HTMLDivElement>(null)

    // Personnel error states
    const [elaboroError, setElaboroError] = useState<string | null>(null)
    const [modificoError, setModificoError] = useState<string | null>(null)

    // TH Personnel states
    const [elaboroSearch, setElaboroSearch] = useState('')
    const [elaboroResults, setElaboroResults] = useState<Personnel[]>([])
    const [isSearchingElaboro, setIsSearchingElaboro] = useState(false)
    const [showElaboroResults, setShowElaboroResults] = useState(false)
    const elaboroRef = useRef<HTMLDivElement>(null)

    const [modificoSearch, setModificoSearch] = useState('')
    const [modificoResults, setModificoResults] = useState<Personnel[]>([])
    const [isSearchingModifico, setIsSearchingModifico] = useState(false)
    const [showModificoResults, setShowModificoResults] = useState(false)
    const modificoRef = useRef<HTMLDivElement>(null)

    const [showVersionHistory, setShowVersionHistory] = useState(false)


    // Plants State
    const [plantasOptions, setPlantasOptions] = useState<string[]>([])
    const [loadingPlantas, setLoadingPlantas] = useState(false)

    // DND Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if ((currentMode === 'edit' || currentMode === 'view' || currentMode === 'breakdown') && hdtId) {
            fetchHdtData()
        }
        fetchPlantas()
        
        const checkUserPerms = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user && user.email) {
                const authorized = isAuthorizedEditor(user.email)
                setCanDelete(authorized)
                // Si llegó al modo edit sin autorización, forzar vista solo lectura
                if (!authorized && (currentMode === 'edit')) {
                    setCurrentMode('view')
                }
            }
        }
        checkUserPerms()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hdtId, currentMode])

    const fetchPlantas = async () => {
        setLoadingPlantas(true)
        try {
            const { data, error } = await thSupabase
                .from('plantas')
                .select('planta')
                .order('planta', { ascending: true })

            if (error) {
                console.error('Error fetching plants:', error)
            } else {
                const plants = data?.map(p => p.planta) || []
                setPlantasOptions(plants)
            }
        } catch (err) {
            console.error('Exception fetching plants:', err)
        } finally {
            setLoadingPlantas(false)
        }
    }

    const fetchHdtData = async () => {
        try {
            setLoading(true)
            // Fetch HDT header
            const { data: hdt, error: hdtError } = await supabase
                .from('hdts')
                .select('*')
                .eq('id', hdtId!)
                .single()

            if (hdtError) throw hdtError
            if (hdt) {
                const hdtData = hdt as HdtRow
                setFormData(hdtData)
                setLaborSearch(hdtData.labor || '')
                setElaboroSearch(hdtData.elaboro || '')
                setModificoSearch(hdtData.modifico || '')
                if (hdtData.epp) {
                    setSelectedEpps(hdtData.epp.split(',').map((s: string) => s.trim()))
                }

                // If this is an old version, force 'view' mode to prevent edits
                if (!hdtData.is_current && (currentMode === 'edit' || mode === 'edit')) {
                    setCurrentMode('view')
                }

                // Fetch Versions History (Contextual)
                if (hdtData.codigo) {
                    const { data: history } = await supabase
                        .from('hdts')
                        .select('*')
                        .eq('codigo', hdtData.codigo)
                        .order('version', { ascending: false })

                    if (history) setVersionHistory(history as HdtRow[])
                }
            }

            // Fetch HDT steps
            const { data: hdtSteps, error: stepsError } = await supabase
                .from('hdt_steps')
                .select('*')
                .eq('hdt_id', hdtId!)
                .order('step_no', { ascending: true })

            if (stepsError) throw stepsError
            if (hdtSteps && hdtSteps.length > 0) {
                setSteps((hdtSteps as StepRow[]).map(s => ({ ...s, tempId: s.id || Math.random().toString(36).substring(2, 9) })))
            }

            // Fetch version history if codigo exists
            if (hdt) {
                const hdtData = hdt as HdtRow
                if (hdtData.codigo) {
                    const { data: history } = await supabase
                        .from('hdts')
                        .select('*')
                        .eq('codigo', hdtData.codigo)
                        .order('version', { ascending: false })

                    if (history) {
                        setVersionHistory(history as HdtRow[])
                    }
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Error fetching HDT:', err)
            setError('No se pudo cargar la información de la HDT.')
        } finally {
            setLoading(false)
        }
    }

    // Effect to handle clicking outside of dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (laborRef.current && !laborRef.current.contains(event.target as Node)) {
                setShowLaborResults(false)
            }
            if (eppRef.current && !eppRef.current.contains(event.target as Node)) {
                setShowEppDropdown(false)
            }
            if (elaboroRef.current && !elaboroRef.current.contains(event.target as Node)) {
                setShowElaboroResults(false)
            }
            if (modificoRef.current && !modificoRef.current.contains(event.target as Node)) {
                setShowModificoResults(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Real-time Labor Search
    useEffect(() => {
        const searchLabor = async () => {
            if (laborSearch.length < 2 || currentMode === 'view' || currentMode === 'breakdown') {
                setLaborResults([])
                return
            }

            setIsSearchingLabor(true)
            try {
                // Search in products (sku and description)
                const { data: products } = await supabase
                    .from('productos')
                    .select('producto_sku, producto_descripcion')
                    .or(`producto_sku.ilike.%${laborSearch}%,producto_descripcion.ilike.%${laborSearch}%`)
                    .limit(10)

                setLaborResults(products || [])
            } catch (err) {
                console.error('Search error:', err)
            } finally {
                setIsSearchingLabor(false)
            }
        }

        const timeoutId = setTimeout(searchLabor, 300)
        return () => clearTimeout(timeoutId)
    }, [laborSearch, currentMode])

    // Real-time Personnel Search (ELABORÓ)
    useEffect(() => {
        const searchPersonnel = async () => {
            if (currentMode === 'view' || currentMode === 'breakdown') {
                setElaboroResults([])
                return
            }

            setIsSearchingElaboro(true)
            setElaboroError(null)
            try {
                console.log('🔍 Searching employees in TH database...')
                console.log('TH Client URL:', process.env.NEXT_PUBLIC_TH_SUPABASE_URL)

                let query = thSupabase
                    .from('empleados')
                    .select('id, nombreCompleto, cargo')

                if (elaboroSearch.length > 0) {
                    query = query.ilike('nombreCompleto', `%${elaboroSearch}%`)
                }

                const { data: employees, error: searchError } = await query

                if (searchError) {
                    console.error('❌ Personnel search query error:', searchError)
                    setElaboroError(searchError.message)
                } else {
                    console.log('✅ Found employees:', employees?.length)
                }
                setElaboroResults(employees || [])
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                console.error('Personnel search catch error:', err)
                setElaboroError(err.message || 'Error desconocido')
            } finally {
                setIsSearchingElaboro(false)
            }
        }

        const timeoutId = setTimeout(searchPersonnel, 300)
        return () => clearTimeout(timeoutId)
    }, [elaboroSearch, currentMode])

    // Real-time Personnel Search (APROBÓ)
    useEffect(() => {
        const searchPersonnel = async () => {
            if (currentMode === 'view' || currentMode === 'breakdown') {
                setModificoResults([])
                return
            }

            setIsSearchingModifico(true)
            setModificoError(null)
            try {
                console.log('🔍 Searching employees for APROBÓ...')

                let query = thSupabase
                    .from('empleados')
                    .select('id, nombreCompleto, cargo')

                if (modificoSearch.length > 0) {
                    query = query.ilike('nombreCompleto', `%${modificoSearch}%`)
                }

                const { data: employees, error: searchError } = await query

                if (searchError) {
                    console.error('❌ Modifier personnel search query error:', searchError)
                    setModificoError(searchError.message)
                } else {
                    console.log('✅ Found employees for APROBÓ:', employees?.length)
                }
                setModificoResults(employees || [])
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                console.error('Modifier personnel search catch error:', err)
                setModificoError(err.message || 'Error desconocido')
            } finally {
                setIsSearchingModifico(false)
            }
        }

        const timeoutId = setTimeout(searchPersonnel, 300)
        return () => clearTimeout(timeoutId)
    }, [modificoSearch, currentMode])

    // Version automation
    useEffect(() => {
        if (currentMode === 'create' && formData.labor) {
            const checkVersion = async () => {
                const { count } = await supabase
                    .from('hdts')
                    .select('*', { count: 'exact', head: true })
                    .ilike('labor', formData.labor!)

                setFormData(prev => ({ ...prev, version: (count || 0) + 1 }))
            }
            checkVersion()
        }
    }, [formData.labor, currentMode])

    const toggleEpp = (epp: string) => {
        if (currentMode === 'view' || currentMode === 'breakdown') return
        setSelectedEpps(prev => {
            let next
            if (prev.includes(epp)) {
                next = prev.filter(item => item !== epp)
            } else {
                next = [...prev, epp]
            }
            setFormData(f => ({ ...f, epp: next.join(', ') }))
            return next
        })
    }

    const selectLabor = (res: Product) => {
        setFormData(prev => ({
            ...prev,
            labor: res.producto_descripcion,
            codigo: res.producto_sku
        }))
        setLaborSearch(res.producto_descripcion)
        setShowLaborResults(false)
    }

    const selectElaboro = (emp: Personnel) => {
        setFormData(prev => ({ ...prev, elaboro: emp.nombreCompleto }))
        setElaboroSearch(emp.nombreCompleto)
        setShowElaboroResults(false)
    }

    const selectModifico = (emp: Personnel) => {
        setFormData(prev => ({ ...prev, modifico: emp.nombreCompleto }))
        setModificoSearch(emp.nombreCompleto)
        setShowModificoResults(false)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleStepChange = (index: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target
        const newSteps = [...steps]
        newSteps[index] = { ...newSteps[index], [name]: value }
        setSteps(newSteps)
    }

    const addStep = () => {
        setSteps([...steps, { 
            acciones_importantes: '', 
            paso_importante: '', 
            punto_clave: '', 
            razon_punto_clave: '', 
            step_no: steps.length + 1,
            tempId: Math.random().toString(36).substring(2, 9)
        }])
    }

    const removeStep = (index: number) => {
        if (steps.length > 1) {
            const newSteps = steps.filter((_, i) => i !== index)
            // Re-order step_no
            const reorderedSteps = newSteps.map((step, i) => ({ ...step, step_no: i + 1 }))
            setSteps(reorderedSteps)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setSteps((items) => {
                const oldIndex = items.findIndex((item) => item.tempId === active.id);
                const newIndex = items.findIndex((item) => item.tempId === over.id);

                const newSteps = arrayMove(items, oldIndex, newIndex);
                // Re-update step_no for persistence consistency
                return newSteps.map((step, i) => ({ ...step, step_no: i + 1 }));
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)

        try {
            // 1. Save Header
            let savedHdtId = hdtId
            if (mode === 'create') {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id: _, updated_at: __, ...cleanFormData } = formData
                const { data, error: hdtError } = await (supabase
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .from('hdts') as any)
                    .insert([{ ...cleanFormData, codigo: cleanFormData.codigo || `HDT-${Date.now()}` }])
                    .select()
                    .single()

                if (hdtError) throw hdtError
                savedHdtId = data.id
            } else {
                const { error: hdtError } = await (supabase
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .from('hdts') as any)
                    .update(formData)
                    .eq('id', hdtId!)

                if (hdtError) throw hdtError
            }

            // 2. Save Steps
            // Logic: Delete existing steps and insert new ones (simpler for MVP)
            if (mode === 'edit') {
                const { error: delError } = await (supabase
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .from('hdt_steps') as any)
                    .delete()
                    .eq('hdt_id', savedHdtId!)
                if (delError) throw delError
            }

            const stepsToInsert = steps.map(step => ({
                hdt_id: savedHdtId!,
                acciones_importantes: step.acciones_importantes || '',
                paso_importante: step.paso_importante || '',
                punto_clave: step.punto_clave || '',
                razon_punto_clave: step.razon_punto_clave || '',
                step_no: step.step_no
            }))

            const { error: insError } = await (supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('hdt_steps') as any)
                .insert(stepsToInsert)

            if (insError) throw insError

            setSuccess(true)
            setTimeout(() => {
                if (mode === 'create') {
                    router.push('/hdt')
                } else {
                    setSuccess(false)
                    fetchHdtData() // Refresh to see updated info
                }
            }, 2000)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Error saving HDT:', err)
            setError(err.message || 'Error inesperado al guardar.')
        } finally {
            setSaving(false)
        }
    }

    const handleCreateNewVersion = async () => {
        if (!hdtId) return
        setCreatingVersion(true)
        setError(null)

        try {
            // 1. Mark current as not current
            const { error: updateError } = await (supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('hdts') as any)
                .update({ is_current: false })
                .eq('id', hdtId)

            if (updateError) throw updateError

            // 2. Insert new version
            const newVersionNum = (formData.version || 0) + 1
            // Destructure to remove id and other metadata that should be fresh
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _, updated_at: __, ...cleanFormData } = formData

            const { data: newHdt, error: insertError } = await (supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('hdts') as any)
                .insert([{
                    ...cleanFormData,
                    version: newVersionNum,
                    is_current: true,
                    fecha_elaboracion: new Date().toISOString().split('T')[0]
                }])
                .select()
                .single()

            if (insertError) throw insertError
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newHdtId = (newHdt as any).id

            // 3. Clone steps
            const stepsToInsert = steps.map(step => ({
                hdt_id: newHdtId,
                acciones_importantes: step.acciones_importantes || '',
                paso_importante: step.paso_importante || '',
                punto_clave: step.punto_clave || '',
                razon_punto_clave: step.razon_punto_clave || '',
                step_no: step.step_no
            }))

            const { error: stepsError } = await (supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('hdt_steps') as any)
                .insert(stepsToInsert)

            if (stepsError) throw stepsError

            setSuccess(true)
            setTimeout(() => {
                router.push(`/hdt/edit/${newHdtId}`)
                setSuccess(false)
            }, 2000)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Error creating new version:', err)
            setError(err.message || 'Error al crear la nueva versión.')
        } finally {
            setCreatingVersion(false)
        }
    }

    const handleDeleteAllVersions = async () => {
        if (!hdtId || !formData.codigo) return
        const confirmDelete = window.confirm("¿Estás seguro de que deseas eliminar TODAS las versiones de esta HDT? Esta acción no se puede deshacer.")
        if (!confirmDelete) return
        
        setSaving(true)
        setError(null)
        try {
            // Eliminar todos los pasos de todas las versiones con este código
            const { data: versions } = await supabase.from('hdts').select('id').eq('codigo', formData.codigo)
            if (versions && versions.length > 0) {
                const versionIds = versions.map((v: { id: string }) => v.id)
                await supabase.from('hdt_steps').delete().in('hdt_id', versionIds)
            }
            
            // Eliminar las HDTs
            const { error: delError } = await supabase.from('hdts').delete().eq('codigo', formData.codigo)
            if (delError) throw delError
            
            router.push('/hdt')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Error al eliminar:', err)
            setError(err.message || 'Error al eliminar la HDT.')
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <Loader2 className="h-12 w-12 text-brand-primary animate-spin" />
                <p className="text-zinc-500 font-medium">Cargando formulario...</p>
            </div>
        )
    }

    return (
        <main className="max-w-7xl mx-auto p-4 sm:p-8 bg-zinc-50 min-h-screen text-zinc-900 print:bg-white print:p-0">
            {/* Header Section */}
            {!formData.is_current && hdtId && (
                <div className="mb-6 bg-orange-50 border-2 border-orange-200 p-4 rounded-3xl flex items-center justify-between gap-4 animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-orange-900 font-bold uppercase tracking-tight">Versión Obsoleta - Solo Lectura</p>
                            <p className="text-orange-700 text-xs font-medium">Estás visualizando una versión anterior de esta HDT. No se permiten ediciones.</p>
                        </div>
                    </div>
                    {versionHistory.find(v => v.is_current) && (
                        <button
                            type="button"
                            onClick={() => router.push(`/hdt/view/${versionHistory.find(v => v.is_current)?.id}`)}
                            className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl hover:bg-brand-secondary transition-all shadow-md"
                        >
                            Ver Versión Vigente
                        </button>
                    )}
                </div>
            )}
            <header className="bg-white border-2 border-brand-primary/20 rounded-t-3xl p-6 mb-0 flex flex-col md:flex-row items-center gap-6 shadow-sm hidden-print">
                <div className="flex-shrink-0">
                    <NextImage
                        src="/brand/logo_2.png"
                        alt="Firplak Logo"
                        width={180}
                        height={112}
                        className="h-28 w-auto object-contain"
                    />
                </div>
                <div className="flex-1 text-center flex flex-col items-center">
                    <h1 className="text-3xl md:text-1xl font-extrabold text-brand-primary uppercase tracking-wider print:text-xl print:font-bold">
                        Hoja de División de Trabajo HDT
                    </h1>
                    <div className="flex gap-2 mt-2 print:hidden">
                        {formData.is_current === false && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-black italic animate-pulse">
                                VERSIÓN ANTERIOR
                            </span>
                        )}
                        {formData.is_current === true && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-black italic">
                                VIGENTE
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* Print Only Header */}
            <div className="hidden print-header print:flex">
                <div className="print-header-logo">
                    <NextImage src="/brand/logo_2.png" alt="Firplak Logo" width={120} height={50} className="object-contain" priority />
                </div>
                <div className="print-header-title">
                    <h1 className="font-bold text-brand-primary">HOJA DE DIVISIÓN DE TRABAJO HDT</h1>
                </div>
                <div className="print-header-meta">
                    <div>
                        <span className="font-bold">CÓDIGO:</span>
                        <span>{formData.codigo || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="font-bold">VERSIÓN:</span>
                        <span>{formData.version || 1}</span>
                    </div>
                    <div>
                        <span className="font-bold">FECHA:</span>
                        <span>{formData.fecha_elaboracion || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* General Information Grid - Styled as a Table */}
                <div className="bg-white border-x-2 border-b-2 border-brand-primary/20 shadow-sm print:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-x-2 divide-brand-primary/10">
                        {/* Column 1 */}
                        <div className="divide-y-2 divide-brand-primary/5">
                            <div className="p-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                                <label htmlFor="input-codigo" className="text-[10px] font-bold text-brand-primary uppercase w-20">Código</label>
                                <input
                                    id="input-codigo"
                                    name="codigo"
                                    readOnly={currentMode === 'view' || currentMode === 'breakdown'}
                                    value={formData.codigo || ''}
                                    onChange={handleInputChange}
                                    className={`flex-1 bg-zinc-50 border-none rounded-lg p-1.5 focus:ring-1 focus:ring-brand-primary/30 transition-all font-medium text-xs ${currentMode === 'view' || currentMode === 'breakdown' ? 'bg-transparent cursor-default' : ''}`}
                                    placeholder={currentMode === 'view' ? "" : "Ej: HDT-001..."}
                                />
                            </div>
                            <div className="p-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                                <label htmlFor="input-planta" className="text-[10px] font-bold text-brand-primary uppercase w-20">Planta</label>
                                <select
                                    id="input-planta"
                                    name="planta"
                                    disabled={currentMode === 'view' || currentMode === 'breakdown'}
                                    value={formData.planta || ''}
                                    onChange={handleInputChange}
                                    className={`flex-1 bg-zinc-50 border-none rounded-lg p-1.5 focus:ring-1 focus:ring-brand-primary/30 focus-visible:ring-2 transition-all font-medium text-xs appearance-none ${currentMode === 'view' || currentMode === 'breakdown' ? 'bg-transparent cursor-default' : ''}`}
                                    required
                                >
                                    <option value="">{loadingPlantas ? 'Cargando plantas...' : 'Seleccionar Planta...'}</option>
                                    {plantasOptions.map((p, idx) => (
                                        <option key={`${p}-${idx}`} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="p-2.5 flex flex-col sm:flex-row sm:items-center gap-2 relative">
                                <label htmlFor="input-labor" className="text-[10px] font-bold text-brand-primary uppercase w-20">Labor</label>
                                <div className="flex-1 relative" ref={laborRef}>
                                    <div className="relative">
                                        <input
                                            id="input-labor"
                                            name="labor"
                                            readOnly={currentMode === 'view' || currentMode === 'breakdown'}
                                            value={laborSearch}
                                            onChange={(e) => {
                                                setLaborSearch(e.target.value)
                                                setFormData(prev => ({ ...prev, labor: e.target.value }))
                                                setShowLaborResults(true)
                                            }}
                                            onFocus={() => setShowLaborResults(true)}
                                            className={`w-full bg-zinc-50 border-none rounded-lg p-1.5 pr-8 focus:ring-1 focus:ring-brand-primary/30 transition-all font-medium text-xs ${currentMode === 'view' || currentMode === 'breakdown' ? 'bg-transparent cursor-default' : ''}`}
                                            placeholder={currentMode === 'view' ? "" : "Buscar producto o labor..."}
                                            required
                                        />
                                        {isSearchingLabor ? (
                                            <Loader2 className="absolute right-2.5 top-1.5 h-3.5 w-3.5 text-zinc-400 animate-spin" />
                                        ) : (
                                            <Search className="absolute right-2.5 top-1.5 h-3.5 w-3.5 text-zinc-400" aria-label="icono búsqueda" />
                                        )}
                                    </div>

                                    {showLaborResults && laborResults.length > 0 && currentMode !== 'view' && currentMode !== 'breakdown' && (
                                        <div role="listbox" className="absolute z-[100] top-full left-0 right-0 mt-1 bg-white border-2 border-brand-primary/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                                            {laborResults.map((res) => (
                                                <button
                                                    key={res.producto_sku}
                                                    type="button"
                                                    role="option"
                                                    aria-selected="false"
                                                    onClick={() => selectLabor(res)}
                                                    className="w-full p-2.5 text-left hover:bg-zinc-50 border-b border-zinc-100 last:border-0 flex flex-col gap-0.5 transition-colors"
                                                >
                                                    <span className="text-xs font-bold text-brand-primary leading-tight">{res.producto_descripcion}</span>
                                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">SKU: {res.producto_sku}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                                <label htmlFor="input-proceso" className="text-[10px] font-bold text-brand-primary uppercase w-20">Proceso</label>
                                <input
                                    id="input-proceso"
                                    name="proceso"
                                    readOnly={currentMode === 'view' || currentMode === 'breakdown'}
                                    value={formData.proceso || ''}
                                    onChange={handleInputChange}
                                    className={`flex-1 bg-zinc-50 border-none rounded-lg p-1.5 focus:ring-1 focus:ring-brand-primary/30 transition-all font-medium text-xs ${currentMode === 'view' || currentMode === 'breakdown' ? 'bg-transparent cursor-default' : ''}`}
                                    placeholder={currentMode === 'view' ? "" : "Ej: Pintura, Desmolde..."}
                                />
                            </div>
                        </div>

                        {/* Column 2 - Tools, Insumos, EPPS */}
                        <div className="divide-y-2 divide-brand-primary/5">
                            <div className="p-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                                <label htmlFor="input-herramientas" className="text-[10px] font-bold text-brand-primary uppercase w-28">Herramientas</label>
                                <NumberedTextarea
                                    id="input-herramientas"
                                    index={0}
                                    name="herramientas"
                                    readOnly={currentMode === 'view' || currentMode === 'breakdown'}
                                    value={formData.herramientas || ''}
                                    onChange={handleInputChange}
                                    minHeight="min-h-[80px]"
                                    placeholder="Ej: espátula, martillo, pistola..."
                                />
                            </div>
                            <div className="p-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                                <label htmlFor="input-insumos" className="text-[10px] font-bold text-brand-primary uppercase w-28">Insumos</label>
                                <NumberedTextarea
                                    id="input-insumos"
                                    index={0}
                                    name="insumos"
                                    readOnly={currentMode === 'view' || currentMode === 'breakdown'}
                                    value={formData.insumos || ''}
                                    onChange={handleInputChange}
                                    minHeight="min-h-[80px]"
                                    placeholder="Ej: Resina, carbonato, fibra de vidrio.."
                                />
                            </div>
                            <div className="p-2.5 flex flex-col sm:flex-row sm:items-center gap-2 relative">
                                <label id="epps-label" htmlFor="btn-epps" className="text-[10px] font-bold text-brand-primary uppercase w-20">EPPS</label>
                                <div className="flex-1 relative" ref={eppRef}>
                                    <button
                                        id="btn-epps"
                                        type="button"
                                        onClick={() => (currentMode !== 'view' && currentMode !== 'breakdown') && setShowEppDropdown(!showEppDropdown)}
                                        className={`w-full bg-zinc-50 border-none rounded-lg p-1.5 text-left flex flex-wrap gap-1 min-h-[32px] items-center ${currentMode === 'view' || currentMode === 'breakdown' ? 'bg-transparent cursor-default' : 'hover:bg-zinc-100'}`}
                                        aria-haspopup="listbox"
                                        aria-expanded={showEppDropdown}
                                        aria-labelledby="epps-label"
                                    >
                                        {selectedEpps.length === 0 ? (
                                            <span className="text-zinc-400 text-[11px]">{currentMode === 'view' ? "" : "Seleccionar EPPS..."}</span>
                                        ) : (
                                            selectedEpps.map(epp => (
                                                <span key={epp} className="bg-brand-primary/10 text-brand-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                    {epp}
                                                    {(currentMode !== 'view' && currentMode !== 'breakdown') && (
                                                        <button
                                                            type="button"
                                                            aria-label={`Eliminar ${epp}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                toggleEpp(epp)
                                                            }}
                                                            className="hover:text-red-500 transition-colors p-0.5"
                                                        >
                                                            <X className="h-2 w-2" />
                                                        </button>
                                                    )}
                                                </span>
                                            ))
                                        )}
                                    </button>

                                    {showEppDropdown && currentMode !== 'view' && currentMode !== 'breakdown' && (
                                        <div className="absolute z-[120] top-full left-0 right-0 mt-1 bg-white border-2 border-brand-primary/10 rounded-xl shadow-2xl p-1.5 max-h-48 overflow-y-auto transform origin-top transition-all">
                                            {EPP_OPTIONS.map(epp => (
                                                <button
                                                    key={epp}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        toggleEpp(epp)
                                                    }}
                                                    className={`w-full p-2 text-left text-[11px] rounded-lg transition-colors flex items-center justify-between mb-0.5 last:mb-0 ${selectedEpps.includes(epp) ? 'bg-brand-primary/5 text-brand-primary font-bold' : 'hover:bg-zinc-50 text-zinc-600'}`}
                                                >
                                                    {epp}
                                                    {selectedEpps.includes(epp) && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Column 3 - Meta (Fecha, Elaboró, Aprobó, Versión) */}
                        <div className="divide-y-2 divide-brand-primary/5">
                            <div className="p-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                                <label htmlFor="input-fecha" className="text-[10px] font-bold text-brand-primary uppercase w-32">Fecha Elab.</label>
                                <input
                                    id="input-fecha"
                                    type="date"
                                    name="fecha_elaboracion"
                                    readOnly={currentMode === 'view' || currentMode === 'breakdown'}
                                    value={formData.fecha_elaboracion || ''}
                                    onChange={handleInputChange}
                                    className={`flex-1 bg-zinc-50 border-none rounded-lg p-1.5 focus:ring-1 focus:ring-brand-primary/30 transition-all font-medium text-xs ${currentMode === 'view' || currentMode === 'breakdown' ? 'bg-transparent cursor-default' : ''}`}
                                />
                            </div>
                            <div className="p-2.5 flex flex-col sm:flex-row sm:items-center gap-2 relative">
                                <label htmlFor="input-elaboro" className="text-[10px] font-bold text-brand-primary uppercase w-32">ELABORÓ</label>
                                <div className="flex-1 relative" ref={elaboroRef}>
                                    <div className="relative">
                                        <input
                                            id="input-elaboro"
                                            name="elaboro"
                                            readOnly={currentMode === 'view' || currentMode === 'breakdown'}
                                            value={elaboroSearch}
                                            onChange={(e) => {
                                                setElaboroSearch(e.target.value)
                                                setFormData(prev => ({ ...prev, elaboro: e.target.value }))
                                                setShowElaboroResults(true)
                                            }}
                                            onFocus={() => setShowElaboroResults(true)}
                                            onClick={() => (currentMode !== 'view' && currentMode !== 'breakdown') && setShowElaboroResults(true)}
                                            className={`w-full bg-zinc-50 border-none rounded-lg p-1.5 pl-8 focus:ring-1 focus:ring-brand-primary/30 transition-all font-medium text-xs ${currentMode === 'view' || currentMode === 'breakdown' ? 'bg-transparent cursor-default' : ''}`}
                                            placeholder={currentMode === 'view' ? "" : "Cargar personal..."}
                                        />
                                        {isSearchingElaboro ? (
                                            <Loader2 className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400 animate-spin" />
                                        ) : (
                                            <User className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" aria-label="icono usuario" />
                                        )}
                                    </div>

                                    {showElaboroResults && currentMode !== 'view' && currentMode !== 'breakdown' && (
                                        <div role="listbox" className="absolute z-[200] top-full left-0 right-0 mt-1 bg-white border-2 border-brand-primary/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                                            {isSearchingElaboro ? (
                                                <div className="p-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                                                </div>
                                            ) : elaboroError ? (
                                                <div className="p-4 text-center text-xs text-red-500 bg-red-50">Error: {elaboroError}</div>
                                            ) : elaboroResults.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-zinc-400">No se encontraron resultados</div>
                                            ) : (
                                                elaboroResults.map((emp) => (
                                                    <button
                                                        key={emp.id}
                                                        type="button"
                                                        role="option"
                                                        aria-selected="false"
                                                        onClick={() => selectElaboro(emp)}
                                                        className="w-full p-2 text-left hover:bg-zinc-50 border-b border-zinc-100 last:border-0 flex flex-col gap-0.5 transition-colors"
                                                    >
                                                        <span className="text-xs font-bold text-brand-primary leading-tight">{emp.nombreCompleto}</span>
                                                        <span className="text-[9px] font-bold text-zinc-400 uppercase">{emp.cargo || 'Sin cargo'}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-2.5 flex flex-col sm:flex-row sm:items-center gap-2 relative">
                                <label htmlFor="input-aprobó" className="text-[10px] font-bold text-brand-primary uppercase w-32">APROBÓ</label>
                                <div className="flex-1 relative" ref={modificoRef}>
                                    <div className="relative">
                                        <input
                                            id="input-aprobó"
                                            name="modifico"
                                            readOnly={currentMode === 'view' || currentMode === 'breakdown'}
                                            value={modificoSearch}
                                            onChange={(e) => {
                                                setModificoSearch(e.target.value)
                                                setFormData(prev => ({ ...prev, modifico: e.target.value }))
                                                setShowModificoResults(true)
                                            }}
                                            onFocus={() => setShowModificoResults(true)}
                                            onClick={() => (currentMode !== 'view' && currentMode !== 'breakdown') && setShowModificoResults(true)}
                                            className={`w-full bg-zinc-50 border-none rounded-lg p-1.5 pl-8 focus:ring-1 focus:ring-brand-primary/30 transition-all font-medium text-xs ${currentMode === 'view' || currentMode === 'breakdown' ? 'bg-transparent cursor-default' : ''}`}
                                            placeholder={currentMode === 'view' ? "" : "Cargar personal..."}
                                        />
                                        {isSearchingModifico ? (
                                            <Loader2 className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400 animate-spin" />
                                        ) : (
                                            <User className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" aria-label="icono usuario" />
                                        )}
                                    </div>

                                    {showModificoResults && currentMode !== 'view' && currentMode !== 'breakdown' && (
                                        <div role="listbox" className="absolute z-[200] top-full left-0 right-0 mt-1 bg-white border-2 border-brand-primary/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                                            {isSearchingModifico ? (
                                                <div className="p-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                                                </div>
                                            ) : modificoError ? (
                                                <div className="p-4 text-center text-xs text-red-500 bg-red-50">Error: {modificoError}</div>
                                            ) : modificoResults.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-zinc-400">No se encontraron resultados</div>
                                            ) : (
                                                modificoResults.map((emp) => (
                                                    <button
                                                        key={emp.id}
                                                        type="button"
                                                        role="option"
                                                        aria-selected="false"
                                                        onClick={() => selectModifico(emp)}
                                                        className="w-full p-2 text-left hover:bg-zinc-50 border-b border-zinc-100 last:border-0 flex flex-col gap-0.5 transition-colors"
                                                    >
                                                        <span className="text-xs font-bold text-brand-primary leading-tight">{emp.nombreCompleto}</span>
                                                        <span className="text-[9px] font-bold text-zinc-400 uppercase">{emp.cargo || 'Sin cargo'}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                                <span className="text-[10px] font-bold text-brand-primary uppercase w-32">Versión</span>
                                <div className="flex-1 px-2 py-0.5 bg-brand-primary/10 rounded-lg text-brand-primary font-bold text-[10px]">
                                    V{formData.version || 1}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dedicated Print Metadata Table */}
                <table className="hidden print:table print-metadata-table">
                    <tbody>
                        <tr>
                            <td>
                                <span className="label">Planta</span>
                                <span className="value">{formData.planta || 'N/A'}</span>
                            </td>
                            <td>
                                <span className="label">Proceso</span>
                                <span className="value">{formData.proceso || 'N/A'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2} className="full-width">
                                <span className="label">Labor</span>
                                <span className="value">{formData.labor || 'N/A'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <span className="label">Elaboró</span>
                                <span className="value">{formData.elaboro || 'N/A'}</span>
                            </td>
                            <td>
                                <span className="label">Aprobó</span>
                                <span className="value">{formData.modifico || 'N/A'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2} className="full-width">
                                <span className="label">EPPS</span>
                                <span className="value">{selectedEpps.join(', ') || 'N/A'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <span className="label">Herramientas</span>
                                <span className="value">{formData.herramientas || 'N/A'}</span>
                            </td>
                            <td>
                                <span className="label">Insumos</span>
                                <span className="value">{formData.insumos || 'N/A'}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div id="hdt-steps-table" className="bg-white border-2 border-brand-primary/20 rounded-3xl overflow-x-auto shadow-sm print:table print:table-fixed print:w-full print:border-collapse print:rounded-none">
                    <div className="min-w-[800px] md:min-w-0 print:min-w-0">
                        <div className="print:table-header-group">
                            <div className={`grid ${currentMode === 'breakdown' ? 'grid-cols-3' : 'grid-cols-[1.5fr_1fr_1fr_1fr]'} bg-zinc-50 divide-x-2 divide-brand-primary/20 border-b-2 border-brand-primary/20 print:table-row print:bg-transparent print:divide-brand-primary/10`}>
                            {currentMode !== 'breakdown' && (
                                <div role="columnheader" className="p-4 text-center font-bold text-brand-primary uppercase text-xs tracking-widest print:p-2 print:text-[8pt] print:border print:border-brand-primary/20">Acción Importante</div>
                            )}
                            <div role="columnheader" className="p-4 text-center font-bold text-brand-primary uppercase text-xs tracking-widest print:p-2 print:text-[8pt] print:border print:border-brand-primary/20">Paso Importante</div>
                            <div role="columnheader" className="p-4 text-center font-bold text-brand-primary uppercase text-xs tracking-widest print:p-2 print:text-[8pt] print:border print:border-brand-primary/20">Punto Clave</div>
                            <div role="columnheader" className="p-4 text-center font-bold text-brand-primary uppercase text-xs tracking-widest print:p-2 print:text-[8pt] print:border print:border-brand-primary/20">Razón Punto Clave</div>
                        </div>
                    </div>

                    <div className="divide-y-2 divide-brand-primary/10 print:table-row-group">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
                        >
                             <SortableContext
                                items={steps.map((step) => step.tempId)}
                                strategy={verticalListSortingStrategy}
                            >
                                {steps.map((step, index) => (
                                    <SortableStepRow
                                        key={step.tempId}
                                        index={index}
                                        step={step}
                                        currentMode={currentMode}
                                        handleStepChange={handleStepChange}
                                        removeStep={removeStep}
                                        stepsCount={steps.length}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>

                        {currentMode !== 'view' && currentMode !== 'breakdown' && (
                            <div className="p-4 bg-zinc-50 flex justify-center border-t-2 border-brand-primary/10">
                                <button
                                    type="button"
                                    onClick={addStep}
                                    className="flex items-center gap-2 px-6 py-2 bg-white border-2 border-brand-primary text-brand-primary rounded-xl font-bold hover:bg-brand-primary hover:text-white transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
                                    aria-label="Agregar un nuevo paso al procedimiento"
                                >
                                    <Plus className="h-5 w-5" aria-hidden="true" />
                                    Agregar Paso
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Section (Two large boxes) */}
                <section aria-label="Información complementaria" className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-32 md:pb-24">
                    <div className="bg-white border-2 border-brand-primary/20 rounded-3xl overflow-hidden space-y-0 shadow-sm print:rounded-none">
                        <label htmlFor="input-prohibido" className="text-lg font-bold text-brand-primary uppercase tracking-tight block text-center border-b-2 border-brand-primary/10 py-2 bg-zinc-50/50 print:py-1 print:text-base print:bg-transparent">
                            Prohibido y porque
                        </label>
                        <NumberedTextarea
                            id="input-prohibido"
                            index={0}
                            name="prohibido_y_porque"
                            readOnly={currentMode === 'view' || currentMode === 'breakdown'}
                            value={formData.prohibido_y_porque || ''}
                            onChange={handleInputChange}
                            minHeight="min-h-[160px]"
                            placeholder="¿Qué acciones están prohibidas durante el desarrollo del proceso y por qué?"
                        />
                    </div>
                    <div className="bg-white border-2 border-brand-primary/20 rounded-3xl overflow-hidden space-y-0 shadow-sm print:rounded-none">
                        <label htmlFor="input-anomalias" className="text-lg font-bold text-brand-primary uppercase tracking-tight block text-center border-b-2 border-brand-primary/10 py-2 bg-zinc-50/50 print:py-1 print:text-base print:bg-transparent">
                            Tratamiento anomalías
                        </label>
                        <NumberedTextarea
                            id="input-anomalias"
                            index={0}
                            name="tratamiento_anomalias"
                            readOnly={currentMode === 'view' || currentMode === 'breakdown'}
                            value={formData.tratamiento_anomalias || ''}
                            onChange={handleInputChange}
                            minHeight="min-h-[160px]"
                            placeholder="¿Qué se debe tener en cuenta y cómo se deben tratar las anomalías durante el proceso?"
                        />
                    </div>
                </section>

                {/* Version History Section */}
                {versionHistory.length > 1 && showVersionHistory && (
                    <section aria-labelledby="history-title" className="mt-12 mb-20 bg-white border-2 border-brand-primary/10 rounded-3xl overflow-hidden shadow-sm hidden-print">
                        <div className="bg-brand-primary/5 p-4 border-b-2 border-brand-primary/10 flex items-center gap-3">
                            <History className="h-5 w-5 text-brand-primary" />
                            <h3 id="history-title" className="font-bold text-brand-primary uppercase tracking-wider">Historial de Versiones</h3>
                        </div>
                        <div className="divide-y divide-brand-primary/5">
                            {versionHistory.map((version) => (
                                <div
                                    key={version.id}
                                    className={`p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors ${version.id === hdtId ? 'bg-brand-primary/5' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${version.is_current ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                            V{version.version}
                                        </div>
                                        <div>
                                            <p className="font-bold text-brand-primary">Versión {version.version}</p>
                                            <p className="text-xs text-zinc-400 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {version.fecha_elaboracion ? new Date(version.fecha_elaboracion).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Fecha no disponible'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {version.is_current && (
                                            <span className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-1 rounded-lg">
                                                <Check className="h-3 w-3" /> Vigente
                                            </span>
                                        )}
                                        {version.id !== hdtId && (
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/hdt/view/${version.id}`)}
                                                className="px-4 py-2 text-xs font-bold text-brand-primary hover:bg-brand-primary hover:text-white border border-brand-primary/20 rounded-xl transition-all"
                                            >
                                                Ver esta versión
                                            </button>
                                        )}
                                        {version.id === hdtId && (
                                            <span className="text-xs font-bold text-zinc-400 italic">Versión actual</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Floating Actions */}
                <div
                    role="toolbar"
                    aria-label="Acciones del formulario"
                    className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-2 md:px-4 z-50 hidden-print"
                >
                    <div className="bg-white/95 backdrop-blur-xl border-2 border-brand-primary/10 rounded-2xl md:rounded-3xl p-3 md:p-4 shadow-2xl flex items-center justify-between gap-2 md:gap-4 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="h-10 w-10 md:h-12 md:w-12 bg-zinc-100 text-zinc-600 rounded-xl md:rounded-2xl font-bold hover:bg-zinc-200 transition-all flex items-center justify-center shrink-0"
                                title={currentMode === 'view' || currentMode === 'breakdown' ? 'Volver' : 'Cancelar'}
                                aria-label="Volver o Cancelar"
                            >
                                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/hdt')}
                                className="h-10 w-10 md:h-12 md:w-12 bg-brand-primary/10 text-brand-primary rounded-xl md:rounded-2xl font-bold hover:bg-brand-primary hover:text-white transition-all flex items-center justify-center shrink-0"
                                title="Menú Principal"
                                aria-label="Menú Principal"
                            >
                                <Home className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
                            </button>
                        </div>

                        {(currentMode === 'view' || currentMode === 'breakdown') && (
                            <button
                                type="button"
                                onClick={() => setCurrentMode(currentMode === 'view' ? 'breakdown' : 'view')}
                                className="px-4 md:px-6 py-2 md:py-3 text-sm md:text-base bg-brand-primary/10 text-brand-primary rounded-xl md:rounded-2xl font-bold hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center shrink-0"
                            >
                                <LayoutGrid className="h-4 w-4 md:h-5 md:w-5 hidden sm:block shrink-0" />
                                <span className="whitespace-nowrap">{currentMode === 'view' ? 'Desglose' : 'Completa'}</span>
                            </button>
                        )}

                        {(currentMode === 'view' || currentMode === 'edit') && versionHistory.length > 1 && (
                            <button
                                type="button"
                                onClick={() => setShowVersionHistory(!showVersionHistory)}
                                className={`px-4 md:px-6 py-2 md:py-3 text-sm md:text-base rounded-xl md:rounded-2xl font-bold transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center shrink-0 ${showVersionHistory ? 'bg-orange-100 text-orange-700 border-2 border-orange-200' : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white'}`}
                            >
                                <History className="h-4 w-4 md:h-5 md:w-5 hidden sm:block shrink-0" />
                                <span className="whitespace-nowrap">{showVersionHistory ? 'Cerrar His.' : 'Versiones'}</span>
                            </button>
                        )}

                        {(currentMode === 'view' || currentMode === 'breakdown') && (
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="px-4 md:px-6 py-2 md:py-3 text-sm md:text-base bg-zinc-800 text-white rounded-xl md:rounded-2xl font-bold hover:bg-black transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center shrink-0"
                                aria-label="Imprimir la hoja de trabajo"
                            >
                                <Printer className="h-4 w-4 md:h-5 md:w-5 shrink-0" aria-hidden="true" />
                                <span className="whitespace-nowrap hidden sm:inline">Imprimir</span>
                            </button>
                        )}

                        <div className="flex-1 flex justify-center order-first sm:order-none w-full sm:w-auto mb-2 sm:mb-0 empty:hidden">
                            {error && (
                                <div className="flex items-center gap-2 text-red-600 font-bold bg-red-50 px-3 md:px-4 py-1.5 md:py-2 rounded-xl animate-bounce text-xs md:text-sm">
                                    <AlertCircle className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                            {success && (
                                <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-3 md:px-4 py-1.5 md:py-2 rounded-xl animate-pulse text-xs md:text-sm">
                                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                                    <span className="whitespace-nowrap">¡Guardado con éxito!</span>
                                </div>
                            )}
                        </div>

                        {currentMode !== 'view' && currentMode !== 'breakdown' && (
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 md:px-10 py-2.5 md:py-3 text-sm md:text-base bg-brand-primary text-white rounded-xl md:rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-lg hover:shadow-brand-primary/30 flex items-center gap-2 disabled:opacity-50 flex-1 sm:flex-none justify-center shrink-0"
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin shrink-0" />
                                ) : (
                                    <Save className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                                )}
                                <span className="whitespace-nowrap">{currentMode === 'create' ? 'Crear HDT' : 'Guardar Cambios'}</span>
                            </button>
                        )}

                        {currentMode === 'edit' && (
                            <button
                                type="button"
                                onClick={handleCreateNewVersion}
                                disabled={creatingVersion || saving}
                                className="px-4 md:px-6 py-2 md:py-3 text-sm md:text-base bg-zinc-100 text-brand-primary border-2 border-brand-primary/20 rounded-xl md:rounded-2xl font-bold hover:bg-brand-primary/10 transition-all flex items-center gap-2 disabled:opacity-50 flex-1 sm:flex-none justify-center shrink-0"
                            >
                                {creatingVersion ? (
                                    <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin shrink-0" />
                                ) : (
                                    <History className="h-4 w-4 md:h-5 md:w-5 hidden sm:block shrink-0" />
                                )}
                                <span className="whitespace-nowrap">Nueva Versión</span>
                            </button>
                        )}
                        
                        {canDelete && currentMode !== 'create' && (
                            <button
                                type="button"
                                onClick={handleDeleteAllVersions}
                                disabled={saving}
                                className="px-4 md:px-6 py-2 md:py-3 text-sm md:text-base bg-red-100 text-red-600 border-2 border-red-200 rounded-xl md:rounded-2xl font-bold hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50 flex-1 sm:flex-none justify-center shrink-0"
                                title="Eliminar HDT completa"
                            >
                                <Trash2 className="h-4 w-4 md:h-5 md:w-5 hidden sm:block shrink-0" />
                                <span className="whitespace-nowrap">Eliminar</span>
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </main>
    )
}

interface SortableStepRowProps {
    index: number;
    step: Partial<StepRow> & { tempId: string };
    currentMode: 'create' | 'edit' | 'view' | 'breakdown';
    handleStepChange: (index: number, e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    removeStep: (index: number) => void;
    stepsCount: number;
}

function SortableStepRow({ index, step, currentMode, handleStepChange, removeStep, stepsCount }: SortableStepRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: step.tempId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`grid ${currentMode === 'breakdown' ? 'grid-cols-3' : 'grid-cols-[1.5fr_1fr_1fr_1fr]'} relative group divide-x-2 divide-brand-primary/5 print:table-row bg-white`}
        >
            {currentMode !== 'breakdown' && (
                <div className="relative">
                    {(currentMode === 'create' || currentMode === 'edit') && (
                        <div
                            {...attributes}
                            {...listeners}
                            className="absolute left-1.5 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-20 hidden-print"
                        >
                            <GripVertical className="h-4 w-4 text-brand-primary/40 hover:text-brand-primary" />
                        </div>
                    )}
                    <div className={(currentMode === 'create' || currentMode === 'edit') ? "pl-5" : ""}>
                        <NumberedTextarea
                            id={`acciones-${index}`}
                            name="acciones_importantes"
                            readOnly={currentMode === 'view'}
                            value={step.acciones_importantes || ''}
                            onStepChange={handleStepChange}
                            index={index}
                            minHeight="min-h-[140px]"
                            placeholder="Redacta detalladamente las acciones..."
                        />
                    </div>
                </div>
            )}
            <NumberedTextarea
                id={`paso-${index}`}
                name="paso_importante"
                readOnly={currentMode === 'view' || currentMode === 'breakdown'}
                value={step.paso_importante || ''}
                onStepChange={handleStepChange}
                index={index}
                placeholder="Actividad corta que genere transformación"
            />
            <NumberedTextarea
                id={`punto-${index}`}
                name="punto_clave"
                readOnly={currentMode === 'view' || currentMode === 'breakdown'}
                value={step.punto_clave || ''}
                onStepChange={handleStepChange}
                index={index}
                placeholder="¿Cómo logro el paso importante?"
            />
            <div className="relative">
                <NumberedTextarea
                    id={`razon-${index}`}
                    name="razon_punto_clave"
                    readOnly={currentMode === 'view' || currentMode === 'breakdown'}
                    value={step.razon_punto_clave || ''}
                    onStepChange={handleStepChange}
                    index={index}
                    placeholder="¿Por qué o cuál es la razón de este punto clave?"
                />
                {stepsCount > 1 && currentMode !== 'view' && currentMode !== 'breakdown' && (
                    <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="absolute bottom-1 right-1 p-1.5 bg-red-50 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white z-10"
                        aria-label="Eliminar este paso"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
