'use client'


import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Camera, X, Settings, Archive, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DefectCard } from '@/components/calidad/DefectCard'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { DefectsSettingsModal } from '@/components/calidad/DefectsSettingsModal'
import { HourlyInspectionChart } from '@/components/calidad/HourlyInspectionChart'

export default function CalidadMsReportPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)

    interface User {
        id: string
        email?: string
        localId?: number
    }
    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState<ProducloMS[]>([])
    const [defects, setDefects] = useState<DefectoMS[]>([])
    const [todaysReports, setTodaysReports] = useState<Record<string, string | number | null | undefined>[]>([])

    interface ProducloMS {
        id: number
        Referencia: string
    }

    interface DefectoMS {
        id: number
        defecto?: string
        Defecto?: string
        nombre?: string
        Nombre?: string
        Al_amarilla?: number
        Al_roja?: number
        Al_azul?: number
        Requiere_Foto?: boolean
        Requiere_Referencia_Molde?: boolean
    }
    const [stats, setStats] = useState({
        buenos: 0,
        defectuosos: 0,
        total: 0,
        ifi: 0
    })

    const [selectedProduct, setSelectedProduct] = useState<string>('')
    const [selectedDefects, setSelectedDefects] = useState<Record<number, boolean>>({})

    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [showHourlyChart, setShowHourlyChart] = useState(false)
    const [hasSettingsPermission, setHasSettingsPermission] = useState(false)
    const [hasSaldosPermission, setHasSaldosPermission] = useState(false)
    
    // New states for custom Molde prompt
    const [isMoldeModalOpen, setIsMoldeModalOpen] = useState(false)
    const [moldeInputValue, setMoldeInputValue] = useState('')

    const fetchData = useCallback(async () => {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
            router.push('/login')
            return
        }
        
        const { data: localUser } = await supabase
            .from('usuarios')
            .select('id, permisos')
            .eq('uuid', userData.user.id)
            .single()

        if (!localUser?.permisos?.calidad?.ms) {
            router.push('/home')
            return
        }

        setUser({
            id: userData.user.id,
            email: userData.user.email,
            localId: localUser?.id
        })

        if (localUser?.permisos?.calidad) {
            setHasSettingsPermission(!!localUser.permisos.calidad.configurar_defectos)
            setHasSaldosPermission(!!localUser.permisos.calidad.saldos_y_destrucciones)
        }

        const [productsRes, defectsRes, reportsRes] = await Promise.all([
            supabase.from('productos_defectos_ms').select('*').order('Referencia'),
            supabase.from('ms_defectos').select('*').order('id'),
            supabase.from('query_ms_reporte_defectos_dia').select('*')
        ])

        if (productsRes.data) setProducts(productsRes.data)
        if (defectsRes.data) setDefects(defectsRes.data)
        if (reportsRes.data) {
            setTodaysReports(reportsRes.data)
            
            const isIgnoredDefect = (defectName: string) => {
                const cleanName = defectName.replace(/^\s*\d+\.\s*/, '').trim().toLowerCase()
                return [
                    'saldos/destrucciones',
                    'opaco',
                    'error en pedido referencia',
                    'quebrados logistica'
                ].includes(cleanName)
            }
            
            const total = reportsRes.data.length
            const defectuosos = reportsRes.data.filter(r => {
                if (!r.defectos_lista || r.defectos_lista === '') return false
                const defects = String(r.defectos_lista).split(',').map(s => s.trim())
                return defects.some(d => !isIgnoredDefect(d))
            }).length
            const buenos = total - defectuosos
            const ifi = total > 0 ? (buenos / total) * 100 : 0
            setStats({ buenos, defectuosos, total, ifi })
        }

        setLoading(false)
    }, [router])

    useEffect(() => {
        const load = async () => {
            await fetchData()
        }
        void load()
    }, [fetchData])

    const getDefectCount = (defectName: string) => {
        if (!todaysReports || !defectName) return 0
        let count = 0
        todaysReports.forEach(report => {
            const defectos = String(report.defectos_lista || '')
            if (defectos.toLowerCase().includes(defectName.toLowerCase())) {
                count++
            }
        })
        return count
    }

    const handleToggleDefect = (id: number) => {
        setSelectedDefects(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    const executeSave = async (fileToUpload: File | null = photoFile, moldeRef?: string) => {
        if (!selectedProduct) return
        
        const selectedDefectsList = defects.filter(d => selectedDefects[d.id])
        const selectedDefectNames = selectedDefectsList.map(d => ({ defecto: d.defecto || d.Defecto || d.nombre || d.Nombre }))

        setIsUploading(true)
        let fotoUrl = null

        if (fileToUpload) {
            const fileName = `ms-defectos/${Date.now()}-${fileToUpload.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`
            const { error: uploadError } = await supabase.storage
                .from('fichas-media')
                .upload(fileName, fileToUpload)

            if (uploadError) {
                console.error('Error uploading photo:', uploadError)
                alert('Error al subir la foto')
                setIsUploading(false)
                return
            }

            const { data } = supabase.storage.from('fichas-media').getPublicUrl(fileName)
            fotoUrl = data.publicUrl
        }

        const reportData = {
            producto_id: parseInt(selectedProduct),
            create_by: user?.localId,
            defecto: selectedDefectNames,
            created_at: new Date().toISOString(),
            ...(fotoUrl ? { fotoUrl } : {}),
            ...(moldeRef ? { Molde: moldeRef } : {})
        }

        const { error } = await supabase.from('ms_reporte_defectos').insert(reportData)
        
        setIsUploading(false)
        
        if (error) {
            console.error('Error saving report:', error)
            alert('Error al guardar el reporte')
        } else {
            setLoading(true)
            await fetchData()
            setSelectedDefects({})
            setSelectedProduct('')
            setPhotoFile(null)
        }
    }

    const handleSave = async () => {
        if (!selectedProduct) {
            alert('Por favor selecciona un producto')
            return
        }

        const selectedDefectsList = defects.filter(d => selectedDefects[d.id])
        
        const requiresMolde = selectedDefectsList.some(d => d.Requiere_Referencia_Molde)
        if (requiresMolde) {
            setMoldeInputValue('')
            setIsMoldeModalOpen(true)
            return
        }

        await continueSave(undefined)
    }

    const continueSave = async (moldeRef?: string) => {
        const selectedDefectsList = defects.filter(d => selectedDefects[d.id])
        const requiresPhoto = selectedDefectsList.some(d => d.Requiere_Foto)
        
        if (requiresPhoto && !photoFile) {
            // Trigger photo capture automatically instead of alerting
            moldeRefForUpload.current = moldeRef
            fileInputRef.current?.click()
            return
        }

        await executeSave(photoFile, moldeRef)
    }

    const handleMoldeSubmit = () => {
        if (moldeInputValue.trim() === '') {
            alert('La referencia del molde es obligatoria para estos defectos.')
            return
        }
        setIsMoldeModalOpen(false)
        void continueSave(moldeInputValue.trim())
    }

    const moldeRefForUpload = useRef<string | undefined>(undefined)

    const handleSaveSettings = async (updatedDefects: DefectoMS[]) => {
        try {
            // Update each defect in supabase.
            // Ideally this would be a bulk upsert.
            const updates = updatedDefects.map(d => ({
                id: d.id,
                Al_amarilla: d.Al_amarilla,
                Al_azul: d.Al_azul,
                Al_roja: d.Al_roja,
                Requiere_Foto: d.Requiere_Foto,
                Requiere_Referencia_Molde: d.Requiere_Referencia_Molde,
            }))
            
            const { error } = await supabase.from('ms_defectos').upsert(updates)
            
            if (error) {
                console.error('Error updating defects settings:', error)
                alert('Error al guardar la configuración')
            } else {
                alert('Configuración guardada exitosamente')
                await fetchData()
            }
        } catch (err) {
            console.error(err)
            alert('Error inesperado al guardar')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#254153] flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                    <div className="text-white text-xs font-black tracking-[0.5em] uppercase animate-pulse">Initializing System</div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            {/* Professional Header - Full Width */}
            <header className="bg-[#254153] text-white sticky top-0 z-50 px-4">
                <div className="mx-auto h-14 flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => router.push('/calidad')}
                            className="p-1.5 hover:bg-white/10 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div className="flex items-center space-x-3">
                            <span className="text-xl font-black tracking-tighter italic">FIRPLAK</span>
                            <div className="h-4 w-px bg-white/20" />
                            <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-60">MS Quality Control</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden md:block text-right">
                            <span className="text-[10px] font-black opacity-40 uppercase tracking-widest block leading-none">Terminal Activa</span>
                            <span className="text-xs font-bold text-blue-400">{user?.email}</span>
                        </div>
                        <button
                            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                            className="p-1.5 hover:bg-red-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Control Bar - Full Width */}
            <div className="bg-gray-50 border-b border-gray-200 sticky top-[56px] z-40">
                <div className="max-w-full px-4 py-3 flex flex-wrap items-center gap-6">
                    <div className="flex-1 min-w-[300px]">
                        <SearchableSelect
                            name="producto"
                            options={products.map((p) => p.Referencia)}
                            placeholder="-- SELECCIONAR REFERENCIA DE PRODUCTO --"
                            defaultValue={products.find(p => p.id.toString() === selectedProduct)?.Referencia || ''}
                            onValueChange={(val) => {
                                const product = products.find(p => p.Referencia === val)
                                setSelectedProduct(product ? product.id.toString() : '')
                            }}
                            className="w-full bg-white border border-gray-300 rounded px-4 py-2.5 text-[#254153] font-black text-base focus:border-[#254153] outline-none transition-all"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleSave}
                            disabled={isUploading}
                            className={`flex items-center space-x-2 px-6 py-2.5 text-white font-black uppercase tracking-widest text-xs transition-all ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#254153] hover:bg-black'}`}
                        >
                            {isUploading ? (
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                                </svg>
                            )}
                            <span>{isUploading ? 'Guardando...' : 'Ejecutar Registro'}</span>
                        </button>
                        <button
                            onClick={() => router.push('/calidad/ms/list')}
                            className="p-2.5 bg-white border border-gray-300 text-[#254153] hover:bg-gray-50"
                            title="Ver Reportes del Día"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </button>
                        {hasSettingsPermission && (
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className={`p-2.5 bg-white border border-gray-300 text-[#254153] hover:bg-gray-50 border-l-0`}
                                title="Configurar Defectos"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={() => setShowHourlyChart(prev => !prev)}
                            className={`p-2.5 bg-white border border-gray-300 hover:bg-blue-50 border-l-0 transition-colors ${showHourlyChart ? 'text-blue-600' : 'text-gray-400'}`}
                            title="Indicador Hora a Hora"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </button>
                        <button
                            onClick={() => router.push('/calidad/ms/saldos')}
                            className="p-2.5 bg-white border border-gray-300 text-red-500 hover:bg-red-50 rounded-r border-l-0"
                            title="Saldos y Destrucciones"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Hidden Photo Upload Input */}
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0]
                                setPhotoFile(file)
                                // Execute save automatically after picking a photo
                                void executeSave(file, moldeRefForUpload.current)
                                moldeRefForUpload.current = undefined
                            }
                        }}
                    />

                    <div className="h-10 w-px bg-gray-200 hidden lg:block" />

                    {/* Quick Metrics */}
                    <div className="flex items-center space-x-8 overflow-x-auto no-scrollbar ml-auto">
                        <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-[#36A284] flex items-center justify-center text-white">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <span className="text-xl font-bold text-[#36A284]">{stats.buenos}</span>
                            <span className="text-sm font-medium text-gray-500">Buenos</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-[#F24E4E] flex items-center justify-center text-white font-bold text-sm">
                                !
                            </div>
                            <span className="text-xl font-bold text-[#F24E4E]">{stats.defectuosos}</span>
                            <span className="text-sm font-medium text-gray-500">Defectuosos</span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-lg font-bold text-[#36A284]">IFI: {stats.ifi.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-lg font-bold text-gray-800">Total: {stats.total}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hour-by-Hour Indicator */}
            {showHourlyChart && (
                <HourlyInspectionChart reports={todaysReports} />
            )}

            {/* Grid */}
            <main className="flex-1 w-full bg-white p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
                    {defects.map((defect, index) => {
                        const defectName = defect.defecto || defect.Defecto || defect.nombre || defect.Nombre || 'Defecto'
                        const count = getDefectCount(defectName)
                        let alarmColor: 'none' | 'yellow' | 'blue' | 'red' = 'none'
                        if (defect.Al_roja && count >= defect.Al_roja) {
                            alarmColor = 'red'
                        } else if (defect.Al_azul && count >= defect.Al_azul) {
                            alarmColor = 'blue'
                        } else if (defect.Al_amarilla && count >= defect.Al_amarilla) {
                            alarmColor = 'yellow'
                        }

                        return (
                            <DefectCard
                                key={defect.id}
                                index={defect.id || index + 1}
                                title={defectName}
                                count={count}
                                isSelected={!!selectedDefects[defect.id]}
                                onToggle={() => handleToggleDefect(defect.id)}
                                alarmColor={alarmColor}
                            />
                        )
                    })}
                </div>
            </main>

            <footer className="py-4 px-4 bg-[#254153] text-[9px] font-bold text-white/30 uppercase tracking-[0.5em] flex justify-between items-center">
                <span>© {new Date().getFullYear()} Firplak Engineering</span>
                <span>Secure Terminal v4.0.2</span>
            </footer>

            <DefectsSettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                defects={defects}
                onSave={handleSaveSettings}
            />

            {/* Custom Modal for Molde Reference */}
            {isMoldeModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
                        <div className="bg-[#254153] px-4 py-3 flex items-center justify-between">
                            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Referencia de Molde</h3>
                            <button onClick={() => setIsMoldeModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-4">
                                Este defecto requiere que ingreses la Referencia del Molde:
                            </p>
                            <input
                                type="text"
                                autoFocus
                                value={moldeInputValue}
                                onChange={(e) => setMoldeInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleMoldeSubmit()
                                }}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#254153] focus:ring-1 focus:ring-[#254153] transition-all"
                                placeholder="Escribe la referencia..."
                            />
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setIsMoldeModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleMoldeSubmit}
                                    className="px-4 py-2 bg-[#36A284] text-white text-sm font-bold rounded hover:bg-[#2b856b] transition-colors"
                                >
                                    Aceptar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
