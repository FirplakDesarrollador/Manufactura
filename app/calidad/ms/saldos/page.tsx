'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Trash2, AlertTriangle, PackageX, Plus, X, Search, Calendar as CalendarIcon, Filter } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { v4 as uuidv4 } from 'uuid'

interface ProducloMS {
    id: number
    Referencia: string
}

interface ReporteSaldo {
    id: number
    created_at: string
    create_by: number
    defecto: any
    producto_id: number
    producto?: { Referencia: string }
    usuario?: { nombre: string }
    fotoUrl?: string
}

export default function SaldosYDestruccionesPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [reports, setReports] = useState<ReporteSaldo[]>([])
    const [products, setProducts] = useState<ProducloMS[]>([])
    const [defectOptions, setDefectOptions] = useState<{id: number, defecto: string, saldo_o_destruccion: string}[]>([])
    const [usersMap, setUsersMap] = useState<Record<number, string>>({})
    
    // Modal & Form States
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [saldosProduct, setSaldosProduct] = useState<string>('')
    const [saldosType, setSaldosType] = useState<'Saldo' | 'Destrucción'>('Saldo')
    const [selectedDefect, setSelectedDefect] = useState<string>('')
    const [isUploading, setIsUploading] = useState(false)
    const [selectedReport, setSelectedReport] = useState<ReporteSaldo | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    
    // Auth
    const [user, setUser] = useState<{ id: string, email?: string, localId?: number } | null>(null)

    // Filters
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [searchTerm, setSearchTerm] = useState('')

    const fetchData = useCallback(async () => {
        setLoading(true)
        
        const day = new Date(selectedDate)
        const nextDay = new Date(day)
        nextDay.setDate(day.getDate() + 1)
        const nextDayStr = nextDay.toISOString().split('T')[0]

        const queryStart = `${selectedDate}T00:00:00Z`
        const queryEnd = `${nextDayStr}T12:00:00Z`

        // Fetch reports for date
        const { data: reportsRes } = await supabase
            .from('ms_reporte_defectos')
            .select(`
                *,
                producto:productos_defectos_ms (Referencia)
            `)
            .gte('created_at', queryStart)
            .lte('created_at', queryEnd)
            .order('created_at', { ascending: false })

        if (reportsRes) {
            // Filter to only Saldos y Destrucciones
            const filteredReports = reportsRes.filter(r => {
                const defects = Array.isArray(r.defecto) ? r.defecto : []
                return defects.some(d => {
                    const defectName = typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre)
                    return defectName && (defectName.startsWith('Saldo -') || defectName.startsWith('Destrucción -'))
                })
            })

            // Fetch users for names
            const userIds = [...new Set(filteredReports.map(r => r.create_by))].filter(Boolean)
            if (userIds.length > 0) {
                const { data: usersData } = await supabase
                    .from('usuarios')
                    .select('id, nombre')
                    .in('id', userIds)

                if (usersData) {
                    const newUsersMap: Record<number, string> = {}
                    usersData.forEach(u => {
                        newUsersMap[u.id] = u.nombre
                    })
                    setUsersMap(newUsersMap)
                }
            }
            
            setReports(filteredReports)
        }
        setLoading(false)
    }, [selectedDate])

    useEffect(() => {
        const load = async () => {
            const { data: authData } = await supabase.auth.getUser()
            if (!authData?.user?.email) {
                router.push('/login')
                return
            }

            const { data: localUser } = await supabase
                .from('usuarios')
                .select('id, permisos')
                .eq('uuid', authData.user.id)
                .single()

            setUser({
                id: authData.user.id,
                email: authData.user.email,
                localId: localUser?.id
            })

            const [productsRes, defectsRes] = await Promise.all([
                supabase.from('productos_defectos_ms').select('*').order('Referencia'),
                supabase.from('ms_lista_saldos_destrucciones').select('*').order('defecto')
            ])
            
            if (productsRes.data) setProducts(productsRes.data)
            if (defectsRes.data) setDefectOptions(defectsRes.data)
        }

        load()
    }, [router])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleSaldosSubmit = async () => {
        if (!saldosProduct) {
            alert('Por favor selecciona un producto')
            return
        }
        if (!selectedDefect) {
            alert('Por favor selecciona el defecto causante')
            return
        }

        // Trigger file input
        fileInputRef.current?.click()
    }

    const executeSave = async (file: File) => {
        setIsUploading(true)
        
        // Upload photo
        const fileExt = file.name.split('.').pop()
        const fileName = `${uuidv4()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
            .from('fichas-media')
            .upload(fileName, file)

        if (uploadError) {
            console.error('Error uploading photo:', uploadError)
            alert('Error al subir la foto')
            setIsUploading(false)
            return
        }

        const { data } = supabase.storage.from('fichas-media').getPublicUrl(fileName)
        const photoUrl = data.publicUrl

        const reportData = {
            producto_id: parseInt(saldosProduct),
            create_by: user?.localId,
            defecto: [{ defecto: `${saldosType} - ${selectedDefect}` }],
            fotoUrl: photoUrl,
            created_at: new Date().toISOString()
        }

        const { error } = await supabase.from('ms_reporte_defectos').insert(reportData)
        setIsUploading(false)
        
        if (error) {
            console.error('Error saving saldo/destruccion:', error)
            alert('Error al guardar el registro')
        } else {
            alert('Registro guardado exitosamente')
            setSaldosProduct('')
            setSelectedDefect('')
            setIsModalOpen(false)
            fetchData()
        }
    }

    const displayedReports = reports.filter(r => {
        const searchLower = searchTerm.toLowerCase()
        if (!searchTerm) return true
        
        const productName = (r.producto?.Referencia || '').toLowerCase()
        
        const defects = Array.isArray(r.defecto) ? r.defecto : []
        const defectName = defects.map(d => typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre)).join(' ').toLowerCase()

        return productName.includes(searchLower) || defectName.includes(searchLower)
    })

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="bg-[#254153] text-white p-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => router.push('/calidad/ms')}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-widest uppercase flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-400" />
                            Saldos y Destrucciones
                        </h1>
                        <p className="text-[10px] text-blue-200 uppercase tracking-widest font-bold">
                            Módulo de Calidad
                        </p>
                    </div>
                </div>
                <div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-md transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Agregar Evento
                    </button>
                </div>
            </header>
            
            {/* Filter Bar */}
            <div className="bg-white border-b border-gray-200 p-3 sticky top-[72px] z-40 shadow-sm">
                <div className="max-w-full flex flex-wrap items-center gap-3">
                    {/* Date Picker */}
                    <div className="flex-none w-48 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#254153]">
                            <CalendarIcon className="w-4 h-4" />
                        </div>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-4 py-2 text-xs font-black text-[#254153] focus:border-[#254153] outline-none pl-10"
                        />
                    </div>
                    {/* Search */}
                    <div className="flex-1 min-w-[250px] relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="BUSCAR REFERENCIA O DEFECTO..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-300 rounded text-xs font-black text-[#254153] outline-none focus:border-[#254153] focus:bg-white uppercase placeholder:text-gray-400 transition-colors"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="bg-gray-100 text-[#254153] px-4 py-2 rounded text-xs font-black uppercase tracking-widest border border-gray-300">
                        Total: {displayedReports.length}
                    </div>
                </div>
            </div>
            
            <main className="flex-1 p-4 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="w-8 h-8 border-4 border-gray-300 border-t-[#254153] rounded-full animate-spin" />
                    </div>
                ) : displayedReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-lg border border-dashed border-gray-300 mt-4">
                        <Trash2 className="w-12 h-12 mb-4 opacity-30" />
                        <p className="text-sm font-black uppercase tracking-widest">No hay eventos registrados</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#254153]">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-[10px] font-black text-white uppercase tracking-wider">Fecha / Hora</th>
                                    <th scope="col" className="px-6 py-3 text-left text-[10px] font-black text-white uppercase tracking-wider">Tipo</th>
                                    <th scope="col" className="px-6 py-3 text-left text-[10px] font-black text-white uppercase tracking-wider">Referencia</th>
                                    <th scope="col" className="px-6 py-3 text-left text-[10px] font-black text-white uppercase tracking-wider">Causante</th>
                                    <th scope="col" className="px-6 py-3 text-left text-[10px] font-black text-white uppercase tracking-wider">Registrado Por</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {displayedReports.map((report) => {
                                    const defects = Array.isArray(report.defecto) ? report.defecto : []
                                    const defectName = defects.map(d => typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre)).join(', ')
                                    
                                    const isDestruccion = defectName.includes('Destrucción')
                                    const tipo = isDestruccion ? 'Destrucción' : 'Saldo'
                                    const causante = defectName.split(' - ')[1] || defectName

                                    const dateStr = new Date(report.created_at.endsWith('Z') || report.created_at.includes('+') ? report.created_at : report.created_at + 'Z').toLocaleString('es-CO', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                        timeZone: 'America/Bogota'
                                    })

                                    return (
                                        <tr 
                                            key={report.id} 
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => setSelectedReport(report)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600">
                                                {dateStr}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-[10px] leading-5 font-black uppercase tracking-wider rounded-full ${isDestruccion ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                    {tipo}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-[#254153]">
                                                {report.producto?.Referencia || 'Sin Referencia'}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-gray-700">
                                                {causante}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">
                                                {usersMap[report.create_by] || 'Anónimo'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Modal de Agregar Evento */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl flex flex-col border border-[#254153]">
                        <div className="bg-gradient-to-r from-[#254153] to-[#3a637c] p-6 text-center relative rounded-t-lg">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <Trash2 className="w-10 h-10 text-white/80 mx-auto mb-2" />
                            <h2 className="text-white font-black text-xl tracking-wider uppercase">Registrar Evento</h2>
                            <p className="text-white/60 text-sm font-medium mt-1">Selecciona el producto y el tipo de evento</p>
                        </div>
                        
                        <div className="p-8 flex flex-col gap-6 rounded-b-lg">
                            <div className="relative z-30">
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Referencia de Producto</label>
                                <SearchableSelect
                                    name="saldos_producto"
                                    options={products.map((p) => p.Referencia)}
                                    placeholder="-- BUSCAR REFERENCIA --"
                                    defaultValue={products.find(p => p.id.toString() === saldosProduct)?.Referencia || ''}
                                    onValueChange={(val) => {
                                        const product = products.find(p => p.Referencia === val)
                                        setSaldosProduct(product ? product.id.toString() : '')
                                    }}
                                    className="w-full bg-gray-50 border border-gray-300 rounded px-4 py-3 text-[#254153] font-bold text-sm focus:border-[#254153] focus:bg-white outline-none transition-all shadow-inner"
                                />
                            </div>
                            
                            <div className="relative z-20">
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Tipo de Registro</label>
                                <div className="flex gap-4">
                                    <label className={`flex flex-col items-center justify-center gap-2 cursor-pointer p-4 rounded-lg flex-1 border-2 transition-all ${saldosType === 'Saldo' ? 'border-[#36A284] bg-emerald-50 shadow-sm' : 'border-gray-200 hover:border-[#36A284] hover:bg-gray-50'}`}>
                                        <input 
                                            type="radio" 
                                            name="saldosType" 
                                            value="Saldo" 
                                            checked={saldosType === 'Saldo'} 
                                            onChange={() => {
                                                setSaldosType('Saldo')
                                                setSelectedDefect('')
                                            }} 
                                            className="sr-only"
                                        />
                                        <PackageX className={`w-8 h-8 ${saldosType === 'Saldo' ? 'text-[#36A284]' : 'text-gray-400'}`} />
                                        <span className={`text-sm font-black uppercase tracking-wider ${saldosType === 'Saldo' ? 'text-[#36A284]' : 'text-gray-500'}`}>Saldo</span>
                                    </label>
                                    
                                    <label className={`flex flex-col items-center justify-center gap-2 cursor-pointer p-4 rounded-lg flex-1 border-2 transition-all ${saldosType === 'Destrucción' ? 'border-red-500 bg-red-50 shadow-sm' : 'border-gray-200 hover:border-red-500 hover:bg-gray-50'}`}>
                                        <input 
                                            type="radio" 
                                            name="saldosType" 
                                            value="Destrucción" 
                                            checked={saldosType === 'Destrucción'} 
                                            onChange={() => {
                                                setSaldosType('Destrucción')
                                                setSelectedDefect('')
                                            }} 
                                            className="sr-only"
                                        />
                                        <AlertTriangle className={`w-8 h-8 ${saldosType === 'Destrucción' ? 'text-red-500' : 'text-gray-400'}`} />
                                        <span className={`text-sm font-black uppercase tracking-wider ${saldosType === 'Destrucción' ? 'text-red-500' : 'text-gray-500'}`}>Destrucción</span>
                                    </label>
                                </div>
                            </div>

                            <div className="relative z-10 pb-8">
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Defecto Causante</label>
                                <SearchableSelect
                                    name="saldos_defecto"
                                    options={defectOptions.filter(d => d.saldo_o_destruccion === saldosType).map(d => d.defecto)}
                                    placeholder={`-- SELECCIONAR DEFECTO DE ${saldosType.toUpperCase()} --`}
                                    defaultValue={selectedDefect}
                                    onValueChange={(val) => setSelectedDefect(val)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded px-4 py-3 text-[#254153] font-bold text-sm focus:border-[#254153] focus:bg-white outline-none transition-all shadow-inner"
                                />
                            </div>
                            
                            <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-4">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-3 text-sm font-black text-gray-500 hover:text-gray-800 transition-colors uppercase tracking-widest"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaldosSubmit}
                                    disabled={isUploading || !saldosProduct || !selectedDefect}
                                    className="px-8 py-3 bg-red-500 text-white text-sm font-black rounded shadow-md hover:bg-red-600 hover:shadow-lg transition-all disabled:opacity-50 uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    {isUploading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    <span>{isUploading ? 'Guardando...' : 'Registrar'}</span>
                                </button>
                            </div>
                        </div>
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
                                void executeSave(file)
                            }
                        }}
                    />
                </div>
            )}

            {/* Modal Detalle Evento */}
            {selectedReport && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-[#254153] p-4 flex justify-between items-center text-white">
                            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Search className="w-5 h-5" />
                                Detalle de Evento
                            </h2>
                            <button onClick={() => setSelectedReport(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 bg-gray-50">
                            {selectedReport.fotoUrl ? (
                                <div className="w-full aspect-square bg-gray-200 rounded-lg mb-4 overflow-hidden shadow-inner border border-gray-300">
                                    <img 
                                        src={selectedReport.fotoUrl} 
                                        alt="Evidencia" 
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-40 bg-gray-200 rounded-lg mb-4 flex items-center justify-center border border-dashed border-gray-400">
                                    <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">Sin Foto</span>
                                </div>
                            )}
                            <div className="space-y-3 bg-white p-4 rounded shadow-sm border border-gray-100">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Referencia</p>
                                    <p className="text-sm font-bold text-[#254153]">{selectedReport.producto?.Referencia || 'Sin Referencia'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Defecto / Causante</p>
                                    <p className="text-sm font-bold text-[#254153]">
                                        {Array.isArray(selectedReport.defecto) ? selectedReport.defecto.map(d => typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre)).join(', ') : 'Desconocido'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Fecha y Hora</p>
                                        <p className="text-xs font-bold text-gray-600">
                                            {new Date(selectedReport.created_at.endsWith('Z') || selectedReport.created_at.includes('+') ? selectedReport.created_at : selectedReport.created_at + 'Z').toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Registrado Por</p>
                                        <p className="text-xs font-bold text-gray-600 truncate" title={usersMap[selectedReport.create_by] || 'Anónimo'}>
                                            {usersMap[selectedReport.create_by] || 'Anónimo'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-white">
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="w-full bg-[#254153] hover:bg-black text-white py-3 rounded text-xs font-black uppercase tracking-widest shadow-md transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
