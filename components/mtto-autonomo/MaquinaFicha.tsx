'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { primeraFoto } from './MaquinaSelect';
import FotoCompleta from './FotoCompleta';

interface Ficha {
  codigo_equipo: string | null;
  nombre_equipo: string;
  fotos: string | null;
}

// Muestra el equipo de una puesta a punto con la foto y el código de la máquina relacionada.
// Es cliente porque el catálogo de máquinas solo se puede leer con la sesión del usuario.
export default function MaquinaFicha({ idMaquina, nombre, variant = 'screen' }: { idMaquina: number | null; nombre: string; variant?: 'screen' | 'print' }) {
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [verFoto, setVerFoto] = useState(false);

  useEffect(() => {
    if (!idMaquina && !nombre.trim()) return;
    let active = true;
    const query = supabase.from('mantenimiento_maquinas_equipos').select('codigo_equipo, nombre_equipo, fotos');
    if (idMaquina) {
      query.eq('id', idMaquina).limit(1).then(({ data }) => { if (active && data?.length) setFicha(data[0] as Ficha); });
    } else {
      // Sin id_maquina se busca por nombre (sin importar tildes ni mayúsculas). Si hay varias máquinas
      // con el mismo nombre (ej: varias "Pulidora 4 1/2") se muestra la foto de una de ellas, pero el
      // código solo cuando la máquina es única.
      const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
      const buscado = sinTildes(nombre);
      const primera = (buscado.split(' ')[0] || '').replace(/[%_\\]/g, '\\$&');
      query.ilike('nombre_equipo', `%${primera}%`).limit(500).then(({ data }) => {
        if (!active || !data) return;
        const iguales = (data as Ficha[]).filter(m => sinTildes(m.nombre_equipo) === buscado);
        if (!iguales.length) return;
        const conFoto = iguales.find(m => primeraFoto(m.fotos)) || iguales[0]!;
        setFicha({ ...conFoto, codigo_equipo: iguales.length === 1 ? conFoto.codigo_equipo : null });
      });
    }
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
          onClick={print ? undefined : () => setVerFoto(true)}
          title={print ? undefined : 'Ver foto completa'}
          style={print
            ? { width: '100%', maxWidth: '110px', maxHeight: '75px', objectFit: 'contain' }
            : { width: '100%', maxWidth: '170px', height: '110px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #E2E8F0', cursor: 'zoom-in' }}
        />
      )}
      {verFoto && foto && <FotoCompleta src={foto} alt={ficha?.nombre_equipo || nombre} onClose={() => setVerFoto(false)} />}
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
