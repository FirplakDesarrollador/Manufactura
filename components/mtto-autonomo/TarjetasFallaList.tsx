"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/mtto-autonomo/supabase';
import { useRouter } from 'next/navigation';

type TarjetaFalla = {
  id: string;
  codigo_tarjeta: string | null;
  planta_proceso: string;
  responsable: string | null;
  maquina: string | null;
  tipo_aviso: string;
  prioridad: string;
  fecha_apertura: string;
  fecha_limite: string | null;
  estado: string;
  descripcion_que: string;
  created_at: string;
};

type TarjetasFallaListProps = {
  initialData: TarjetaFalla[];
};

export default function TarjetasFallaList({ initialData }: TarjetasFallaListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todas');

  const filteredData = initialData.filter(item => {
    const matchesSearch = 
      item.descripcion_que.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.codigo_tarjeta?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (item.maquina?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      item.planta_proceso.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEstado = filterEstado === 'todas' || item.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'A': return '#ef4444'; // Red
      case 'B': return '#f59e0b'; // Amber
      case 'C': return '#3b82f6'; // Blue
      default: return '#64748B';
    }
  };

  const getStatusBadgeStyle = (estado: string) => {
    switch (estado) {
      case 'abierta': return { bg: '#FEF2F2', text: '#DC2626', border: '#FEE2E2' };
      case 'en_proceso': return { bg: '#FFFBEB', text: '#D97706', border: '#FEF3C7' };
      case 'cerrada': return { bg: '#F0FDF4', text: '#16A34A', border: '#DCFCE7' };
      default: return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
    }
  };

  const getTipoAvisoStyle = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'seguridad': 
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FEE2E2' };
      case 'mantenimiento_autonomo': 
        return { bg: '#EFF6FF', text: '#2563EB', border: '#DBEAFE' };
      case 'mantenimiento_planeado': 
        return { bg: '#FEFCE8', text: '#CA8A04', border: '#FEF9C3' };
      default: 
        return { bg: '#FFFFFF', text: '#64748B', border: '#E2E8F0' };
    }
  };

  return (
    <div style={{ width: '92%', maxWidth: '1450px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Search and Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#94A3B8" viewBox="0 0 256 256" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
              <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path>
            </svg>
            <input 
              type="text" 
              placeholder="Buscar por descripción, máquina..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '11px 16px 11px 42px', 
                backgroundColor: 'white', 
                border: '1px solid #E2E8F0', 
                borderRadius: '10px', 
                fontSize: '0.9rem', 
                color: '#1B2B41',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                outline: 'none'
              }}
            />
          </div>

          <select 
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            style={{
              padding: '11px 16px',
              backgroundColor: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              fontSize: '0.9rem',
              color: '#1B2B41',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="todas">Todas los estados</option>
            <option value="abierta">Abiertas</option>
            <option value="en_proceso">En Proceso</option>
            <option value="cerrada">Cerradas</option>
          </select>
        </div>

        <Link 
          href="/mtto-autonomo/tarjetas-falla/crear"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px 24px', 
            backgroundColor: '#1A445B', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '12px', 
            fontWeight: 700, 
            fontSize: '0.95rem', 
            boxShadow: '0 4px 12px rgba(26,68,91,0.2)', 
            transition: 'all 0.2s' 
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#15364a'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1A445B'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H136v88a8,8,0,0,1-16,0V136H32a8,8,0,0,1,0-16h88V32a8,8,0,0,1,16,0v88h88A8,8,0,0,1,224,128Z"></path></svg>
          Nueva Tarjeta
        </Link>
      </div>

      <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '0.5rem 0' }}></div>

      {/* Grid of Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {filteredData.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '2px dashed #E2E8F0' }}>
            <p style={{ fontSize: '1.1rem' }}>No se encontraron tarjetas de anomalías</p>
          </div>
        ) : (
          filteredData.map((item) => {
            const statusStyle = getStatusBadgeStyle(item.estado);
            return (
              <div 
                key={item.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  border: '1px solid #F1F5F9',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#F1F5F9';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)';
                }}
              >
                {/* Priority Strip */}
                <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', backgroundColor: getPriorityColor(item.prioridad), clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}>
                   <span style={{ position: 'absolute', top: '4px', right: '4px', color: 'white', fontSize: '0.7rem', fontWeight: 900 }}>{item.prioridad}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                      {item.codigo_tarjeta || 'S/N'}
                    </h3>
                    <h2 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', color: '#1B2B41', fontWeight: 800 }}>
                      {item.maquina || 'Sin Máquina'}
                    </h2>
                  </div>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    backgroundColor: statusStyle.bg, 
                    color: statusStyle.text, 
                    padding: '4px 10px', 
                    borderRadius: '8px', 
                    fontWeight: 800,
                    border: `1px solid ${statusStyle.border}`,
                    textTransform: 'uppercase'
                  }}>
                    {item.estado.replace('_', ' ')}
                  </span>
                </div>

                <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '4.5em' }}>
                  {item.descripcion_que}
                </p>

                <div style={{ height: '1px', backgroundColor: '#F1F5F9' }}></div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>PLANTA</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#1B2B41', fontWeight: 700 }}>{item.planta_proceso}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>TIPO</p>
                    <div style={{ 
                      display: 'inline-block',
                      marginTop: '4px',
                      fontSize: '0.8rem', 
                      backgroundColor: getTipoAvisoStyle(item.tipo_aviso).bg, 
                      color: getTipoAvisoStyle(item.tipo_aviso).text, 
                      padding: '2px 8px', 
                      borderRadius: '6px', 
                      fontWeight: 700,
                      border: `1px solid ${getTipoAvisoStyle(item.tipo_aviso).border}`,
                      textTransform: 'uppercase'
                    }}>
                      {item.tipo_aviso.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#94A3B8" viewBox="0 0 256 256"><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z"></path></svg>
                    <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>
                      Limite: {item.fecha_limite ? new Date(item.fecha_limite).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  
                  <Link 
                    href={`/mtto-autonomo/tarjetas-falla/ver/${item.id}`}
                    style={{ fontSize: '0.85rem', color: '#1A445B', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Detalles
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path></svg>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

