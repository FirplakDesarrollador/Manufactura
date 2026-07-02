'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Usuario {
    id: number;
    nombre: string;
    correo: string;
    rol: string;
    created_at: string;
    linea_predeterminada?: string;
    modulo_predeterminado?: string;
    planta_muebles?: string;
    permisos?: any;
}

const AVAILABLE_PERMISSIONS: Record<string, string[] | boolean> = {
    fibra: ['cedi', 'pulido', 'acabado', 'empaque', 'pintura', 'vaciado', 'desmolde', 'digitado', 'prensado', 'dashboard', 'tvacabado', 'parametros', 'reparacion', 'contramoldes', 'administracion'],
    modulos: ['cedi', 'pulido', 'acabado', 'empaque', 'pintura', 'vaciado', 'desmolde', 'digitado', 'prensado', 'dashboard', 'tvacabado', 'parametros', 'reparacion', 'contramoldes', 'administracion'],
    muebles: ['cedi', 'corte', 'panel', 'empaque', 'enchape', 'defectos', 'digitado', 'transito', 'dashboard', 'inspeccion', 'administracion'],
    calidad: ['ms'],
    hora_a_hora: true,
    ficha_rcc: true,
    opt: true,
    configuracion: true,
    tarjetas_excelencia: true,
    estadisticas_produccion: true,
    indicadores_productividad: true,
    asistencia: true
};

