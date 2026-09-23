'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
    X, 
    Camera, 
    UploadCloud, 
    AlertTriangle, 
    CheckCircle2, 
    Loader2, 
    Search, 
    Trash2, 
    Wrench, 
    Layers, 
    Package, 
    Tag, 
    Clock, 
    User, 
    Plus, 
    Minus
} from 'lucide-react'
import { Defecto, OrdenMueble, SupervisorTurno } from '@/types/muebles'
import { 
    getDefectos, 
    getComponentesByOF, 
    uploadFotoDefectoMuebles, 
    registrarDefectosMuebles,
    getSupervisoresTurno 
} from '@/lib/supabase/queries/muebles'
import { toast } from 'sonner'

interface ModalReportarDefectoMuebleProps {
    isOpen: boolean
    onClose: () => void
    ordenFabricacion?: string
    ordenData?: Partial<OrdenMueble>
    usuarioNombre: string
    operarioCedula?: string
    operarioNombre?: string
    turno?: string
    taladro?: string
    plantaMuebles?: string
    onSuccess?: () => void
    onFinishInspectionTask?: () => Promise<void> | void
}

interface ComponenteItem {
    sku?: string
    componente?: string
    cantidad?: number
}

export default function ModalReportarDefectoMueble({
    isOpen,
    onClose,
    ordenFabricacion: initialOF = '',
    ordenData,
    usuarioNombre,
    operarioCedula,
    operarioNombre,
    turno: initialTurno = '1',
    taladro: initialTaladro = '',
    plantaMuebles = 'Muebles',
    onSuccess,
    onFinishInspectionTask
}: ModalReportarDefectoMuebleProps) {
    // Form states
    const [of, setOf] = useState<string>(initialOF)
    const [productoDesc, setProductoDesc] = useState<string>(ordenData?.producto_descripcion || '')
    const [productoSku, setProductoSku] = useState<string>(ordenData?.producto_sku || '')
    
    // Components
    const [componentes, setComponentes] = useState<ComponenteItem[]>([])
    const [selectedComponente, setSelectedComponente] = useState<string>('')
    const [customComponente, setCustomComponente] = useState<string>('')
    const [isCustomComp, setIsCustomComp] = useState<boolean>(false)
    const [loadingComponentes, setLoadingComponentes] = useState<boolean>(false)

    // Defects Catalog
    const [defectos, setDefectos] = useState<Defecto[]>([])
    const [selectedDefectoId, setSelectedDefectoId] = useState<number | null>(null)
    const [searchDefecto, setSearchDefecto] = useState<string>('')
    const [loadingDefectos, setLoadingDefectos] = useState<boolean>(false)

    // Type: Reparación vs Reposición
    const [reparable, setReparable] = useState<boolean>(true) // true = Reparación, false = Reposición
    const [cantidad, setCantidad] = useState<number>(1)

    // Shift, Machine & Supervisor
    const [turno, setTurno] = useState<string>(initialTurno)
    const [taladro, setTaladro] = useState<string>(initialTaladro || (plantaMuebles === 'Muebles' ? 'HUAHUA' : 'Taladro Cefi'))
    const [supervisor, setSupervisor] = useState<string>('')
    const [supervisoresTurnos, setSupervisoresTurnos] = useState<SupervisorTurno[]>([])

    // Photo
    const [fotoFile, setFotoFile] = useState<File | null>(null)
    const [fotoPreview, setFotoPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const cameraInputRef = useRef<HTMLInputElement | null>(null)

    // Submission
    const [submitting, setSubmitting] = useState<boolean>(false)

    // Machine options
    const taladroOptions = plantaMuebles === 'Muebles' 
        ? ['HUAHUA', 'HUA HUA 2', 'CX200', 'CX100', 'CYFLEX S', 'NO APLICA']
        : ['Taladro Cefi', 'CX100', 'NO APLICA']

    // Load initial defects and supervisors
    useEffect(() => {
        if (!isOpen) return

        const loadInitialData = async () => {
            setLoadingDefectos(true)
            try {
                const [defList, supList] = await Promise.all([
                    getDefectos(true),
                    getSupervisoresTurno()
                ])
                setDefectos(defList)
                setSupervisoresTurnos(supList)

                // Match supervisor by shift and plant
                const foundSup = supList.find(s => s.turno === turno && s.planta?.toLowerCase() === plantaMuebles?.toLowerCase())
                if (foundSup && foundSup.supervisor_nombre) {
                    setSupervisor(foundSup.supervisor_nombre)
                }
            } catch (err) {
                console.error('Error loading defect modal data:', err)
            } finally {
                setLoadingDefectos(false)
            }
        }

        loadInitialData()
    }, [isOpen, turno, plantaMuebles])

    // Update OF data when initialOF or ordenData changes
    useEffect(() => {
        if (isOpen) {
            const currentOF = initialOF || ordenData?.orden_fabricacion || ''
            setOf(currentOF)
            if (ordenData?.producto_descripcion) setProductoDesc(ordenData.producto_descripcion)
            if (ordenData?.producto_sku) setProductoSku(ordenData.producto_sku)
            if (initialTaladro) setTaladro(initialTaladro)
            if (initialTurno) setTurno(initialTurno)
            setCantidad(1)
            setReparable(true)
            setSelectedDefectoId(null)
            setFotoFile(null)
            setFotoPreview(null)
            setIsCustomComp(false)
            setCustomComponente('')
        }
    }, [isOpen, initialOF, ordenData, initialTaladro, initialTurno])

    // Load components when OF is set
    useEffect(() => {
        if (!isOpen || !of || of.length < 4) {
            setComponentes([])
            setSelectedComponente('')
            return
        }

        const fetchComponents = async () => {
            setLoadingComponentes(true)
            try {
                const comps = await getComponentesByOF(of)
                setComponentes(comps)
                if (comps.length > 0 && comps[0].componente) {
                    setSelectedComponente(comps[0].componente)
                } else {
                    setSelectedComponente('GENERAL')
                }
            } catch (err) {
                console.error('Error fetching OF components:', err)
                setComponentes([])
            } finally {
                setLoadingComponentes(false)
            }
        }

        fetchComponents()
    }, [isOpen, of])

    // Update supervisor when turno changes
    useEffect(() => {
        if (supervisoresTurnos.length > 0) {
            const foundSup = supervisoresTurnos.find(s => s.turno === turno && s.planta?.toLowerCase() === plantaMuebles?.toLowerCase())
            if (foundSup && foundSup.supervisor_nombre) {
                setSupervisor(foundSup.supervisor_nombre)
            }
        }
    }, [turno, supervisoresTurnos, plantaMuebles])

    // Handle photo select
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFotoFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setFotoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleRemoveFoto = () => {
        setFotoFile(null)
        setFotoPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        if (cameraInputRef.current) cameraInputRef.current.value = ''
    }

    const filteredDefectos = defectos.filter(d => 
        d.nombre.toLowerCase().includes(searchDefecto.toLowerCase()) ||
        d.id.toString().includes(searchDefecto)
    )

    const handleSubmit = async (finishInspection = false) => {
        if (!of || of.trim().length < 4) {
            toast.error('Por favor ingresa una Orden de Fabricación válida')
            return
        }

        const compName = isCustomComp ? customComponente.trim() : selectedComponente
        if (!compName) {
            toast.error('Por favor selecciona o escribe el componente afectado')
            return
        }

        if (!selectedDefectoId) {
            toast.error('Por favor selecciona un defecto del catálogo')
            return
        }

        if (cantidad < 1) {
            toast.error('La cantidad debe ser mayor a 0')
            return
        }

        setSubmitting(true)
        try {
            let uploadedPhotoUrl = 'null'
            if (fotoFile) {
                toast.loading('Subiendo fotografía...', { id: 'upload-foto' })
                try {
                    uploadedPhotoUrl = await uploadFotoDefectoMuebles(
                        fotoFile, 
                        `defecto_of_${of}_${Date.now()}.${fotoFile.type.split('/')[1] || 'jpg'}`
                    )
                    toast.success('Foto subida exitosamente', { id: 'upload-foto' })
                } catch (photoErr) {
                    console.error('Error subiendo foto:', photoErr)
                    toast.error('No se pudo subir la foto, pero guardaremos el defecto', { id: 'upload-foto' })
                }
            }

            // Find selected component SKU
            const matchedComp = componentes.find(c => c.componente === compName)
            const skuVal = matchedComp?.sku || productoSku || 'N/A'

            const inspectorIdentificado = operarioNombre 
                ? `${operarioNombre}${operarioCedula ? ` - ID: ${operarioCedula}` : ''}`
                : (usuarioNombre || 'Inspector Calidad')

            await registrarDefectosMuebles({
                orden_fabricacion: of.trim(),
                componente: compName,
                sku: skuVal,
                defecto_id: selectedDefectoId,
                reparable: reparable,
                foto: uploadedPhotoUrl,
                cantidad: cantidad,
                turno: turno,
                taladro: taladro || 'HUAHUA',
                supervisor: supervisor || 'Sin supervisor',
                created_by: inspectorIdentificado,
                estado: 'Inspeccion'
            })

            if (finishInspection && onFinishInspectionTask) {
                toast.loading('Finalizando proceso de inspección y deteniendo cronómetro...', { id: 'finish-task' })
                await onFinishInspectionTask()
                toast.success('¡Defecto registrado e inspección finalizada con éxito!', { id: 'finish-task' })
            } else {
                toast.success(`¡Defecto registrado exitosamente (${cantidad} ${reparable ? 'Reparación' : 'Reposición'})!`)
            }

            if (onSuccess) onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error al registrar defecto:', error)
            toast.error(`Error al registrar defecto: ${error.message || 'Error desconocido'}`)
        } finally {
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 md:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="bg-[#324354] text-white px-6 py-4 flex items-center justify-between border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400">
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold uppercase tracking-tight">Reportar Defecto / Calidad</h2>
                            <p className="text-xs text-gray-300 font-medium">Inspección de calidad y reposiciones en Muebles</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
                    
                    {/* Section 1: OF & Product Info */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-black text-[#324354] uppercase tracking-wider flex items-center gap-1.5">
                                <Package size={14} className="text-blue-600" />
                                Orden de Fabricación (OF)
                            </label>
                            {of && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    OF #{of}
                                </span>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={of}
                                onChange={(e) => setOf(e.target.value.replace(/\D/g, ''))}
                                placeholder="Ej. 10074130"
                                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-sm focus:bg-white focus:border-blue-500 outline-none"
                            />
                        </div>

                        {(productoDesc || productoSku) && (
                            <div className="pt-2 border-t border-gray-100 flex flex-col gap-0.5 text-xs text-gray-600">
                                {productoDesc && <span className="font-bold text-gray-800 uppercase line-clamp-1">{productoDesc}</span>}
                                {productoSku && <span className="text-[10px] text-gray-400 font-mono">SKU: {productoSku}</span>}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Component / Piece Selection */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-black text-[#324354] uppercase tracking-wider flex items-center gap-1.5">
                                <Layers size={14} className="text-blue-600" />
                                Componente o Pieza Afectada
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsCustomComp(!isCustomComp)}
                                className="text-[10px] font-bold text-blue-600 hover:underline"
                            >
                                {isCustomComp ? 'Seleccionar de lista' : '+ Escribir otro'}
                            </button>
                        </div>

                        {loadingComponentes ? (
                            <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                                <Loader2 size={16} className="animate-spin text-blue-600" />
                                Cargando despiece de la OF...
                            </div>
                        ) : isCustomComp ? (
                            <input 
                                type="text"
                                value={customComponente}
                                onChange={(e) => setCustomComponente(e.target.value.toUpperCase())}
                                placeholder="Nombre de la pieza (Ej. PUERTA LATERAL, COSTADO IZQ...)"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-sm focus:bg-white focus:border-blue-500 outline-none"
                            />
                        ) : componentes.length > 0 ? (
                            <select
                                value={selectedComponente}
                                onChange={(e) => setSelectedComponente(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-sm focus:bg-white focus:border-blue-500 outline-none cursor-pointer"
                            >
                                <option value="">Seleccione pieza del despiece</option>
                                {componentes.map((c, i) => (
                                    <option key={i} value={c.componente || `Pieza ${i + 1}`}>
                                        {c.componente || 'Sin nombre'} {c.sku ? `(${c.sku})` : ''}
                                    </option>
                                ))}
                                <option value="GENERAL">GENERAL / MUEBLE COMPLETO</option>
                            </select>
                        ) : (
                            <input 
                                type="text"
                                value={selectedComponente}
                                onChange={(e) => setSelectedComponente(e.target.value.toUpperCase())}
                                placeholder="Escribe el nombre de la pieza (Ej. BASE, LATERAL...)"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-sm focus:bg-white focus:border-blue-500 outline-none"
                            />
                        )}
                    </div>

                    {/* Section 3: Defect Selection */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                        <label className="text-[11px] font-black text-[#324354] uppercase tracking-wider flex items-center gap-1.5">
                            <Tag size={14} className="text-blue-600" />
                            Seleccionar Defecto
                        </label>

                        {/* Defect Search */}
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text"
                                value={searchDefecto}
                                onChange={(e) => setSearchDefecto(e.target.value)}
                                placeholder="Filtrar defecto por nombre..."
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 outline-none"
                            />
                        </div>

                        {/* Defect List */}
                        <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-200 bg-gray-50/50">
                            {loadingDefectos ? (
                                <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                                    <Loader2 size={16} className="animate-spin text-blue-600" /> Cargando catálogo de defectos...
                                </div>
                            ) : filteredDefectos.length === 0 ? (
                                <div className="p-4 text-center text-xs text-gray-400">
                                    No se encontraron defectos
                                </div>
                            ) : (
                                filteredDefectos.map((d) => {
                                    const isSelected = selectedDefectoId === d.id
                                    return (
                                        <div 
                                            key={d.id}
                                            onClick={() => setSelectedDefectoId(d.id)}
                                            className={`p-2.5 px-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                                                isSelected 
                                                    ? 'bg-blue-600 text-white font-bold' 
                                                    : 'hover:bg-blue-50 text-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                                                <span>{d.nombre}</span>
                                            </div>
                                            {isSelected && (
                                                <CheckCircle2 size={16} className="text-white shrink-0" />
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* Section 4: Tipo de Hallazgo & Cantidad */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Tipo de Hallazgo */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <label className="text-[11px] font-black text-[#324354] uppercase tracking-wider block">
                                Tipo de Hallazgo
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setReparable(true)}
                                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                                        reparable 
                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-600' 
                                            : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <Wrench size={14} />
                                    REPARACIÓN
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReparable(false)}
                                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                                        !reparable 
                                            ? 'bg-red-600 text-white shadow-md shadow-red-600/20 ring-2 ring-red-600' 
                                            : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <AlertTriangle size={14} />
                                    REPOSICIÓN
                                </button>
                            </div>
                        </div>

                        {/* Cantidad */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <label className="text-[11px] font-black text-[#324354] uppercase tracking-wider block">
                                Cantidad de Piezas
                            </label>
                            <div className="flex items-center justify-center gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold transition-all active:scale-95"
                                >
                                    <Minus size={16} />
                                </button>
                                <input 
                                    type="number"
                                    min={1}
                                    value={cantidad}
                                    onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-16 h-10 text-center font-black text-lg bg-gray-50 border border-gray-200 rounded-xl outline-none"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setCantidad(cantidad + 1)}
                                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold transition-all active:scale-95"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Photo Capture / Upload */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                        <label className="text-[11px] font-black text-[#324354] uppercase tracking-wider flex items-center gap-1.5">
                            <Camera size={14} className="text-blue-600" />
                            Foto de Evidencia (Opcional)
                        </label>

                        {/* Hidden Inputs */}
                        <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            ref={cameraInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                        />
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                        />

                        {fotoPreview ? (
                            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-black/5 aspect-video max-h-48 flex items-center justify-center group">
                                <img 
                                    src={fotoPreview} 
                                    alt="Vista previa evidencia" 
                                    className="w-full h-full object-contain"
                                />
                                <button
                                    type="button"
                                    onClick={handleRemoveFoto}
                                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 transition-all active:scale-95"
                                    title="Eliminar foto"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="p-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-700 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
                                >
                                    <Camera size={24} className="text-blue-600" />
                                    <span className="text-xs font-bold uppercase">Tomar Foto</span>
                                    <span className="text-[10px] text-gray-500 font-normal">Abrir cámara</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
                                >
                                    <UploadCloud size={24} className="text-gray-500" />
                                    <span className="text-xs font-bold uppercase">Subir Imagen</span>
                                    <span className="text-[10px] text-gray-500 font-normal">Galería / Archivo</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Section 6: Context (Turno, Taladro, Supervisor) */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                <Clock size={11} /> Turno
                            </label>
                            <select
                                value={turno}
                                onChange={(e) => setTurno(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                            >
                                <option value="1">Turno 1</option>
                                <option value="2">Turno 2</option>
                                <option value="3">Turno 3</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                <Wrench size={11} /> Taladro / Centro
                            </label>
                            <select
                                value={taladro}
                                onChange={(e) => setTaladro(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                            >
                                {taladroOptions.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                <User size={11} /> Supervisor
                            </label>
                            <input 
                                type="text"
                                value={supervisor}
                                onChange={(e) => setSupervisor(e.target.value)}
                                placeholder="Supervisor de turno"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-white px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors uppercase"
                    >
                        Cancelar
                    </button>

                    <div className="flex items-center gap-2">
                        {onFinishInspectionTask ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleSubmit(false)}
                                    disabled={submitting || !selectedDefectoId || !of}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-all ${
                                        submitting || !selectedDefectoId || !of ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                    <CheckCircle2 size={16} />
                                    <span>GUARDAR DEFECTO</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSubmit(true)}
                                    disabled={submitting || !selectedDefectoId || !of}
                                    className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg flex items-center gap-2 transition-all active:scale-[0.98] ${
                                        submitting || !selectedDefectoId || !of
                                            ? 'bg-gray-300 shadow-none cursor-not-allowed'
                                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                                    }`}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>GUARDANDO...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} />
                                            <span>GUARDAR Y FINALIZAR INSPECCIÓN</span>
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleSubmit(false)}
                                disabled={submitting || !selectedDefectoId || !of}
                                className={`px-6 py-3 rounded-2xl font-bold text-sm text-white shadow-xl flex items-center gap-2 transition-all active:scale-[0.98] ${
                                    submitting || !selectedDefectoId || !of
                                        ? 'bg-gray-300 shadow-none cursor-not-allowed'
                                        : 'bg-[#324354] hover:bg-[#254153] shadow-blue-900/20'
                                }`}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>GUARDANDO...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        <span>REGISTRAR {reparable ? 'REPARACIÓN' : 'REPOSICIÓN'}</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
