'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Home, ChevronDown, Save, Info, Paperclip, Camera, X, AlertTriangle } from 'lucide-react'
import { createOPTObservation } from '../actions'
import { SearchableSelect } from '@/components/opt/ui/SearchableSelect'
import { ScoreModal, ScoreData } from '@/components/opt/ui/ScoreModal'

interface OPTFormProps {
    empleados: { nombreCompleto: string, foto?: string | null }[] | null
    cargos: { cargo: string }[] | null
    realizadoPorList?: { nombreCompleto: string }[] | null
    initialData?: any
    isReadOnly?: boolean
}

export default function OPTForm({ empleados, cargos, realizadoPorList, initialData, isReadOnly = false }: OPTFormProps) {
    const [elementosSeguridad, setElementosSeguridad] = useState(initialData?.['Elementos de seguridad'] ?? false)
    const [puestoErgonomia, setPuestoErgonomia] = useState(initialData?.['Puesto con ergonomía'] ?? false)
    const [puestoOrdenado, setPuestoOrdenado] = useState(initialData?.['Puesto ordenado y aseado'] ?? false)
    const [cumplePuestaPunto, setCumplePuestaPunto] = useState(initialData?.['Cumple puesta a punto / plan de control'] ?? false)
    const [cumpleHdt, setCumpleHdt] = useState(initialData?.['Cumple HDT'] ?? false)
    const [cumple5s, setCumple5s] = useState(initialData?.['Cumple 5S'] ?? false)
    const [herramientasEstado, setHerramientasEstado] = useState(initialData?.['Herramientas en buen estado'] ?? false)
    const [conoceDefectos, setConoceDefectos] = useState(initialData?.['Operario conoce los defectos de calidad'] ?? false)
    const [conoceIndicadores, setConoceIndicadores] = useState(initialData?.['Operario conoce sus indicadores'] ?? false)
    const [productoConforme, setProductoConforme] = useState(initialData?.['Producto conforme'] ?? false)

    // States for controlled text areas
    const [obsSeguridad, setObsSeguridad] = useState(initialData?.['Observaciones seguridad'] ?? '')
    const [obsErgonomia, setObsErgonomia] = useState(initialData?.['Observaciones de ergonomía'] ?? '')
    const [obsOrdenAseo, setObsOrdenAseo] = useState(initialData?.['Observaciones orden y aseo'] ?? '')
    const [obsHdt, setObsHdt] = useState(initialData?.['Observaciones HDT'] ?? '')
    const [obs5s, setObs5s] = useState(initialData?.['Observaciones 5S'] ?? '')
    const [obsPlanControl, setObsPlanControl] = useState(initialData?.['Observaciones plan control'] ?? '')
    const [obsHerramientas, setObsHerramientas] = useState(initialData?.['Observaciones herramientas'] ?? '')
    const [obsDefectos, setObsDefectos] = useState(initialData?.['Observaciones defectos calidad'] ?? '')
    const [obsIndicadores, setObsIndicadores] = useState(initialData?.['Observaciones indicadores'] ?? '')
    const [obsProductoConforme, setObsProductoConforme] = useState(initialData?.['Observaciones producto conforme'] ?? '')
    const [emociones, setEmociones] = useState(initialData?.['Emociones'] ?? '')

    const [vaCount, setVaCount] = useState(parseInt(initialData?.['VA'] || '0'))
    const [nvaCount, setNvaCount] = useState(parseInt(initialData?.['NVA'] || '0'))
    const [obsVaNva, setObsVaNva] = useState(initialData?.['Observaciones VA/NVA'] ?? '')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const [selectedOperatorPhoto, setSelectedOperatorPhoto] = useState<string | null>(
        initialData?.['Operario']
            ? empleados?.find(e => e.nombreCompleto === initialData['Operario'])?.foto || null
            : null
    )
    const [puestoValue, setPuestoValue] = useState(initialData?.['Puesto'] ?? '')

    const [activePopup, setActivePopup] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [scoreData, setScoreData] = useState<ScoreData | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const togglePopup = (name: string) => {
        setActivePopup(activePopup === name ? null : name)
    }

    const helpTexts = {
        seguridad: "¿El operario del puesto se encuentra usando todos los elementos de proteccion personal asignados al puesto? \n\n¿Existe alguna condición insegura asociada al almacenamiento, manipulación o exposición a sustancias químicas?",
        ergonomia: "¿El trabajador mantiene una postura adecuada? ¿Las alturas de trabajo son correctas? ¿Tiene los apoyos necesarios?",
        ordenAseo: "¿El área está libre de obstáculos? ¿Los materiales están en su lugar? ¿Se evidencia limpieza en la zona de trabajo?",
        planControl: "¿Se realizaron los ajustes previos? ¿Se están siguiendo los parámetros definidos en el plan de control?",
        hdt: "¿Se cuenta con la Hoja de Datos Técnicos o documentación necesaria? ¿Está actualizada y disponible?",
        s5: "¿Se aplica Sentido de Utilización, Orden, Limpieza, Estandarización y Disciplina en el puesto?",
        herramientas: "¿Las herramientas están limpias y funcionales? ¿Cuentan con sus protecciones? ¿Se evidencia algún daño que represente riesgo?",
        defectos: "¿El operario puede identificar los defectos más comunes? ¿Sabe cómo actuar al detectarlos?",
        indicadores: "¿El operario conoce su meta diaria? ¿Sabe cuál es su desempeño actual vs la meta?",
        productoConforme: "¿El producto actual cumple con todas las especificaciones de calidad?",
        hdtContent: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. \n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim anim id est laborum."
    }

    const InfoPopup = ({ name, text }: { name: string, text: string }) => (
        <div className="flex items-center gap-2 relative">
            <span className="text-lg font-medium text-[#254153]">{name}</span>
            <button
                type="button"
                onClick={() => togglePopup(name)}
                className="text-[#749094] hover:opacity-70 transition-opacity"
            >
                <Info size={22} />
            </button>
            {activePopup === name && (
                <div className="absolute left-0 top-full mt-2 w-72 p-4 bg-white border-2 border-secondary rounded-sm shadow-xl z-10 text-sm text-primary italic">
                    {text.split('\n\n').map((p, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <div className="my-2 border-t border-gray-100" />}
                            <p>{p}</p>
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    )

    // Helper to handle toggle changes with auto-clear
    const handleToggleChange = (setter: (v: boolean) => void, clearObs: () => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked
        setter(checked)
        if (checked) {
            clearObs()
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setErrorMessage(null)

        const form = e.currentTarget;
        if (!form.checkValidity()) {
            for (const elem of Array.from(form.elements) as any[]) {
                if (!elem.validity.valid) {
                    const name = elem.name || elem.id || 'un campo';
                    // Convert names like observaciones_seguridad to Observaciones seguridad
                    const friendlyName = name.replace(/_/g, ' ');
                    setErrorMessage(`Falta completar el campo obligatorio: ${friendlyName}. \n\nRecuerde que si marca "No", las observaciones son obligatorias.`);
                    elem.focus();
                    elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
            return;
        }

        setIsSubmitting(true)
        try {
            const formData = new FormData(e.currentTarget)
            const result = await createOPTObservation(formData)
            if (result && result.success && result.scoreData) {
                setScoreData(result.scoreData as ScoreData)
                setIsModalOpen(true)
            } else if (result && !result.success) {
                setErrorMessage(`Error de la Base de Datos: ${result.error || 'Desconocido'}`)
                window.scrollTo({ top: 0, behavior: 'smooth' })
            }
        } catch (error: any) {
            console.error('Error submitting form:', error)
            setErrorMessage(`Fallo de conexión crítico. Asegúrese de que el servidor esté funcionando: ${error.message || 'Error Desconocido'}`)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
        <ScoreModal isOpen={isModalOpen} scoreData={scoreData} />
        <form onSubmit={handleSubmit} noValidate>
            <div className="max-w-2xl mx-auto w-full">
                {/* Header with Title  */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                        <span className="text-[#749094]">*</span> Tema de la OPT
                    </h1>
                    <div className="flex items-center gap-4">
                        {!isReadOnly && (
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`text-[#254153] transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 active:scale-95'}`}
                                title="Guardar"
                            >
                                <Save size={40} strokeWidth={isSubmitting ? 2 : 1.5} className={isSubmitting ? 'animate-pulse' : ''} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Message Banner */}
                {errorMessage && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md shadow-sm">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">
                                    No se pudo guardar la OPT
                                </h3>
                                <div className="mt-2 text-sm text-red-700 whitespace-pre-wrap">
                                    {errorMessage}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-6">
                    {/* Tema Input */}
                    <div className="w-full">
                        <input
                            name="titulo"
                            type="text"
                            placeholder="Escribe el tema aquí..."
                            className={`w-full h-12 border-2 border-[#254153] rounded-sm px-4 focus:outline-none focus:ring-2 focus:ring-[#749094] text-lg ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            defaultValue={initialData?.['Título'] ?? ''}
                            readOnly={isReadOnly}
                            required={!isReadOnly}
                        />
                    </div>

                    {/* Realizado por */}
                    {!isReadOnly && realizadoPorList && realizadoPorList.length > 0 && (
                        <SearchableSelect
                            name="realizadoPor"
                            label="Realizada por"
                            options={realizadoPorList.map(e => e.nombreCompleto)}
                            placeholder="Seleccione quién realiza la OPT"
                            required={false}
                        />
                    )}

                    {/* Planta Selection */}
                    <div className="space-y-1">
                        <label className="text-lg font-medium">Planta</label>
                        <div className="relative">
                            <select
                                name="planta"
                                className={`w-full h-12 border-2 border-[#254153] rounded-sm px-4 bg-white text-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#749094] ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                defaultValue={initialData?.['Planta'] ?? 'Marmol sintetico'}
                                disabled={isReadOnly}
                                required={!isReadOnly}
                            >
                                <option value="Marmol sintetico">Marmol sintetico</option>
                                <option value="Fibra de vidrio">Fibra de vidrio</option>
                                <option value="RTM">RTM</option>
                                <option value="Muebles">Muebles</option>
                                <option value="CEFI">CEFI</option>
                                <option value="Moldes">Moldes</option>
                                <option value="RR Moldes">RR Moldes</option>
                                <option value="Mantenimiento">Mantenimiento</option>
                                <option value="Calidad">Calidad</option>
                            </select>
                            <div className="absolute right-0 top-0 h-full w-12 bg-[#749094] flex items-center justify-center text-white border-l-2 border-[#254153] pointer-events-none">
                                <ChevronDown size={32} strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>

                    <SearchableSelect
                        name="puesto"
                        label="Puesto"
                        options={cargos?.map(c => c.cargo) || []}
                        placeholder="Seleccione un puesto"
                        required={!isReadOnly}
                        onValueChange={setPuestoValue}
                        defaultValue={initialData?.['Puesto']}
                        disabled={isReadOnly}
                    />

                    <SearchableSelect
                        name="operario"
                        label="Operario"
                        options={empleados?.map(e => e.nombreCompleto) || []}
                        placeholder="Seleccione un operario"
                        required={!isReadOnly}
                        onValueChange={(value) => {
                            const emp = empleados?.find(e => e.nombreCompleto === value)
                            setSelectedOperatorPhoto(emp?.foto || null)
                        }}
                        defaultValue={initialData?.['Operario']}
                        disabled={isReadOnly}
                    />

                    {/* Photo Box Display */}
                    <div className="flex justify-center my-4">
                        <div className="w-72 h-80 border-2 border-[#254153] rounded-sm flex items-center justify-center bg-gray-50 overflow-hidden">
                            {selectedOperatorPhoto ? (
                                <img
                                    src={selectedOperatorPhoto}
                                    alt="Foto del operario"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400?text=Error+al+cargar+foto'
                                    }}
                                />
                            ) : (
                                <div className="text-gray-400 flex flex-col items-center gap-2">
                                    <X size={64} className="opacity-20 text-[#254153]" />
                                    <span className="text-sm italic">Sin foto seleccionada</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Observación lejana / cercana Selection */}
                    <div className="space-y-1">
                        <label className="text-lg font-medium">Observación lejana / cercana</label>
                        <div className="relative">
                            <select
                                name="observacion_tipo"
                                className={`w-full h-12 border-2 border-[#254153] rounded-sm px-4 bg-white text-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#749094] ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                defaultValue={initialData?.['Observación lejana / cercana'] ?? 'Cercana'}
                                disabled={isReadOnly}
                            >
                                <option value="Lejana">Lejana</option>
                                <option value="Cercana">Cercana</option>
                            </select>
                            <div className="absolute right-0 top-0 h-full w-12 bg-[#749094] flex items-center justify-center text-white border-l-2 border-[#254153] pointer-events-none">
                                <ChevronDown size={32} strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>

                    {/* Etiquetas Selection */}
                    <div className="space-y-1">
                        <label className="text-lg font-medium">Etiquetas</label>
                        <div className="relative">
                            <select
                                name="etiquetas"
                                className={`w-full h-12 border-2 border-[#254153] rounded-sm px-4 bg-white text-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#749094] ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                defaultValue={initialData?.['Etiquetas'] ?? ''}
                                disabled={isReadOnly}
                            >
                                <option value="" disabled>Buscar elementos</option>
                                <option value="Ergonomía">Ergonomía</option>
                                <option value="Limpieza">Limpieza</option>
                                <option value="Estandarización">Estandarización</option>
                                <option value="Herramientas">Herramientas</option>
                                <option value="Actitudes">Actitudes</option>
                                <option value="Productividad">Productividad</option>
                                <option value="Calidad">Calidad</option>
                            </select>
                            <div className="absolute right-0 top-0 h-full w-12 bg-[#749094] flex items-center justify-center text-white border-l-2 border-[#254153] pointer-events-none">
                                <ChevronDown size={32} strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>

                    {/* Toggles: Security */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-100">
                        <InfoPopup name="Elementos de seguridad" text={helpTexts.seguridad} />
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-gray-500 italic">¿Cumple?</span>
                            <span className="text-sm text-gray-400">No</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="elementos_seguridad"
                                    className="sr-only peer"
                                    checked={elementosSeguridad}
                                    onChange={!isReadOnly ? handleToggleChange(setElementosSeguridad, () => setObsSeguridad('')) : undefined}
                                    disabled={isReadOnly}
                                />
                                <div className="w-14 h-7 bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#749094]"></div>
                            </label>
                            <span className="text-sm text-gray-400">Si</span>
                        </div>
                    </div>

                    {/* Observaciones seguridad Textarea */}
                    <div className="space-y-1">
                        <label className="text-lg font-medium">Observaciones seguridad</label>
                        <textarea
                            name="observaciones_seguridad"
                            value={obsSeguridad}
                            onChange={(e) => setObsSeguridad(e.target.value)}
                            className={`w-full h-32 border-2 border-[#254153] rounded-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#749094] text-lg resize-none ${elementosSeguridad || isReadOnly ? 'bg-gray-100 opacity-50 cursor-not-allowed' : ''}`}
                            disabled={elementosSeguridad || isReadOnly}
                            required={!elementosSeguridad && !isReadOnly}
                        />
                    </div>

                    {/* Toggles: Ergonomics */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-100">
                        <InfoPopup name="Puesto con ergonomía" text={helpTexts.ergonomia} />
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-gray-500 italic">¿Cumple?</span>
                            <span className="text-sm text-gray-400">No</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="puesto_ergonomia"
                                    className="sr-only peer"
                                    checked={puestoErgonomia}
                                    onChange={!isReadOnly ? handleToggleChange(setPuestoErgonomia, () => setObsErgonomia('')) : undefined}
                                    disabled={isReadOnly}
                                />
                                <div className="w-14 h-7 bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#749094]"></div>
                            </label>
                            <span className="text-sm text-gray-400">Si</span>
                        </div>
                    </div>

                    {/* Observaciones de ergonomía Textarea */}
                    <div className="space-y-1">
                        <label className="text-lg font-medium">Observaciones de ergonomía</label>
                        <textarea
                            name="observaciones_ergonomia"
                            value={obsErgonomia}
                            onChange={(e) => setObsErgonomia(e.target.value)}
                            className={`w-full h-32 border-2 border-[#254153] rounded-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#749094] text-lg resize-none ${puestoErgonomia || isReadOnly ? 'bg-gray-100 opacity-50 cursor-not-allowed' : ''}`}
                            disabled={puestoErgonomia || isReadOnly}
                            required={!puestoErgonomia && !isReadOnly}
                        />
                    </div>

                    {/* Toggles and Observations: Cleanliness, HDT, 5S and Plan Control */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-100">
                        <InfoPopup name="Puesto ordenado y aseado" text={helpTexts.ordenAseo} />
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-gray-500 italic">¿Cumple?</span>
                            <span className="text-sm text-gray-400">No</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="puesto_ordenado"
                                    className="sr-only peer"
                                    checked={puestoOrdenado}
                                    onChange={!isReadOnly ? handleToggleChange(setPuestoOrdenado, () => setObsOrdenAseo('')) : undefined}
                                    disabled={isReadOnly}
                                />
                                <div className="w-14 h-7 bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#749094]"></div>
                            </label>
                            <span className="text-sm text-gray-400">Si</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-lg font-medium">Observaciones orden y aseo</label>
                        <textarea
                            name="observaciones_orden_aseo"
                            value={obsOrdenAseo}
                            onChange={(e) => setObsOrdenAseo(e.target.value)}
                            className={`w-full h-32 border-2 border-[#254153] rounded-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#749094] text-lg resize-none ${puestoOrdenado || isReadOnly ? 'bg-gray-100 opacity-50 cursor-not-allowed' : ''}`}
                            disabled={puestoOrdenado || isReadOnly}
                            required={!puestoOrdenado && !isReadOnly}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-100">
                        <InfoPopup name="Cumple HDT" text={helpTexts.hdt} />
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-gray-500 italic">¿Cumple?</span>
                            <span className="text-sm text-gray-400">No</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="cumple_hdt"
                                    className="sr-only peer"
                                    checked={cumpleHdt}
                                    onChange={!isReadOnly ? handleToggleChange(setCumpleHdt, () => setObsHdt('')) : undefined}
                                    disabled={isReadOnly}
                                />
                                <div className="w-14 h-7 bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#749094]"></div>
                            </label>
                            <span className="text-sm text-gray-400">Si</span>
                        </div>
                    </div>
                    {/* Puesto Reminder */}
                    <div className="px-4 py-2 bg-gray-50 border-2 border-dashed border-[#749094] rounded-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 relative">
                        <p className="text-[#254153] font-medium">
                            <span className="text-gray-500 italic text-sm">Puesto seleccionado:</span> {puestoValue || 'Ninguno'}
                        </p>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => togglePopup('VER_HDT')}
                                className="text-[#749094] underline text-sm font-semibold hover:opacity-70 transition-opacity"
                            >
                                Ver HDT
                            </button>
                            {activePopup === 'VER_HDT' && (
                                <div className="absolute right-0 top-full mt-2 w-72 p-4 bg-white border-2 border-gray-100 rounded-sm shadow-xl z-20 text-sm text-primary italic">
                                    {helpTexts.hdtContent.split('\n\n').map((p, i) => (
                                        <React.Fragment key={i}>
                                            {i > 0 && <div className="my-2 border-t border-gray-100" />}
                                            <p>{p}</p>
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-lg font-medium">Observaciones HDT</label>
                        <textarea
                            name="observaciones_hdt"
                            value={obsHdt}
                            onChange={(e) => setObsHdt(e.target.value)}
                            className={`w-full h-32 border-2 border-[#254153] rounded-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#749094] text-lg resize-none ${cumpleHdt || isReadOnly ? 'bg-gray-100 opacity-50 cursor-not-allowed' : ''}`}
                            disabled={cumpleHdt || isReadOnly}
                            required={!cumpleHdt && !isReadOnly}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-100">
                        <InfoPopup name="Cumple 5S" text={helpTexts.s5} />
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-gray-500 italic">¿Cumple?</span>
                            <span className="text-sm text-gray-400">No</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="cumple_5s"
                                    className="sr-only peer"
                                    checked={cumple5s}
                                    onChange={!isReadOnly ? handleToggleChange(setCumple5s, () => setObs5s('')) : undefined}
                                    disabled={isReadOnly}
                                />
                                <div className="w-14 h-7 bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#749094]"></div>
                            </label>
                            <span className="text-sm text-gray-400">Si</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-lg font-medium">Observaciones 5S</label>
                        <textarea
                            name="observaciones_5s"
                            value={obs5s}
                            onChange={(e) => setObs5s(e.target.value)}
                            className={`w-full h-32 border-2 border-[#254153] rounded-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#749094] text-lg resize-none ${cumple5s || isReadOnly ? 'bg-gray-100 opacity-50 cursor-not-allowed' : ''}`}
                            disabled={cumple5s || isReadOnly}
                            required={!cumple5s && !isReadOnly}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-100">
                        <InfoPopup name="Cumple puesta a punto / plan de control" text={helpTexts.planControl} />
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-gray-500 italic">¿Cumple?</span>
                            <span className="text-sm text-gray-400">No</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="cumple_puesta_punto"
                                    className="sr-only peer"
                                    checked={cumplePuestaPunto}
                                    onChange={!isReadOnly ? handleToggleChange(setCumplePuestaPunto, () => setObsPlanControl('')) : undefined}
                                    disabled={isReadOnly}
                                />
                                <div className="w-14 h-7 bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#749094]"></div>
                            </label>
                            <span className="text-sm text-gray-400">Si</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-lg font-medium">Observaciones plan control</label>
                        <textarea
                            name="observaciones_plan_control"
                            value={obsPlanControl}
                            onChange={(e) => setObsPlanControl(e.target.value)}
                            className={`w-full h-32 border-2 border-[#254153] rounded-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#749094] text-lg resize-none ${cumplePuestaPunto || isReadOnly ? 'bg-gray-100 opacity-50 cursor-not-allowed' : ''}`}
                            disabled={cumplePuestaPunto || isReadOnly}
                            required={!cumplePuestaPunto && !isReadOnly}
                        />
                    </div>

                    {/* Toggles and Observations: Tools and Quality Defects */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-100">
                        <InfoPopup name="Herramientas en buen estado" text={helpTexts.herramientas} />
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-gray-500 italic">¿Cumple?</span>
                            <span className="text-sm text-gray-400">No</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="herramientas_estado"
                                    className="sr-only peer"
                                    checked={herramientasEstado}
                                    onChange={!isReadOnly ? handleToggleChange(setHerramientasEstado, () => setObsHerramientas('')) : undefined}
                                    disabled={isReadOnly}
                                />
                                <div className="w-14 h-7 bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#749094]"></div>
                            </label>
                            <span className="text-sm text-gray-400">Si</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-lg font-medium">Observaciones herramientas</label>
                        <textarea
                            name="observaciones_herramientas"
                            value={obsHerramientas}
                            onChange={(e) => setObsHerramientas(e.target.value)}
                            className={`w-full h-32 border-2 border-[#254153] rounded-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#749094] text-lg resize-none ${herramientasEstado || isReadOnly ? 'bg-gray-100 opacity-50 cursor-not-allowed' : ''}`}
                            disabled={herramientasEstado || isReadOnly}
                            required={!herramientasEstado && !isReadOnly}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-100">
                        <InfoPopup name="Operario conoce los defectos de calidad" text={helpTexts.defectos} />
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-gray-500 italic">¿Cumple?</span>
                            <span className="text-sm text-gray-400">No</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="conoce_defectos"
                                    className="sr-only peer"
                                    checked={conoceDefectos}
                                    onChange={!isReadOnly ? handleToggleChange(setConoceDefectos, () => setObsDefectos('')) : undefined}
                                    disabled={isReadOnly}
                                />
                                <div className="w-14 h-7 bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#749094]"></div>
                            </label>
                            <span className="text-sm text-gray-400">Si</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-lg font-medium">Observaciones defectos calidad</label>
                        <textarea
                            name="observaciones_defectos"
                            value={obsDefectos}
                            onChange={(e) => setObsDefectos(e.target.value)}
                            className={`w-full h-32 border-2 border-[#254153] rounded-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#749094] text-lg resize-none ${conoceDefectos || isReadOnly ? 'bg-gray-100 opacity-50 cursor-not-allowed' : ''}`}
                            disabled={conoceDefectos || isReadOnly}
                            required={!conoceDefectos && !isReadOnly}
                        />
                    </div>

                    {/* Toggles and Observations: Indicators and Product Conforming */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-100">
                        <InfoPopup name="Operario conoce sus indicadores de productividad" text={helpTexts.indicadores} />
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-gray-500 italic">¿Cumple?</span>
                            <span className="text-sm text-gray-400">No</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="conoce_indicadores"
                                    className="sr-only peer"
                                    checked={conoceIndicadores}
                                    onChange={!isReadOnly ? handleToggleChange(setConoceIndicadores, () => setObsIndicadores('')) : undefined}
                                    disabled={isReadOnly}
                                />
                                <div className="w-14 h-7 bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#749094]"></div>
                            </label>
                            <span className="text-sm text-gray-400">Si</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-lg font-medium">Observaciones indicadores</label>
                        <textarea
                            name="observaciones_indicadores"
                            value={obsIndicadores}
                            onChange={(e) => setObsIndicadores(e.target.value)}
                            className={`w-full h-32 border-2 border-[#254153] rounded-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#749094] text-lg resize-none ${conoceIndicadores || isReadOnly ? 'bg-gray-100 opacity-50 cursor-not-allowed' : ''}`}
                            disabled={conoceIndicadores || isReadOnly}
                            required={!conoceIndicadores && !isReadOnly}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-100">
                        <InfoPopup name="Producto conforme" text={helpTexts.productoConforme} />
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-gray-500 italic">¿Cumple?</span>
                            <span className="text-sm text-gray-400">No</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="producto_conforme"
                                    className="sr-only peer"
                                    checked={productoConforme}
                                    onChange={!isReadOnly ? handleToggleChange(setProductoConforme, () => setObsProductoConforme('')) : undefined}
                                    disabled={isReadOnly}
                                />
                                <div className="w-14 h-7 bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#749094]"></div>
                            </label>
                            <span className="text-sm text-gray-400">Si</span>
                        </div>
                    </div>
                    <div className="space-y-1 mb-8">
                        <label className="text-lg font-medium">Observaciones producto conforme</label>
                        <textarea
                            name="observaciones_producto_conforme"
                            value={obsProductoConforme}
                            onChange={(e) => setObsProductoConforme(e.target.value)}
                            className={`w-full h-32 border-2 border-[#254153] rounded-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#749094] text-lg resize-none ${productoConforme || isReadOnly ? 'bg-gray-100 opacity-50 cursor-not-allowed' : ''}`}
                            disabled={productoConforme || isReadOnly}
                            required={!productoConforme && !isReadOnly}
                        />
                    </div>

                    {/* Emociones Section */}
                    <div className="space-y-1">
                        <label className="text-lg font-medium">Emociones</label>
                        <textarea
                            name="emociones"
                            value={emociones}
                            onChange={(e) => setEmociones(e.target.value)}
                            placeholder={isReadOnly ? "" : "Comentarios sobre cómo se siente la persona..."}
                            className={`w-full h-32 border-2 border-[#254153] rounded-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#749094] text-lg resize-none ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            readOnly={isReadOnly}
                        />
                    </div>

                    {/* VA/NVA Categorization Panel */}
                    <div className="mt-8 border-2 border-[#254153] rounded-sm p-6 bg-white overflow-hidden">
                        <h2 className="text-xl font-bold text-center mb-6 text-[#254153]">Categorización de Actividades VA/NVA</h2>

                        {/* Panel Icon/Graphic (Stylized SVG) */}
                        <div className="flex justify-center mb-8">
                            <div className="relative w-48 h-48 border-4 border-[#254153] rounded-full flex items-center justify-center bg-gray-50">
                                <svg viewBox="0 0 24 24" width="100" height="100" fill="none" stroke="#254153" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                                    <path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0" />
                                </svg>
                                <div className="absolute top-6 right-6 bg-[#254153] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">VA</div>
                                <div className="absolute bottom-6 right-4 bg-[#254153] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">NVA</div>
                                <div className="absolute top-1/2 left-2 -translate-y-1/2">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#254153" strokeWidth="2">
                                        <path d="M17 2l4 4-4 4" />
                                        <path d="M3 18v-6a6 6 0 0 1 13.53-4.47" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* VA/NVA Buttons */}
                        <div className="flex justify-center gap-12 sm:gap-20 mb-10">
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => !isReadOnly && setNvaCount(prev => prev + 1)}
                                    className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-red-700 text-white font-bold text-xl sm:text-2xl shadow-xl transition-all flex items-center justify-center border-4 border-white ${isReadOnly ? 'cursor-not-allowed opacity-80' : 'active:scale-95 hover:brightness-110'}`}
                                    disabled={isReadOnly}
                                >
                                    NVA
                                </button>
                                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">No Valor Agregado</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => !isReadOnly && setVaCount(prev => prev + 1)}
                                    className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-green-600 text-white font-bold text-xl sm:text-2xl shadow-xl transition-all flex items-center justify-center border-4 border-white ${isReadOnly ? 'cursor-not-allowed opacity-80' : 'active:scale-95 hover:brightness-110'}`}
                                    disabled={isReadOnly}
                                >
                                    VA
                                </button>
                                <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Valor Agregado</span>
                            </div>
                        </div>

                        {/* Percentage Indicator */}
                        <div className="text-center mb-10 p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-2xl font-black text-[#254153]">
                                {((nvaCount + vaCount) > 0
                                    ? ((nvaCount / (nvaCount + vaCount)) * 100).toFixed(1)
                                    : "0.0")}% <span className="text-lg font-bold text-gray-500">de NO valor agregado</span>
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                                <div
                                    className="bg-red-700 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${(nvaCount + vaCount) > 0 ? (nvaCount / (nvaCount + vaCount)) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Counter Inputs */}
                        <div className="flex justify-center gap-8 sm:gap-16 mb-8">
                            <div className="flex flex-col items-center">
                                <label className="text-sm font-bold text-[#749094] mb-1">NVA</label>
                                <input
                                    type="number"
                                    name="nva_count"
                                    value={nvaCount}
                                    onChange={(e) => !isReadOnly && setNvaCount(parseInt(e.target.value) || 0)}
                                    className={`w-24 h-12 border-2 border-[#749094] rounded-sm text-center text-xl font-bold text-[#254153] focus:ring-2 focus:ring-[#749094] outline-none ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    readOnly={isReadOnly}
                                />
                            </div>
                            <div className="flex flex-col items-center">
                                <label className="text-sm font-bold text-[#749094] mb-1">VA</label>
                                <input
                                    type="number"
                                    name="va_count"
                                    value={vaCount}
                                    onChange={(e) => !isReadOnly && setVaCount(parseInt(e.target.value) || 0)}
                                    className={`w-24 h-12 border-2 border-[#749094] rounded-sm text-center text-xl font-bold text-[#254153] focus:ring-2 focus:ring-[#749094] outline-none ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    readOnly={isReadOnly}
                                />
                            </div>
                        </div>

                        {/* Observations VA/NVA */}
                        <div className="space-y-1 mb-12">
                            <label className="text-lg font-medium text-[#254153]">Observaciones VA/NVA</label>
                            <textarea
                                name="observaciones_va_nva"
                                value={obsVaNva}
                                onChange={(e) => setObsVaNva(e.target.value)}
                                className={`w-full h-24 border-2 border-[#254153] rounded-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#749094] text-lg resize-none ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                placeholder={isReadOnly ? "" : "Escribe aquí las observaciones del análisis VA/NVA..."}
                                readOnly={isReadOnly}
                            />
                        </div>
                    </div>

                    {/* Datos Adjuntos Section */}
                    <div className="space-y-3 mt-8">
                        <label className="text-xl font-bold text-[#254153]">Datos adjuntos</label>
                        <div className="border-2 border-[#254153] rounded-sm p-6 bg-white">
                            <div className="mb-6">
                                <div className="text-lg text-[#254153] flex items-center justify-between">
                                    {selectedFile ? (
                                        <>
                                            <span className="flex items-center gap-2 text-green-700 font-semibold">
                                                <Paperclip size={20} /> {selectedFile.name}
                                            </span>
                                            {!isReadOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedFile(null)}
                                                    className="text-red-600 hover:text-red-800 transition-colors"
                                                    title="Eliminar archivo"
                                                >
                                                    <X size={24} />
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        "No hay nada adjunto."
                                    )}
                                </div>
                            </div>

                            {!isReadOnly && (
                                <div className="flex justify-between items-center">
                                    <label className="flex items-center gap-2 text-[#254153] text-lg font-medium cursor-pointer hover:opacity-70 transition-opacity">
                                        <Paperclip size={24} />
                                        <span>Adjuntar un archivo</span>
                                        <input
                                            type="file"
                                            name="archivo"
                                            className="hidden"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        />
                                    </label>

                                    <div className="text-[#254153]">
                                        <label
                                            htmlFor="camera-input"
                                            className="cursor-pointer hover:opacity-70 transition-opacity"
                                            title="Usar Cámara"
                                        >
                                            <Camera size={48} strokeWidth={1.5} />
                                        </label>
                                        <input
                                            id="camera-input"
                                            type="file"
                                            name="archivo"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Large Save Button */}
                    {!isReadOnly && (
                        <div className="flex justify-center mt-12 mb-20">
                            <button
                                type="submit"
                                className="p-4 rounded-xl text-[#254153] border-2 border-[#254153] hover:bg-gray-50 active:scale-95 transition-all shadow-md group"
                                title="Guardar OPT"
                            >
                                <Save size={100} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </form>
        </>
    )
}

