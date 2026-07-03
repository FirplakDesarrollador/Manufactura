"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/mtto-autonomo/supabase';
import { supabaseTH } from '@/lib/mtto-autonomo/supabaseTH';
import SearchableSelect from './SearchableSelect';

type GroupedItem = {
    equipo: string;
    revisar: string;
    dias: Record<string, string>;
    auditado: string | null; // Cambiado a string para soportar Check, X y Pendiente
};

type AuditTableClientProps = {
    initialItems: GroupedItem[];
    idPuestaAPunto: string | number;
    initialEnc: any; // Datos del encabezado
};

export default function AuditTableClient({ initialItems, idPuestaAPunto, initialEnc }: AuditTableClientProps) {
    const [items, setItems] = useState<GroupedItem[]>(initialItems);
    const [enc, setEnc] = useState(initialEnc);
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [isSavingHeader, setIsSavingHeader] = useState(false);
    const [empleados, setEmpleados] = useState<{ id: string|number; label: string }[]>([]);
    const [auditDate, setAuditDate] = useState(initialEnc.fecha_audit || new Date().toISOString().split('T')[0]);

    useEffect(() => {
        async function loadEmpleados() {
            try {
                const { data, error } = await supabaseTH
                    .from('empleados')
                    .select('id, nombreCompleto')
                    .eq('activo', true)
                    .order('nombreCompleto');
                
                if (error) throw error;
                if (data) {
                    setEmpleados(data.map(e => ({ id: e.id, label: e.nombreCompleto })));
                }
            } catch (err) {
                console.error('Error loading employees in Audit:', err);
                const { data: fallbackData } = await supabaseTH.from('empleados').select('id, nombreCompleto').limit(100);
                if (fallbackData) setEmpleados(fallbackData.map(e => ({ id: e.id, label: e.nombreCompleto })));
            }
        }
        loadEmpleados();
    }, []);

    // Colores corporativos Firplak
    const corporateBlue = '#1A445B'; // Cambiado de #1B2B41 para coincidir con el resto
    const accentBlue = '#1A445B';

    const handleToggleAudit = async (index: number) => {
        const item = items[index];
        if (!item) return;
        
        // Ciclo: null -> 'CHECK' -> 'X' -> null
        let nextStatus: string | null = null;
        if (!item.auditado) nextStatus = 'CHECK';
        else if (item.auditado === 'CHECK') nextStatus = 'X';
        else nextStatus = null;

        const key = `${index}`;
        setLoading(prev => ({ ...prev, [key]: true }));

        try {
            const { error } = await supabase
                .from('puestas_a_punto_detalle')
                .update({ Auditado: nextStatus })
                .eq('id_puesta_a_punto', idPuestaAPunto)
                .eq('equipo_herramienta', item.equipo)
                .eq('punto_a_revisar', item.revisar);

            if (error) throw error;

            const newItems = [...items];
            newItems[index] = { ...item, auditado: nextStatus };
            setItems(newItems);
        } catch (err: any) {
            console.error('Error updating audit status:', err);
            alert('Error al actualizar: ' + (err.message || 'Error desconocido'));
        } finally {
            setLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleUpdateAuditedBy = async (val: string) => {
        setEnc((prev: any) => ({ ...prev, "Auditado por": val }));
        
        setIsSavingHeader(true);
        try {
            const { error } = await supabase
                .from('puestas_a_punto_encabezado')
                .update({ "Auditado por": val })
                .eq('id_puesta_a_punto', idPuestaAPunto);
            if (error) throw error;
        } catch (err) {
            console.error('Error updating header (Auditado por):', err);
        } finally {
            setIsSavingHeader(false);
        }
    };

    const handleUpdateResponsable = async (val: string) => {
        setEnc((prev: any) => ({ ...prev, "responsable": val }));
        
        setIsSavingHeader(true);
        try {
            const { error } = await supabase
                .from('puestas_a_punto_encabezado')
                .update({ "responsable": val })
                .eq('id_puesta_a_punto', idPuestaAPunto);
            if (error) throw error;
        } catch (err) {
            console.error('Error updating header (Responsable):', err);
        } finally {
            setIsSavingHeader(false);
        }
    };

    const handleUpdateDate = async (val: string) => {
        setAuditDate(val);
        setIsSavingHeader(true);
        try {
            const { error } = await supabase
                .from('puestas_a_punto_encabezado')
                .update({ "fecha_audit": val })
                .eq('id_puesta_a_punto', idPuestaAPunto);
            if (error) throw error;
        } catch (err) {
            console.error('Error updating audit date:', err);
        } finally {
            setIsSavingHeader(false);
        }
    };

    // Cálculos de cumplimiento
    const totalPoints = items.length;
    const auditedPoints = items.filter(i => i.auditado === 'CHECK' || i.auditado === 'X').length;
    const auditCompliance = totalPoints > 0 ? (auditedPoints / totalPoints) * 100 : 0;

    let totalCells = 0;
    let filledCells = 0;
    items.forEach(item => {
        if (item.dias) {
            Object.keys(item.dias).forEach(dia => {
                const val = item.dias[dia];
                totalCells++;
                if (val && val !== 'N/A' && val !== '' && val.toUpperCase() !== 'PENDIENTE') {
                    filledCells++;
                }
            });
        }
    });

    const recordCompliance = totalPoints > 0 ? (filledCells / (totalPoints * 31)) * 100 : 0; 

    // Row spanning logic
    let rowSpans: number[] = new Array(items.length).fill(0);
    let currentEquipo: string | null = null;
    let startIndex = 0;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        if (item.equipo !== currentEquipo) {
            rowSpans[i] = 1;
            currentEquipo = item.equipo;
            startIndex = i;
        } else {
            const val = rowSpans[startIndex];
            if (val !== undefined) rowSpans[startIndex] = val + 1;
            rowSpans[i] = 0;
        }
    }

    const renderStatusIcon = (status: string | null) => {
        if (status === 'CHECK') {
            return (
                <div style={{ backgroundColor: '#EEF7F2', border: '1px solid #105B3A', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#105B3A' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L101.66,194.34,218.34,77.66a8,8,0,0,1,11.32,11.32Z"></path></svg>
                </div>
            );
        }
        if (status === 'X') {
            return (
                <div style={{ backgroundColor: '#FDF0F0', border: '1px solid #D13438', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D13438' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.34,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.34A8,8,0,0,1,61.34,50.06L128,116.69l66.66-66.63a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>
                </div>
            );
        }
        return (
            <div style={{ border: '2px solid #E2E8F0', borderRadius: '50%', width: '32px', height: '32px', backgroundColor: 'white' }}></div>
        );
    };

    const handleSelectAll = async () => {
        const confirmAll = confirm('¿Deseas marcar todos los puntos como BIEN?');
        if (!confirmAll) return;
        
        setLoading({ all: true });
        try {
            const { error } = await supabase
                .from('puestas_a_punto_detalle')
                .update({ Auditado: 'CHECK' })
                .eq('id_puesta_a_punto', idPuestaAPunto);

            if (error) throw error;

            const newItems = items.map(item => ({ ...item, auditado: 'CHECK' }));
            setItems(newItems);
        } catch (err: any) {
            alert('Error al actualizar todos los puntos: ' + err.message);
        } finally {
            setLoading({});
        }
    };

    const handleClearAudit = async () => {
        const confirmClear = confirm('¿Deseas limpiar todo el estado de auditoría?');
        if (!confirmClear) return;

        setLoading({ all: true });
        try {
            const { error } = await supabase
                .from('puestas_a_punto_detalle')
                .update({ Auditado: null })
                .eq('id_puesta_a_punto', idPuestaAPunto);

            if (error) throw error;

            const newItems = items.map(item => ({ ...item, auditado: null }));
            setItems(newItems);
        } catch (err: any) {
            alert('Error al limpiar la auditoría: ' + err.message);
        } finally {
            setLoading({});
        }
    };

       return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
            
            {/* Header Card */}
            <div style={{ 
                backgroundColor: corporateBlue, 
                borderRadius: '24px', 
                padding: '2.5rem', 
                color: 'white',
                boxShadow: '0 20px 40px rgba(26,68,91,0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Auditoría Técnica</h1>
                        <p style={{ opacity: 0.8, fontSize: '1.1rem', marginTop: '8px' }}>{enc.nombre_puesta_a_punto || enc.proceso}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '6px 16px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 800, border: '1px solid rgba(255,255,255,0.2)' }}>
                            V.{enc.version_formato || '1'}
                        </span>
                    </div>
                </div>
                
                <div style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '16px', 
                    padding: '2rem', 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '2rem',
                    color: corporateBlue
                }}>
                    <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Planta / Proceso</span>
                        <br/>
                        <strong style={{ fontSize: '1.1rem' }}>{enc.planta} • {enc.proceso}</strong>
                    </div>
                    <div>
                        <SearchableSelect 
                            label="Operario Auditado" 
                            options={empleados} 
                            value={enc.responsable || ""} 
                            onChange={handleUpdateResponsable} 
                            placeholder="Seleccione operario..." 
                            labelStyle={{ color: '#64748B' }}
                        />
                    </div>
                    <div>
                        <SearchableSelect 
                            label="Auditado por" 
                            options={empleados} 
                            value={enc["Auditado por"] || ""} 
                            onChange={handleUpdateAuditedBy} 
                            placeholder="Seleccione auditor..." 
                            labelStyle={{ color: '#64748B' }}
                        />
                    </div>
                    <div style={{ minWidth: '180px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Fecha Auditoría</span>
                        <br/>
                        <input 
                            type="date" 
                            value={auditDate} 
                            onChange={(e) => handleUpdateDate(e.target.value)}
                            style={{ 
                                width: '100%',
                                marginTop: '4px',
                                padding: '10px 14px', 
                                borderRadius: '10px', 
                                border: '1px solid #E2E8F0', 
                                backgroundColor: '#F8FAFC',
                                color: corporateBlue,
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                outline: 'none'
                            }}
                        />
                        {isSavingHeader && <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', marginTop: '4px' }}>Guardando...</span>}
                    </div>
                </div>
            </div>

            {/* Tabla */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: corporateBlue, color: 'white' }}>
                            <th style={{ padding: '20px 24px', width: '250px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>EQUIPO / SISTEMA</th>
                            <th style={{ padding: '20px 24px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PUNTO A REVISAR</th>
                            <th style={{ padding: '20px 24px', width: '120px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ESTADO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => {
                            const bgRow = idx % 2 === 0 ? '#ffffff' : '#F8FAFC';
                            return (
                                <tr key={idx} style={{ backgroundColor: bgRow, borderBottom: '1px solid #EDF2F7', opacity: loading[`${idx}`] ? 0.6 : 1 }}>
                                    {(rowSpans[idx] ?? 0) > 0 && (
                                        <td rowSpan={rowSpans[idx]} style={{ padding: '20px 24px', fontWeight: 800, backgroundColor: 'white', borderRight: '1px solid #EDF2F7', color: corporateBlue, verticalAlign: 'top', fontSize: '0.9rem' }}>
                                            {item.equipo}
                                        </td>
                                    )}
                                    <td style={{ padding: '16px 24px', fontSize: '0.95rem', color: '#44546A', lineHeight: 1.5 }}>
                                        {item.revisar}
                                    </td>
                                    <td 
                                        style={{ padding: '16px 24px', textAlign: 'center', cursor: 'pointer' }}
                                        onClick={() => handleToggleAudit(idx)}
                                    >
                                        <div style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {loading[`${idx}`] ? (
                                                <div style={{ width: '32px', height: '32px', border: '3px solid #F1F5F9', borderTopColor: corporateBlue, borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                            ) : (
                                                renderStatusIcon(item.auditado)
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Stats Summary at the Bottom */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>✓</div>
                        <div>
                            <div style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Cumplimiento Auditoría</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: corporateBlue }}>{auditCompliance.toFixed(1)}%</div>
                        </div>
                    </div>
                    <div style={{ width: '100px', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${auditCompliance}%`, height: '100%', backgroundColor: '#16A34A', transition: 'width 1s ease' }}></div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                     <button 
                        onClick={handleClearAudit}
                        style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: 'white', color: '#64748B', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FEE2E2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                    >
                        Limpiar Auditoría
                    </button>
                    <button 
                        onClick={() => window.history.back()}
                        style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: corporateBlue, color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(26,68,91,0.2)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(26,68,91,0.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,68,91,0.2)'; }}
                    >
                        Finalizar y Regresar
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