export default function UsuariosConfiguracionPage() {
    const router = useRouter()
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    
    // Estados del Modal
    const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editedPermisos, setEditedPermisos] = useState<any>({})
    const [isSaving, setIsSaving] = useState(false)
    
    // Estados para Contraseña
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [newPassword, setNewPassword] = useState('')

    const fetchUsuarios = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nombre, correo, rol, created_at, linea_predeterminada, modulo_predeterminado, planta_muebles, permisos')
            .order('nombre', { ascending: true })

        if (error) {
            console.error('Error fetching usuarios:', error)
        } else {
            setUsuarios(data || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchUsuarios()
    }, [fetchUsuarios])

    const filteredUsuarios = usuarios.filter(user => 
        user.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.correo?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    const openModal = (usuario: Usuario) => {
        setSelectedUser(usuario)
        setEditedPermisos(JSON.parse(JSON.stringify(usuario.permisos || {})))
        setIsEditing(false)
    }

    const closeModal = () => {
        if (!isSaving) {
            setSelectedUser(null)
            setIsEditing(false)
            setIsChangingPassword(false)
            setNewPassword('')
        }
    }

    const togglePermission = (modulo: string, subModulo: string | null) => {
        setEditedPermisos((prev: any) => {
            const updated = { ...prev };
            
            if (subModulo === null) {
                // Es un permiso booleano directo (ej. configuracion)
                updated[modulo] = !updated[modulo];
            } else {
                // Es un submódulo, aseguramos hacer una copia profunda (clon) del objeto anidado
                updated[modulo] = { ...(updated[modulo] || {}) };
                updated[modulo][subModulo] = !updated[modulo][subModulo];
            }
            return updated;
        });
    }

    const savePermissions = async () => {
        if (!selectedUser) return;
        setIsSaving(true);
        
        const { error } = await supabase
            .from('usuarios')
            .update({ permisos: editedPermisos })
            .eq('id', selectedUser.id);
            
        setIsSaving(false);
        
        if (error) {
            console.error('Error actualizando permisos:', error);
            alert('Hubo un error al actualizar los permisos.');
        } else {
            // Actualizar localmente
            setUsuarios(prev => prev.map(u => u.id === selectedUser.id ? { ...u, permisos: editedPermisos } : u));
            setSelectedUser({ ...selectedUser, permisos: editedPermisos });
            setIsEditing(false);
        }
    }

    const changePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres.')
            return
        }
        setIsSaving(true)
        const { error } = await supabase.rpc('admin_change_password', {
            target_email: selectedUser?.correo,
            new_password: newPassword
        })
        setIsSaving(false)
        
        if (error) {
            console.error('Error al cambiar contraseña:', error)
            alert('Hubo un error al cambiar la contraseña: ' + error.message)
        } else {
            alert('Contraseña actualizada exitosamente.')
            setIsChangingPassword(false)
            setNewPassword('')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-[#254153] sticky top-0 z-50 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => router.push('/configuracion')}
                            className="text-white hover:text-gray-200 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-xl font-semibold text-[#254153]">Lista de Usuarios</h2>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar usuario..."
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#254153]/20 focus:border-[#254153] transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Nombre</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Correo</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Rol</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <div className="inline-flex items-center justify-center space-x-2">
                                                <div className="w-5 h-5 border-2 border-[#254153] border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-gray-500 font-medium">Cargando usuarios...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredUsuarios.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                            No se encontraron usuarios.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsuarios.map((usuario) => (
                                        <tr 
                                            key={usuario.id} 
                                            onClick={() => openModal(usuario)}
                                            className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{usuario.nombre || 'Sin nombre'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-500">{usuario.correo}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                    ${usuario.rol === 'admin' || usuario.rol === 'desarrollador' 
                                                        ? 'bg-purple-100 text-purple-800' 
                                                        : 'bg-blue-100 text-blue-800'}`}>
                                                    {usuario.rol || 'Estándar'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-gray-400 hover:text-[#254153] transition-colors p-2 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal de Usuario */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                    <div 
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-[#254153] px-6 py-4 flex items-center justify-between shrink-0">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {isEditing ? 'Editar Permisos' : 'Información del Usuario'}
                            </h3>
                            <button 
                                onClick={closeModal}
                                disabled={isSaving}
                                className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="flex flex-col md:flex-row gap-8 h-full">
                                {/* Columna Izquierda: Info Básica */}
                                <div className="w-full md:w-1/3 space-y-5">
                                    <div className="flex flex-col items-center justify-center pb-4 border-b border-gray-100">
                                        <div className="w-20 h-20 bg-[#254153]/10 text-[#254153] rounded-full flex items-center justify-center text-3xl font-bold mb-3 shadow-sm border border-[#254153]/20">
                                            {selectedUser.nombre?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <h4 className="text-xl font-semibold text-gray-900 text-center">{selectedUser.nombre || 'Sin nombre'}</h4>
                                        <p className="text-sm text-gray-500 break-all text-center">{selectedUser.correo}</p>
                                        <span className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize shadow-sm
                                            ${selectedUser.rol === 'admin' || selectedUser.rol === 'desarrollador' 
                                                ? 'bg-purple-100 text-purple-800' 
                                                : 'bg-blue-100 text-blue-800'}`}>
                                            {selectedUser.rol || 'Estándar'}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {selectedUser.linea_predeterminada && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                    Línea
                                                </p>
                                                <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2 rounded-lg border border-gray-100">{selectedUser.linea_predeterminada}</p>
                                            </div>
                                        )}
                                        {selectedUser.modulo_predeterminado && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                                    Módulo
                                                </p>
                                                <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2 rounded-lg border border-gray-100">{selectedUser.modulo_predeterminado}</p>
                                            </div>
                                        )}
                                        {selectedUser.planta_muebles && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                    Planta
                                                </p>
                                                <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2 rounded-lg border border-gray-100">{selectedUser.planta_muebles}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                Fecha de Creación
                                            </p>
                                            <p className="text-sm text-gray-900 font-medium">{formatDate(selectedUser.created_at)}</p>
                                        </div>
                                    </div>

                                    {/* Cambiar Contraseña Section */}
                                    {!isChangingPassword ? (
                                        <button
                                            onClick={() => setIsChangingPassword(true)}
                                            className="w-full mt-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#254153] rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                            Cambiar Contraseña
                                        </button>
                                    ) : (
                                        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-sm font-bold text-[#254153]">Nueva Contraseña</label>
                                            <input 
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Mínimo 6 caracteres"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#254153]/50 focus:border-[#254153]"
                                            />
                                            <div className="flex gap-2 pt-2">
                                                <button 
                                                    onClick={() => setIsChangingPassword(false)}
                                                    className="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                                    disabled={isSaving}
                                                >
                                                    Cancelar
                                                </button>
                                                <button 
                                                    onClick={changePassword}
                                                    className="flex-1 px-3 py-2 bg-[#254153] text-white rounded-lg text-sm font-medium hover:bg-[#1a2e3b] transition-colors flex justify-center items-center"
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? (
                                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    ) : 'Guardar'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Columna Derecha: Permisos */}
                                <div className="w-full md:w-2/3 mt-6 md:mt-0 md:pl-6 md:border-l border-gray-100 flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-bold text-[#254153] flex items-center gap-2">
                                            <svg className="w-5 h-5 text-[#254153]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                            Permisos de Acceso
                                        </h4>
                                        {!isEditing && (
                                            <button 
                                                onClick={() => setIsEditing(true)}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                Editar Permisos
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-4 flex-1">
                                        {!isEditing ? (
                                            /* MODO VISUALIZACIÓN */
                                            (!selectedUser.permisos || Object.keys(selectedUser.permisos).length === 0 ? (
                                                <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                                                    <p className="text-sm text-gray-500">Este usuario no tiene permisos asignados.</p>
                                                </div>
                                            ) : (
                                                Object.entries(selectedUser.permisos).map(([modulo, accesos]) => (
                                                    <div key={modulo} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                            <h5 className="text-sm font-bold text-[#254153] uppercase tracking-wider">{modulo}</h5>
                                                        </div>
                                                        <div className="p-4">
                                                            {typeof accesos === 'boolean' ? (
                                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                    Acceso Total
                                                                </span>
                                                            ) : typeof accesos === 'object' && accesos !== null ? (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {Object.entries(accesos).map(([subModulo, tieneAcceso]) => 
                                                                        tieneAcceso ? (
                                                                            <span key={subModulo} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#254153]/5 text-[#254153] border border-[#254153]/10 capitalize">
                                                                                <svg className="w-3.5 h-3.5 mr-1 text-[#254153]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                                {subModulo.replace(/_/g, ' ')}
                                                                            </span>
                                                                        ) : null
                                                                    )}
                                                                    {Object.values(accesos).every(v => !v) && (
                                                                        <span className="text-xs text-gray-500 italic">Ningún acceso específico configurado</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-500">Valor de permiso desconocido</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ))
                                        ) : (
                                            /* MODO EDICIÓN */
                                            <div className="space-y-4 pb-4">
                                                {Object.entries(AVAILABLE_PERMISSIONS).map(([modulo, subModulos]) => {
                                                    const isBooleanModule = typeof subModulos === 'boolean';
                                                    return (
                                                        <div key={modulo} className="bg-white rounded-xl border border-blue-200 overflow-hidden shadow-sm">
                                                            <div className="bg-blue-50 px-4 py-3 border-b border-blue-200 flex items-center justify-between">
                                                                <h5 className="text-sm font-bold text-[#254153] uppercase tracking-wider">{modulo}</h5>
                                                                {isBooleanModule && (
                                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            className="sr-only peer"
                                                                            checked={!!editedPermisos[modulo]}
                                                                            onChange={() => togglePermission(modulo, null)}
                                                                        />
                                                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                                    </label>
                                                                )}
                                                            </div>
                                                            {!isBooleanModule && (
                                                                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                                    {(subModulos as string[]).map(sub => {
                                                                        const isChecked = editedPermisos[modulo]?.[sub] || false;
                                                                        return (
                                                                            <label key={sub} className="flex items-center space-x-2 cursor-pointer group">
                                                                                <div className="relative flex items-center justify-center">
                                                                                    <input 
                                                                                        type="checkbox" 
                                                                                        className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 checked:bg-blue-600 checked:border-blue-600 transition-all"
                                                                                        checked={isChecked}
                                                                                        onChange={() => togglePermission(modulo, sub)}
                                                                                    />
                                                                                    <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                                </div>
                                                                                <span className="text-sm text-gray-700 capitalize group-hover:text-gray-900 transition-colors">{sub.replace(/_/g, ' ')}</span>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                            {isEditing ? (
                                <>
                                    <button 
                                        onClick={() => setIsEditing(false)}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors text-sm font-medium shadow-sm disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={savePermissions}
                                        disabled={isSaving}
                                        className="px-6 py-2 bg-[#254153] hover:bg-[#1a2e3b] text-white rounded-lg transition-colors text-sm font-medium shadow-sm flex items-center gap-2 disabled:opacity-70"
                                    >
                                        {isSaving ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Guardando...
                                            </>
                                        ) : (
                                            'Guardar Cambios'
                                        )}
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors text-sm font-medium shadow-sm"
                                >
                                    Cerrar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
