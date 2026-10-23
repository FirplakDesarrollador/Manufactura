'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { primeraFoto } from './MaquinaSelect';

interface Ficha {
  codigo_equipo: string | null;
  nombre_equipo: string;
  fotos: string | null;
}

// Muestra el equipo de una puesta a punto con la foto y el código de la máquina relacionada.
// Es cliente porque el catálogo de máquinas solo se puede leer con la sesión del usuario.
export default function MaquinaFicha({ idMaquina, nombre, variant = 'screen' }: { idMaquina: number | null; nombre: string; variant?: 'screen' | 'print' }) {
  const [ficha, setFicha] = useState<Ficha | null>(null);

  useEffect(() => {
    if (!idMaquina && !nombre.trim()) return;
    let active = true;
    const query = supabase.from('mantenimiento_maquinas_equipos').select('codigo_equipo, nombre_equipo, fotos');
    // Sin id_maquina se busca por nombre exacto; solo se usa si hay una única coincidencia
    const req = idMaquina
      ? query.eq('id', idMaquina).limit(1)
      : query.ilike('nombre_equipo', nombre.trim().replace(/[%_\\]/g, '\\$&')).limit(2);
    req.then(({ data }) => { if (active && data && data.length === 1) setFicha(data[0] as Ficha); });
    return () => { active = false; };
  }, [idMaquina, nombre]);

  const foto = primeraFoto(ficha?.fotos);
  const print = variant === 'print';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: print ? '3px' : '6px', alignItems: print ? 'center' : 'flex-start' }}>
      <span>{nombre}</span>
      {foto && (
        <img
          src={foto}
          alt={ficha?.nombre_equipo || nombre}
          style={print
            ? { width: '100%', maxWidth: '110px', maxHeight: '75px', objectFit: 'contain' }
            : { width: '100%', maxWidth: '170px', height: '110px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #E2E8F0' }}
        />
      )}
      {ficha?.codigo_equipo && (
        <span style={print
          ? { fontSize: '7.5pt', fontWeight: 700 }
          : { fontSize: '0.7rem', fontWeight: 800, color: '#105B3A', backgroundColor: '#E7F5EE', borderRadius: '6px', padding: '2px 8px' }}>
          {print ? `Cód. ${ficha.codigo_equipo}` : `🔗 ${ficha.codigo_equipo}`}
        </span>
      )}
    </div>
  );
}
