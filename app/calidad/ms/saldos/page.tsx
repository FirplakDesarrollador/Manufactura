'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Trash2, AlertTriangle, PackageX, Plus, X, Search, Filter, Pencil, Settings } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { SaldosDefectsSettingsModal, DefectoSaldoDestruccion } from '@/components/calidad/SaldosDefectsSettingsModal'
import { BrokenSinkIcon } from '@/components/icons/BrokenSinkIcon'
import Header from '@/components/opt-sistemica/Header'
import { CalidadMsNavButtons } from '@/components/calidad/CalidadMsNavButtons'
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
    Molde?: string
    molde?: string
}

export default function SaldosYDestruccionesPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [reports, setReports] = useState<ReporteSaldo[]>([])
    const [products, setProducts] = useState<ProducloMS[]>([])
    const [defectOptions, setDefectOptions] = useState<DefectoSaldoDestruccion[]>([])
    const [usersMap, setUsersMap] = useState<Record<number, string>>({})
    
    // Modal & Form States
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isMoldeModalOpen, setIsMoldeModalOpen] = useState(false)
    const [moldeInputValue, setMoldeInputValue] = useState('')
    const moldeRefForUpload = useRef<string | undefined>(undefined)

    const [saldosProduct, setSaldosProduct] = useState<string>('')
    const [saldosType, setSaldosType] = useState<'Saldo' | 'Destrucción'>('Saldo')
    const [selectedDefect, setSelectedDefect] = useState<string>('')
    const [isUploading, setIsUploading] = useState(false)
    const [selectedReport, setSelectedReport] = useState<ReporteSaldo | null>(null)
    const [hasEditPermission, setHasEditPermission] = useState(false)
    const [hasDeletePermission, setHasDeletePermission] = useState(false)
    const [hasSettingsPermission, setHasSettingsPermission] = useState(false)
    const [editingReportId, setEditingReportId] = useState<number | null>(null)
    const [deleteConfirmReport, setDeleteConfirmReport] = useState<ReporteSaldo | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    
    // Auth
    const [user, setUser] = useState<{ id: string, email?: string, localId?: number } | null>(null)

    // Filters - Default to Colombia local date (America/Bogota, UTC-5)
    const getColombiaToday = () => {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
    }

    // Rango de fechas (por defecto, hoy)
    const [startDate, setStartDate] = useState(getColombiaToday())
    const [endDate, setEndDate] = useState(getColombiaToday())
    const [searchTerm, setSearchTerm] = useState('')

    const fetchData = useCallback(async () => {
        setLoading(true)
        
        // Exact 24-hour range for Colombia date in UTC
        const desde = startDate || endDate || getColombiaToday()
        const hasta = endDate || startDate || getColombiaToday()
        const startIso = new Date(`${desde <= hasta ? desde : hasta}T00:00:00-05:00`).toISOString()
        const endIso = new Date(`${desde <= hasta ? hasta : desde}T23:59:59.999-05:00`).toISOString()

        // Fetch reports for date
        const { data: reportsRes, error: fetchErr } = await supabase
            .from('ms_reporte_defectos')
            .select(`
                *,
                producto:productos_defectos_ms (Referencia)
            `)
            .gte('created_at', startIso)
            .lte('created_at', endIso)
            .order('created_at', { ascending: false })

        if (fetchErr) {
            console.error('Error fetching saldos/destrucciones:', fetchErr)
        }

        if (reportsRes) {
            // Filter to only Saldos y Destrucciones (case-insensitive, includes any mention of saldo or destrucci)
            const filteredReports = reportsRes.filter(r => {
                const defects = Array.isArray(r.defecto) ? r.defecto : (typeof r.defecto === 'string' ? [r.defecto] : [])
                return defects.some((d: any) => {
                    const defectName = typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre || '')
                    const nameLower = defectName.toLowerCase()
                    return nameLower.includes('saldo') || nameLower.includes('destrucci')
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
    }, [startDate, endDate])

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

            if (localUser?.permisos?.calidad) {
                setHasEditPermission(!!localUser.permisos.calidad.editar)
                setHasDeletePermission(!!localUser.permisos.calidad.eliminar)
                setHasSettingsPermission(!!localUser.permisos.calidad.configurar_defectos || !!localUser.permisos.calidad.editar)
            } else {
                setHasSettingsPermission(true)
            }

            const [productsRes, defectsRes] = await Promise.all([
                supabase.from('productos_defectos_ms').select('*').order('Referencia'),
                supabase.from('ms_lista_saldos_destrucciones').select('*').order('defecto')
            ])
            
            if (productsRes.data) setProducts(productsRes.data)
            if (defectsRes.data) {
                let localConfig: { molde?: number[], noFoto?: number[] } = {}
                try {
                    const storedCompact = localStorage.getItem('saldos_defectos_config_compact')
                    if (storedCompact) {
                        localConfig = JSON.parse(storedCompact)
                    } else {
                        const legacy = localStorage.getItem('saldos_defectos_config')
                        if (legacy) {
                            const parsed = JSON.parse(legacy)
                            localConfig = {
                                molde: Object.keys(parsed).filter(k => parsed[k]?.Requiere_Referencia_Molde).map(Number),
                                noFoto: Object.keys(parsed).filter(k => parsed[k]?.Requiere_Foto === false).map(Number)
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Error reading saldos defect configuration from localStorage:', e)
                }

                const mergedDefects: DefectoSaldoDestruccion[] = defectsRes.data.map(d => {
                    const dbHasFoto = d.Requiere_Foto !== undefined && d.Requiere_Foto !== null
                    const dbHasMolde = d.Requiere_Referencia_Molde !== undefined && d.Requiere_Referencia_Molde !== null

                    const reqFoto = dbHasFoto 
                        ? !!d.Requiere_Foto 
                        : (localConfig.noFoto ? !localConfig.noFoto.includes(d.id) : true)

                    const reqMolde = dbHasMolde 
                        ? !!d.Requiere_Referencia_Molde 
                        : (localConfig.molde ? localConfig.molde.includes(d.id) : false)

                    return {
                        ...d,
                        Requiere_Foto: reqFoto,
                        Requiere_Referencia_Molde: reqMolde
                    }
                })

                setDefectOptions(mergedDefects)
            }
        }

        load()
    }, [router])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleSaveSettings = async (updatedDefects: DefectoSaldoDestruccion[]) => {
        try {
            // Attempt to update Supabase table
            try {
                const updatePromises = updatedDefects.map(d => 
                    supabase
                        .from('ms_lista_saldos_destrucciones')
                        .update({
                            Requiere_Foto: !!d.Requiere_Foto,
                            Requiere_Referencia_Molde: !!d.Requiere_Referencia_Molde
                        })
                        .eq('id', d.id)
                )
                const results = await Promise.all(updatePromises)
                const errors = results.filter(r => r.error)
                if (errors.length > 0) {
                    console.warn('Supabase update returned notes (columns may not exist yet in DB table):', errors)
                }
            } catch (dbErr) {
                console.warn('Could not update Supabase directly:', dbErr)
            }

            // Save ultra-compact configuration to localStorage (only non-defaults, taking ~50 bytes)
            try {
                localStorage.removeItem('saldos_defectos_config')
                const compactConfig = {
                    molde: updatedDefects.filter(d => d.Requiere_Referencia_Molde).map(d => d.id),
                    noFoto: updatedDefects.filter(d => d.Requiere_Foto === false).map(d => d.id)
                }
                localStorage.setItem('saldos_defectos_config_compact', JSON.stringify(compactConfig))
            } catch (storageErr) {
                console.warn('LocalStorage unavailable or quota reached, state kept in memory:', storageErr)
            }

            setDefectOptions(updatedDefects)
            alert('Configuración guardada exitosamente')
            setIsSettingsOpen(false)
        } catch (err) {
            console.error('Error saving settings:', err)
            alert('Error al guardar la configuración')
        }
    }

    const currentSelectedDefectObj = defectOptions.find(d => 
        d.defecto === selectedDefect && d.saldo_o_destruccion === saldosType
    ) || defectOptions.find(d => d.defecto === selectedDefect)

    const handleSaldosSubmit = async () => {
        if (!saldosProduct) {
            alert('Por favor selecciona un producto')
            return
        }
        if (!selectedDefect) {
            alert('Por favor selecciona el defecto causante')
            return
        }

        const requiresMolde = !!currentSelectedDefectObj?.Requiere_Referencia_Molde
        if (requiresMolde && !moldeInputValue.trim()) {
            setIsMoldeModalOpen(true)
            return
        }

        await continueSave(moldeInputValue.trim() || undefined)
    }

    const continueSave = async (moldeRef?: string) => {
        if (editingReportId) {
            setIsUploading(true)
            const reportData = {
                producto_id: parseInt(saldosProduct),
                defecto: [{ 
                    ...(currentSelectedDefectObj?.id ? { id: currentSelectedDefectObj.id } : {}), 
                    defecto: `${saldosType} - ${selectedDefect}` 
                }],
                ...(moldeRef ? { Molde: moldeRef } : { Molde: null })
            }
            const { error } = await supabase.from('ms_reporte_defectos').update(reportData).eq('id', editingReportId)
            setIsUploading(false)
            if (error) {
                console.error('Error updating:', error)
                alert('Error al actualizar el registro')
            } else {
                alert('Registro actualizado exitosamente')
                setSaldosProduct('')
                setSelectedDefect('')
                setMoldeInputValue('')
                setIsModalOpen(false)
                setEditingReportId(null)
                fetchData()
            }
            return
        }

        const requiresPhoto = currentSelectedDefectObj?.Requiere_Foto ?? true
        if (requiresPhoto) {
            moldeRefForUpload.current = moldeRef
            fileInputRef.current?.click()
            return
        }

        await executeSave(null, moldeRef)
    }

    const handleMoldeSubmit = () => {
        if (moldeInputValue.trim() === '') {
            alert('La referencia del molde es obligatoria para este defecto.')
            return
        }
        setIsMoldeModalOpen(false)
        void continueSave(moldeInputValue.trim())
    }

    const executeSave = async (file: File | null, moldeRef?: string) => {
        setIsUploading(true)
        let photoUrl: string | null = null
        
        if (file) {
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
            photoUrl = data.publicUrl
        }

        const finalMolde = moldeRef || moldeInputValue.trim() || undefined

        const reportData = {
            producto_id: parseInt(saldosProduct),
            create_by: user?.localId,
            defecto: [{ 
                ...(currentSelectedDefectObj?.id ? { id: currentSelectedDefectObj.id } : {}), 
                defecto: `${saldosType} - ${selectedDefect}` 
            }],
            ...(photoUrl ? { fotoUrl: photoUrl } : {}),
            ...(finalMolde ? { Molde: finalMolde } : {}),
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
            setMoldeInputValue('')
            setIsModalOpen(false)
            fetchData()
        }
    }

    const handleEditReport = (report: ReporteSaldo, e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingReportId(report.id)
        setSaldosProduct(report.producto_id.toString())
        const defects = Array.isArray(report.defecto) ? report.defecto : []
        const defectName = defects.map(d => typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre)).join(' ')
        const isDest = defectName.includes('Destrucción')
        setSaldosType(isDest ? 'Destrucción' : 'Saldo')
        const causante = defectName.split(' - ')[1] || defectName
        setSelectedDefect(causante)
        setMoldeInputValue(report.Molde || report.molde || '')
        setIsModalOpen(true)
    }

    const handleDeleteReport = (report: ReporteSaldo, e: React.MouseEvent) => {
        e.stopPropagation()
        setDeleteConfirmReport(report)
    }

    const confirmDeleteReport = async () => {
        if (!deleteConfirmReport) return
        setIsDeleting(true)
        try {
            const { error } = await supabase.from('ms_reporte_defectos').delete().eq('id', deleteConfirmReport.id)
            if (error) {
                console.error('Error deleting report:', error)
                alert('Error al eliminar el registro')
            } else {
                setDeleteConfirmReport(null)
                fetchData()
            }
        } catch (err) {
            console.error('Error in confirmDeleteReport:', err)
            alert('Error inesperado al eliminar')
        } finally {
            setIsDeleting(false)
        }
    }

    const displayedReports = reports.filter(r => {
        const searchLower = searchTerm.toLowerCase()
        if (!searchTerm) return true
        
        const productName = (r.producto?.Referencia || '').toLowerCase()
        
        const defects = Array.isArray(r.defecto) ? r.defecto : []
        const defectName = defects.map(d => typeof d === 'string' ? d : (d.defecto || d.Defecto || d.nombre || d.Nombre)).join(' ').toLowerCase()
        const molde = (r.Molde || r.molde || '').toLowerCase()

        return productName.includes(searchLower) || defectName.includes(searchLower) || molde.includes(searchLower)
    })

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header unificado estilo FIRPLAK con altura compacta h-14 */}
            <Header
                title="Calidad MS"
                subtitle=""
                compact={true}
                userEmail={user?.email}
                showLogout={true}
                onLogout={() => supabase.auth.signOut().then(() => router.push('/login'))}
            />
            
            {/* Filter Bar - Same height (h-14 / 56px) as main blue header */}
            <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2 xl:py-0 xl:h-14 sticky top-[56px] z-40 shadow-xs flex items-center">
                <div className="max-w-[1800px] w-full mx-auto flex flex-wrap items-center justify-between xl:grid xl:grid-cols-[minmax(min-content,1fr)_auto_minmax(max-content,1fr)] xl:gap-4 relative xl:h-full gap-2">
                    {/* Left: buscador (mismo ancho que el selector de referencia del registro) */}
                    <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 min-w-0 sm:min-w-[260px] xl:max-w-[520px]">
                        <div className="relative flex-1 min-w-[180px] [contain:inline-size]">
                            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="BUSCAR REFERENCIA, DEFECTO..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 pl-8 pr-3 bg-gray-50 border border-gray-300 rounded text-xs font-bold text-[#254153] focus:outline-none focus:border-[#254153] uppercase placeholder-gray-400"
                            />
                        </div>
                    </div>

                    {/* Center: Nav Buttons - Exactly Centered with Firplak Logo */}
                    <div className="order-3 xl:order-none w-full xl:w-auto flex justify-center z-20">
                        <CalidadMsNavButtons
                            activeTab="saldos"
                            onOpenSettings={() => setIsSettingsOpen(true)}
                            hasSettingsPermission={hasSettingsPermission}
                            isSettingsActive={isSettingsOpen}
                        />
                    </div>

                    {/* Right: rango de fechas (como en Histórico), Total y Agregar Evento */}
                    <div className="order-2 xl:order-none flex flex-wrap items-center justify-center sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto sm:ml-auto xl:ml-0 xl:justify-self-end min-w-0">
                        <div className="flex items-center gap-1">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-[116px] px-1.5 py-1 bg-gray-50 border border-gray-300 rounded text-[11px] font-bold text-[#254153] h-10"
                                title="Fecha inicio"
                            />
                            <span className="text-gray-400 text-xs">a</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-[116px] px-1.5 py-1 bg-gray-50 border border-gray-300 rounded text-[11px] font-bold text-[#254153] h-10"
                                title="Fecha fin"
                            />
                        </div>
                        <div className="h-10 bg-[#254153] text-white px-3.5 rounded flex items-center gap-1.5 text-xs font-black">
                            <span className="text-[10px] font-bold text-gray-300 uppercase">Total:</span>
                            <span>{displayedReports.length}</span>
                        </div>

                        <button
                            onClick={() => {
                                setEditingReportId(null)
                                setSaldosProduct('')
                                setSelectedDefect('')
                                setMoldeInputValue('')
                                setIsModalOpen(true)
                            }}
                            className="h-10 bg-red-600 hover:bg-red-700 text-white px-4 rounded font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Agregar Evento</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Table */}
            <main className="flex-1 p-4 max-w-full overflow-hidden flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 border-2 border-[#254153] border-t-transparent rounded-full animate-spin mb-2" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cargando registros...</span>
                        </div>
                    </div>
                ) : displayedReports.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-dashed border-gray-300">
                        <PackageX className="w-12 h-12 text-gray-400 mb-2" />
                        <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Sin Registros</h3>
                        <p className="text-xs text-gray-500 mt-1 max-w-sm">No se encontraron eventos de saldos o destrucciones para la fecha y filtros seleccionados.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto flex-1">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#254153]">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-[10px] font-black text-white uppercase tracking-wider">Fecha / Hora</th>
                                    <th scope="col" className="px-6 py-3 text-left text-[10px] font-black text-white uppercase tracking-wider">Tipo</th>
                                    <th scope="col" className="px-6 py-3 text-left text-[10px] font-black text-white uppercase tracking-wider">Referencia</th>
                                    <th scope="col" className="px-6 py-3 text-left text-[10px] font-black text-white uppercase tracking-wider">Defecto Causante</th>
                                    <th scope="col" className="px-6 py-3 text-left text-[10px] font-black text-white uppercase tracking-wider">Molde</th>
                                    <th scope="col" className="px-6 py-3 text-left text-[10px] font-black text-white uppercase tracking-wider">Registrado Por</th>
                                    {(hasEditPermission || hasDeletePermission) && (
                                        <th scope="col" className="px-6 py-3 text-right text-[10px] font-black text-white uppercase tracking-wider">Acciones</th>
                                    )}
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

                                    const moldeVal = report.Molde || report.molde

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
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold">
                                                {moldeVal ? (
                                                    <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[11px] font-black tracking-wide">
                                                        {moldeVal}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">
                                                {usersMap[report.create_by] || 'Anónimo'}
                                            </td>
                                            {(hasEditPermission || hasDeletePermission) && (
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {hasEditPermission && (
                                                            <button
                                                                onClick={(e) => handleEditReport(report, e)}
                                                                className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-full transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {hasDeletePermission && (
                                                            <button
                                                                onClick={(e) => handleDeleteReport(report, e)}
                                                                className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl flex flex-col border border-[#254153]">
                        <div className="bg-gradient-to-r from-[#254153] to-[#3a637c] p-6 text-center relative rounded-t-lg">
                            <button 
                                onClick={() => {
                                    setIsModalOpen(false)
                                    setEditingReportId(null)
                                    setMoldeInputValue('')
                                }}
                                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <BrokenSinkIcon className="w-12 h-12 text-white/90 mx-auto mb-2" />
                            <h2 className="text-white font-black text-xl tracking-wider uppercase">
                                {editingReportId ? 'Editar Evento' : 'Registrar Evento'}
                            </h2>
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
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                        saldosType === 'Saldo' 
                                            ? 'border-emerald-500 bg-emerald-50/30' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}>
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
                                        <PackageX className={`w-8 h-8 ${saldosType === 'Saldo' ? 'text-emerald-500' : 'text-gray-400'}`} />
                                        <span className={`text-sm font-black uppercase tracking-wider ${saldosType === 'Saldo' ? 'text-emerald-500' : 'text-gray-500'}`}>Saldo</span>
                                    </label>
                                    
                                    <label className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                        saldosType === 'Destrucción' 
                                            ? 'border-red-500 bg-red-50/30' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}>
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

                            <div className="relative z-10">
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

                            {/* Campo de Referencia de Molde integrado si el defecto seleccionado lo requiere */}
                            {currentSelectedDefectObj?.Requiere_Referencia_Molde && (
                                <div className="relative z-10 transition-all duration-300">
                                    <label className="block text-xs font-black text-amber-800 mb-2 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                        Referencia de Molde (Requerido)
                                    </label>
                                    <input
                                        type="text"
                                        value={moldeInputValue}
                                        onChange={(e) => setMoldeInputValue(e.target.value)}
                                        placeholder="Escribe la referencia del molde..."
                                        className="w-full bg-amber-50/60 border-2 border-amber-300 rounded px-4 py-3 text-[#254153] font-black text-sm focus:border-amber-600 focus:bg-white outline-none transition-all shadow-inner"
                                    />
                                    <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                                        * Este defecto está configurado para requerir la referencia del molde.
                                    </p>
                                </div>
                            )}
                            
                            <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-4">
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false)
                                        setEditingReportId(null)
                                        setSaldosProduct('')
                                        setSelectedDefect('')
                                        setMoldeInputValue('')
                                    }}
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
                                        editingReportId ? <Pencil className="w-4 h-4" /> : <BrokenSinkIcon className="w-4 h-4 text-white" />
                                    )}
                                    <span>{isUploading ? 'Guardando...' : (editingReportId ? 'Guardar Cambios' : 'Registrar')}</span>
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
                                const molde = moldeRefForUpload.current || moldeInputValue.trim()
                                void executeSave(file, molde)
                                moldeRefForUpload.current = undefined
                            }
                        }}
                    />
                </div>
            )}

            {/* Custom Modal for Molde Reference - Idéntico a Calidad MS */}
            {isMoldeModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-[#254153]">
                        <div className="bg-[#254153] px-4 py-3 flex items-center justify-between">
                            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Referencia de Molde</h3>
                            <button onClick={() => setIsMoldeModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-4 font-medium">
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
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#254153] focus:ring-1 focus:ring-[#254153] transition-all font-bold text-[#254153]"
                                placeholder="Escribe la referencia..."
                            />
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setIsMoldeModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors uppercase tracking-wider"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleMoldeSubmit}
                                    className="px-4 py-2 bg-[#36A284] text-white text-sm font-bold rounded hover:bg-[#2b856b] transition-colors uppercase tracking-wider shadow-sm"
                                >
                                    Aceptar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detalle Evento */}
            {selectedReport && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
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
                                {(selectedReport.Molde || selectedReport.molde) && (
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Molde</p>
                                        <p className="text-sm font-black text-amber-800 bg-amber-50 px-3 py-1.5 rounded inline-block border border-amber-200 tracking-wide">
                                            {selectedReport.Molde || selectedReport.molde}
                                        </p>
                                    </div>
                                )}
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

            {/* Modal de Configuración de Defectos (Imagen 3) */}
            <SaldosDefectsSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                defects={defectOptions}
                onSave={handleSaveSettings}
            />

            {/* POPUP DE CONFIRMACIÓN DE ELIMINACIÓN */}
            {deleteConfirmReport && (
                <div className="fixed inset-0 bg-black/60 z-[70] backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-base font-black text-[#254153] uppercase tracking-wide">
                                        ¿Eliminar este registro?
                                    </h3>
                                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                                        ¿Estás seguro de que deseas eliminar permanentemente el registro{' '}
                                        <span className="font-black text-red-600">#{deleteConfirmReport.id}</span>
                                        {deleteConfirmReport.producto?.Referencia && (
                                            <> ({deleteConfirmReport.producto.Referencia})</>
                                        )}? Esta acción removerá el registro de la base de datos y no se puede deshacer.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmReport(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteReport}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
