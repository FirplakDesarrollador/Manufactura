'use client'


import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Camera, X, Settings, Archive, Trash2, History, ClipboardList, BarChart2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DefectCard } from '@/components/calidad/DefectCard'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { DefectsSettingsModal } from '@/components/calidad/DefectsSettingsModal'
import { usePermisosCalidadMs } from '@/lib/calidad/usePermisosCalidadMs'
import { HourlyInspectionChart } from '@/components/calidad/HourlyInspectionChart'
import Header from '@/components/opt-sistemica/Header'
import { CalidadMsNavButtons } from '@/components/calidad/CalidadMsNavButtons'
import { BrokenSinkIcon } from '@/components/icons/BrokenSinkIcon'

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
        ifi: 0,
        saldos: 0
    })

    const [selectedProduct, setSelectedProduct] = useState<string>('')
    const [selectedDefects, setSelectedDefects] = useState<Record<number, boolean>>({})

    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [showHourlyChart, setShowHourlyChart] = useState(false)
    // Permisos por botón: sin "Registro" pero con "Hora a hora" se ve solo la gráfica
    const { permisos: permisosMs } = usePermisosCalidadMs()
    const soloHoraAHora = !!permisosMs && !permisosMs.registro
    const configEditable = permisosMs?.configuracion === 'editar'
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
            // Saldos y destrucciones del día (mismo criterio de la pantalla de Saldos)
            const saldos = reportsRes.data.filter(r => /saldo|destrucci/i.test(String(r.defectos_lista || ''))).length
            setStats({ buenos, defectuosos, total, ifi, saldos })
        }

        setLoading(false)
    }, [router])

    useEffect(() => {
        const load = async () => {
            await fetchData()
            if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search)
                if (params.get('chart') === 'true') {
                    setShowHourlyChart(true)
                }
                if (params.get('settings') === 'true') {
                    setIsSettingsOpen(true)
                }
            }
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
        const selectedDefectNames = selectedDefectsList.map(d => ({ 
            id: d.id, 
            defecto: d.defecto || d.Defecto || d.nombre || d.Nombre 
        }))

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
        if (!configEditable) return
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
            {/* Header unificado estilo FIRPLAK con altura compacta h-14 */}
            <Header
                title="Calidad MS"
                subtitle=""
                compact={true}
                userEmail={user?.email}
                showLogout={true}
                onLogout={() => supabase.auth.signOut().then(() => router.push('/login'))}
            />

            {/* Barra de controles (nivel 2): una sola fila desde 1200 px (pantallas a zoom 100 % ≈ 1266 px) */}
            {/* En pantallas angostas la barra se divide en filas para no desbordar la página */}
            <div className="bg-gray-50 border-b border-gray-200 py-1.5 min-[1200px]:py-0 min-[1200px]:h-10 sticky top-[48px] z-40 flex items-center shadow-xs">
                <div className="max-w-[1800px] w-full mx-auto px-3 sm:px-4 flex flex-wrap items-center justify-between min-[1200px]:grid min-[1200px]:grid-cols-[minmax(min-content,1fr)_auto_minmax(max-content,1fr)] min-[1200px]:gap-4 gap-2 relative min-[1200px]:h-full">
                    {/* Left: Product Selector & Save button (oculto si el usuario solo ve Hora a hora) */}
                    {soloHoraAHora ? <div /> : (
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto sm:flex-1 min-w-0 sm:min-w-min min-[1200px]:max-w-[520px] 2xl:max-w-[600px]">
                        <div className="flex-1 min-w-[160px] [contain:inline-size]">
                            <SearchableSelect
                                name="producto"
                                options={products.map((p) => p.Referencia)}
                                placeholder="SELECCIONAR REFERENCIA DE PRODUCTO"
                                defaultValue={products.find(p => p.id.toString() === selectedProduct)?.Referencia || ''}
                                onValueChange={(val) => {
                                    const product = products.find(p => p.Referencia === val)
                                    setSelectedProduct(product ? product.id.toString() : '')
                                }}
                                className="w-full h-7 bg-white border border-gray-300 rounded px-2.5 text-[#254153] font-bold text-[11px] focus:border-[#254153] outline-none transition-all flex items-center"
                            />
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isUploading}
                            className={`h-7 flex items-center space-x-1.5 px-2.5 text-white font-black uppercase tracking-wider text-[10px] transition-all rounded shadow-sm shrink-0 ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#254153] hover:bg-black'}`}
                        >
                            {isUploading ? (
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                                </svg>
                            )}
                            <span>{isUploading ? 'Guardando...' : 'Ejecutar'}</span>
                        </button>
                    </div>
                    )}

                    {/* Center: Nav Buttons - Exactly Centered with Firplak Logo */}
                    <div className="order-3 min-[1200px]:order-none w-full min-[1200px]:w-auto flex justify-center z-20">
                        <CalidadMsNavButtons
                            activeTab="registro"
                            onOpenSettings={() => setIsSettingsOpen(true)}
                            onToggleChart={() => !soloHoraAHora && setShowHourlyChart(prev => !prev)}
                            hasSettingsPermission={hasSettingsPermission}
                            isChartActive={showHourlyChart || soloHoraAHora}
                            isSettingsActive={isSettingsOpen}
                        />
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

                    {/* Right: Quick Metrics */}
                    <div className="order-2 min-[1200px]:order-none flex flex-wrap items-center justify-center sm:justify-end gap-x-2.5 gap-y-1 2xl:gap-x-4 w-full sm:w-auto sm:ml-auto min-[1200px]:ml-0 min-[1200px]:justify-self-end min-w-0">
                        <div className="flex items-center space-x-1">
                            <div className="w-4 h-4 rounded-full bg-[#36A284] flex items-center justify-center text-white">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <span className="text-sm 2xl:text-base font-bold text-[#36A284]">{stats.buenos}</span>
                            <span className="text-[10px] font-medium text-gray-500">Buenos</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <div className="w-4 h-4 rounded-full bg-[#F24E4E] flex items-center justify-center text-white font-bold text-[10px]">
                                !
                            </div>
                            <span className="text-sm 2xl:text-base font-bold text-[#F24E4E]">{stats.defectuosos}</span>
                            <span className="text-[10px] font-medium text-gray-500">Defectuosos</span>
                        </div>
                        <div className="flex items-center space-x-1" title="Saldos y destrucciones del día">
                            <BrokenSinkIcon className="w-4 h-4" />
                            <span className="text-sm 2xl:text-base font-bold text-[#254153]">{stats.saldos}</span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-sm 2xl:text-base font-bold text-[#36A284]">IFI: {stats.ifi.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-sm 2xl:text-base font-bold text-gray-800">Total: {stats.total}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hour-by-Hour Indicator */}
            {(showHourlyChart || soloHoraAHora) && (
                <HourlyInspectionChart reports={todaysReports} />
            )}

            {/* Grid */}
            {!soloHoraAHora && (
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
            )}

            <footer className="py-4 px-4 bg-[#254153] text-[9px] font-bold text-white/30 uppercase tracking-[0.5em] flex justify-between items-center">
                <span>© {new Date().getFullYear()} Firplak Engineering</span>
                <span>Secure Terminal v4.0.2</span>
            </footer>

            <DefectsSettingsModal 
                isOpen={isSettingsOpen && !!permisosMs?.configuracion}
                soloLectura={!configEditable}
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
