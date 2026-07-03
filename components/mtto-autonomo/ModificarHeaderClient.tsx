"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import BackButton from './BackButton';

type Props = {
  id: string;
  initialData: any;
};

export default function ModificarHeaderClient({ id, initialData }: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: initialData.nombre_puesta_a_punto || '',
    proceso: initialData.proceso || '',
    version: initialData.version_formato || '1',
    responsable: initialData.responsable || '',
    supervisor: initialData.supervisor || '',
    planta: initialData.planta || '',
    fecha: initialData.creado_en ? initialData.creado_en.split('T')[0] : new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('puestas_a_punto_encabezado')
        .update({
          nombre_puesta_a_punto: formData.nombre,
          proceso: formData.proceso,
          version_formato: formData.version,
          responsable: formData.responsable,
          supervisor: formData.supervisor,
          planta: formData.planta,
          creado_en: formData.fecha
        })
        .eq('id_puesta_a_punto', id);

      if (error) throw error;
      setMessage('✅ Cambios guardados correctamente');
      setTimeout(() => router.refresh(), 1000);
    } catch (err: any) {
      console.error(err);
      setMessage('❌ Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <BackButton />
      </div>

      <form onSubmit={handleSave} style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '2.5rem', border: '1px solid #E2E8EA' }}>
        <h2 style={{ color: '#1A445B', marginBottom: '2rem', fontSize: '1.8rem', fontWeight: 800, borderLeft: '5px solid #105B3A', paddingLeft: '1rem' }}>
           Modificar Datos del Encabezado
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#667A85', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Nombre de la Puesta a Punto</label>
            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} style={inputStyle} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#667A85', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Proceso</label>
            <input type="text" name="proceso" value={formData.proceso} onChange={handleChange} style={inputStyle} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#667A85', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Versión del Formato</label>
            <input type="text" name="version" value={formData.version} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#667A85', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Responsable</label>
            <input type="text" name="responsable" value={formData.responsable} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#667A85', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Supervisor de Área</label>
            <input type="text" name="supervisor" value={formData.supervisor} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#667A85', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Planta</label>
            <input type="text" name="planta" value={formData.planta} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#667A85', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Fecha de Elaboración</label>
            <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        {message && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', backgroundColor: message.includes('✅') ? '#EEF7F2' : '#FDF0F0', color: message.includes('✅') ? '#105B3A' : '#D13438', fontWeight: 600, textAlign: 'center' }}>
            {message}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', marginTop: '2rem', padding: '1.2rem', backgroundColor: '#1A445B', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', transition: '0.3s', boxShadow: '0 4px 12px rgba(26,68,91,0.2)' }}
        >
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '10px',
  border: '2px solid #EDF0F1',
  fontSize: '1rem',
  color: '#1A445B',
  outline: 'none',
  transition: 'border-color 0.2s',
  backgroundColor: '#fcfdfd'
};
