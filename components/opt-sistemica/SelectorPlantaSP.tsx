'use client';

import React from 'react';
import { PLANTAS_SP } from '@/lib/sistema-produccion/cumplimiento';

// Planta o área donde se hace la OPT / programación: alimenta el cumplimiento por planta
// del tablero de Estadísticas de Producción.
export default function SelectorPlantaSP({ value, onChange, label = 'Planta / Área' }: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div style={{ marginTop: '16px' }}>
      <label
        className="label"
        style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}
      >
        {label} <span style={{ color: '#dc2626' }}>*</span>
      </label>
      <select className="input-field" value={value} onChange={e => onChange(e.target.value)} required>
        <option value="">Selecciona la planta o área...</option>
        {PLANTAS_SP.map(p => (
          <option key={p.value} value={p.value}>{p.value} · {p.label}</option>
        ))}
      </select>
    </div>
  );
}
