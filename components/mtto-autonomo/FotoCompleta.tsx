'use client';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Visor de la foto a pantalla completa; se cierra con clic afuera, la X o Esc
export default function FotoCompleta({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      className="no-print"
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.85)', zIndex: 3000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', cursor: 'zoom-out' }}
    >
      <button
        type="button" onClick={onClose} title="Cerrar"
        style={{ position: 'absolute', top: '16px', right: '20px', width: '40px', height: '40px', borderRadius: '50%', border: 'none', backgroundColor: 'white', color: '#1A445B', fontSize: '1.3rem', fontWeight: 700, cursor: 'pointer' }}
      >
        ✕
      </button>
      <img src={src} alt={alt} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', cursor: 'default' }} />
      <span style={{ marginTop: '12px', color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>{alt}</span>
    </div>,
    document.body
  );
}
