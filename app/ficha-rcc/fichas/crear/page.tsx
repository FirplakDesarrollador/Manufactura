'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/ficha-rcc/supabaseClient';
import { PlantaEnum, OrigenEnum, Accion } from '@/types';
import { useEffect } from 'react';
import Link from 'next/link';
import SignatureCanvas from 'react-signature-canvas';
import FirplakLogo from '@/components/ficha-rcc/FirplakLogo';
import Combobox from '@/components/ficha-rcc/Combobox';
import { PLANTAS_LIST, ORIGENES_LIST } from '@/lib/ficha-rcc/constants';
import { isAuthorized } from '@/lib/ficha-rcc/auth';

export default function CrearFichaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorizedUser, setIsAuthorizedUser] = useState(false);

  const [planta, setPlanta] = useState<PlantaEnum>('Mármol Sintético');
  const [responsable, setResponsable] = useState('');
  const [responsablesCargados, setResponsablesCargados] = useState<string[]>([]);
  
  const [origen, setOrigen] = useState<OrigenEnum>('Saldos');
  const [fecha, setFecha] = useState('');
  const [problema, setProblema] = useState('');
  const [defectosCargados, setDefectosCargados] = useState<string[]>([]);

  // Carga de defectos desde la base de datos según la planta seleccionada
  useEffect(() => {
    fetchDefectos();
    fetchResponsables();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthorizedUser(isAuthorized(session?.user?.email));
    });
  }, [planta]);

  const fetchDefectos = async () => {
    try {
      const { data, error } = await supabase
        .from('cat_defectos')
        .select('nombre_defecto')
        .eq('planta', planta)
        .order('posicion', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        const nombres = data.map(d => d.nombre_defecto);
        setDefectosCargados(nombres);
        if (nombres.length > 0) {
          setProblema(nombres[0]);
        }
      }
    } catch (err) {
      console.error('Error cargando defectos:', err);
    }
  };

  const fetchResponsables = async () => {
    const { data } = await supabase
      .from('cat_responsables')
      .select('nombre')
      .order('nombre', { ascending: true });
    if (data) setResponsablesCargados(data.map(r => r.nombre));
  };

  const formatText = (str: string) => {
    if (!str) return "";
    const match = str.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/);
    if (!match || match.index === undefined) return str.toUpperCase();
    const index = match.index;
    const prefix = str.slice(0, index);
    const rest = str.slice(index);
    return prefix + rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase();
  };

  const handlePlantaChange = (nuevaPlanta: PlantaEnum) => {
    setPlanta(nuevaPlanta);
  };
  
  
  const [segEntrada, setSegEntrada] = useState('');
  const [segD1, setSegD1] = useState('');
  const [segD2, setSegD2] = useState('');
  const [segD3, setSegD3] = useState('');

  const [fotoOk, setFotoOk] = useState<File | null>(null);
  const [fotoNok, setFotoNok] = useState<File | null>(null);
  const [previewOk, setPreviewOk] = useState<string | null>(null);
  const [previewNok, setPreviewNok] = useState<string | null>(null);

  useEffect(() => {
    if (fotoOk) {
      const url = URL.createObjectURL(fotoOk);
      setPreviewOk(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewOk(null);
    }
  }, [fotoOk]);

  useEffect(() => {
    if (fotoNok) {
      const url = URL.createObjectURL(fotoNok);
      setPreviewNok(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewNok(null);
    }
  }, [fotoNok]);

  const emptyAccion: Accion = { accion: '', responsable: '', firma: null, fecha: '', cumplimiento: 'Pendiente' };
  const [contingencias, setContingencias] = useState<Accion[]>([{ ...emptyAccion }]);
  const [erradicaciones, setErradicaciones] = useState<Accion[]>([{ ...emptyAccion }]);

  const contingenciaRefs = useRef<(SignatureCanvas | null)[]>([]);
  const erradicacionRefs = useRef<(SignatureCanvas | null)[]>([]);

  const handleAddContingencia = () => setContingencias([...contingencias, { ...emptyAccion }]);
  const handleAddErradicacion = () => setErradicaciones([...erradicaciones, { ...emptyAccion }]);

  const updateContingencia = (index: number, field: keyof Accion, value: string) => {
    const updated = [...contingencias];
    updated[index] = { ...updated[index], [field]: value };
    setContingencias(updated);
  };

  const updateErradicacion = (index: number, field: keyof Accion, value: string) => {
    const updated = [...erradicaciones];
    updated[index] = { ...updated[index], [field]: value };
    setErradicaciones(updated);
  };

  const uploadImageToSupabase = async (file: File, prefix: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('fichas-media')
      .upload(fileName, file);

    if (uploadError) throw new Error(`Error subiendo la foto de las piezas: ${uploadError.message}. ¿Aseguraste crear el bucket 'fichas-media' en Supabase?`);

    const { data } = supabase.storage.from('fichas-media').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa. Por favor, inicia sesión.');

      let urlFotoOk = null;
      let urlFotoNok = null;
      if (fotoOk) urlFotoOk = await uploadImageToSupabase(fotoOk, 'ok');
      if (fotoNok) urlFotoNok = await uploadImageToSupabase(fotoNok, 'nok');

      const contingenciasFinal = contingencias.map((acc, i) => {
        const canvas = contingenciaRefs.current[i];
        const firmaBase64 = canvas && !canvas.isEmpty() ? canvas.getTrimmedCanvas().toDataURL('image/png') : null;
        return { ...acc, firma: firmaBase64 };
      });

      const erradicacionesFinal = erradicaciones.map((acc, i) => {
        const canvas = erradicacionRefs.current[i];
        const firmaBase64 = canvas && !canvas.isEmpty() ? canvas.getTrimmedCanvas().toDataURL('image/png') : null;
        return { ...acc, firma: firmaBase64 };
      });

      const { error: insertError } = await supabase.from('fichas_alerta').insert([{
        user_id: session.user.id,
        planta,
        responsable,
        origen,
        fecha,
        problema,
        seguimiento_entrada: segEntrada,
        seguimiento_d1: segD1,
        seguimiento_d2: segD2,
        seguimiento_d3: segD3,
        foto_piezas_ok: urlFotoOk,
        foto_piezas_nok: urlFotoNok,
        contingencias: contingenciasFinal,
        erradicaciones: erradicacionesFinal
      }]);

      if (insertError) throw insertError;
      
      router.push('/ficha-rcc/');
      router.refresh();
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al guardar la ficha. ¿Aseguraste ejecutar el SQL en Supabase?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container" style={{ maxWidth: '1100px' }}>
      <div className="header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ background: 'var(--header-bg)', padding: '20px 40px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <FirplakLogo height="70px" />
          </div>
        </div>
        <Link href="/" style={{ textDecoration: 'none' }}>
           <button className="btn-secondary">Volver al Panel</button>
        </Link>
      </div>

      <div className="glass-panel">
        {error && (
          <div className="auth-error" style={{ marginBottom: '24px' }}>
             {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Encabezado Principal */}
          <div className="responsive-header-grid">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Combobox 
                label="Planta"
                options={PLANTAS_LIST}
                value={planta}
                onChange={(val) => handlePlantaChange(val as PlantaEnum)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Combobox 
                label="Responsable Principal"
                options={responsablesCargados}
                value={responsable}
                onChange={setResponsable}
                placeholder={responsablesCargados.length === 0 ? "Cargando personal..." : "Seleccionar responsable..."}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Combobox 
                label="Origen"
                options={ORIGENES_LIST}
                value={origen}
                onChange={(val) => setOrigen(val as OrigenEnum)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '14px' }}>Fecha</label>
              <input type="date" className="input-field" value={fecha} onChange={e => setFecha(e.target.value)} required />
            </div>
          </div>

          {/* Problema */}
          <div style={{ marginBottom: '24px' }}>
            <Combobox 
              label="Problema (Defecto detectado)"
              options={defectosCargados}
              value={problema}
              onChange={setProblema}
              placeholder={defectosCargados.length === 0 ? "Cargando defectos..." : "Seleccionar defecto..."}
            />
          </div>

          {/* Seguimiento */}
          <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Seguimiento</h3>
          <div className="seguimiento-grid">
             <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Entrada</label>
                <input type="text" className="input-field" value={segEntrada} onChange={e => setSegEntrada(e.target.value)} />
             </div>
             <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>D-1</label>
                <input type="text" className="input-field" value={segD1} onChange={e => setSegD1(e.target.value)} />
             </div>
             <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>D-2</label>
                <input type="text" className="input-field" value={segD2} onChange={e => setSegD2(e.target.value)} />
             </div>
             <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>D-3</label>
                <input type="text" className="input-field" value={segD3} onChange={e => setSegD3(e.target.value)} />
             </div>
          </div>

          {/* Acción de Contingencia */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--primary)' }}>Acciones de Contingencia</h3>
            <button type="button" onClick={handleAddContingencia} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>+ Agregar Acción</button>
          </div>
          <div style={{ marginBottom: '32px' }}>
            {contingencias.map((acc, index) => (
              <div key={index} className="accion-card-grid" style={{ background: 'var(--surface-hover)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                   <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Descripción y Fecha</label>
                   <input type="text" placeholder="Acción (Descripción)" className="input-field" style={{ marginBottom: 0, height: '48px' }} value={acc.accion} onChange={e => updateContingencia(index, 'accion', e.target.value)} />
                   <div style={{ marginTop: '12px' }}>
                    <input type="date" className="input-field" style={{ marginBottom: 0, height: '48px' }} value={acc.fecha} onChange={e => updateContingencia(index, 'fecha', e.target.value)} />
                   </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                   <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Responsable y Estado</label>
                   <Combobox 
                     options={responsablesCargados}
                     value={acc.responsable}
                     onChange={(val) => updateContingencia(index, 'responsable', val)}
                     placeholder="Responsable..."
                   />
                   <div style={{ marginTop: '12px' }}>
                    <Combobox 
                      options={['Pendiente', 'OK', 'NO OK']}
                      value={acc.cumplimiento}
                      onChange={(val) => updateContingencia(index, 'cumplimiento', val)}
                      disabled={!isAuthorizedUser}
                    />
                   </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Firma Responsable</label>
                   <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', height: '108px' }}>
                     <SignatureCanvas 
                       ref={(el) => { if (el) contingenciaRefs.current[index] = el; }} 
                       penColor="black" 
                       canvasProps={{ width: 250, height: 108, className: 'sigCanvas' }} 
                     />
                   </div>
                   <button type="button" onClick={() => contingenciaRefs.current[index]?.clear()} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '11px', textAlign: 'right', marginTop: '4px' }}>Limpiar Firma</button>
                </div>
              </div>
            ))}
          </div>

          {/* Piezas */}
          <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Reporte de Piezas y Adjuntos</h3>
          <div className="piezas-grid">
             <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: 600 }}>Foto de Piezas OK</label>
                {previewOk && (
                  <div style={{ marginBottom: '12px', borderRadius: '10px', overflow: 'hidden', height: '150px', display: 'flex', justifyContent: 'center', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <img src={previewOk} alt="Preview OK" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                <input type="file" accept="image/*" className="input-field" style={{ padding: '8px', marginBottom: 0 }} onChange={e => setFotoOk(e.target.files?.[0] || null)} />
             </div>
             <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: 600 }}>Foto de Piezas NO OK</label>
                {previewNok && (
                  <div style={{ marginBottom: '12px', borderRadius: '10px', overflow: 'hidden', height: '150px', display: 'flex', justifyContent: 'center', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <img src={previewNok} alt="Preview NO OK" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                <input type="file" accept="image/*" className="input-field" style={{ padding: '8px', marginBottom: 0 }} onChange={e => setFotoNok(e.target.files?.[0] || null)} />
             </div>
          </div>

          {/* Acción de Erradicación */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--primary)' }}>Acciones de Erradicación</h3>
            <button type="button" onClick={handleAddErradicacion} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>+ Agregar Acción</button>
          </div>
          <div style={{ marginBottom: '32px' }}>
            {erradicaciones.map((acc, index) => (
              <div key={index} className="accion-card-grid" style={{ background: 'var(--surface-hover)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                   <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Descripción y Fecha</label>
                   <input type="text" placeholder="Acción (Descripción)" className="input-field" style={{ marginBottom: 0, height: '48px' }} value={acc.accion} onChange={e => updateErradicacion(index, 'accion', e.target.value)} />
                   <div style={{ marginTop: '12px' }}>
                    <input type="date" className="input-field" style={{ marginBottom: 0, height: '48px' }} value={acc.fecha} onChange={e => updateErradicacion(index, 'fecha', e.target.value)} />
                   </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                   <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Responsable y Estado</label>
                   <Combobox 
                     options={responsablesCargados}
                     value={acc.responsable}
                     onChange={(val) => updateErradicacion(index, 'responsable', val)}
                     placeholder="Responsable..."
                   />
                   <div style={{ marginTop: '12px' }}>
                    <Combobox 
                      options={['Pendiente', 'OK', 'NO OK']}
                      value={acc.cumplimiento}
                      onChange={(val) => updateErradicacion(index, 'cumplimiento', val)}
                      disabled={!isAuthorizedUser}
                    />
                   </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Firma Responsable</label>
                   <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', height: '108px' }}>
                     <SignatureCanvas 
                       ref={(el) => { if (el) erradicacionRefs.current[index] = el; }} 
                       penColor="black" 
                       canvasProps={{ width: 250, height: 108, className: 'sigCanvas' }} 
                     />
                   </div>
                   <button type="button" onClick={() => erradicacionRefs.current[index]?.clear()} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '11px', textAlign: 'right', marginTop: '4px' }}>Limpiar Firma</button>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '16px 32px', fontSize: '18px' }}>
            {loading ? <div className="spinner"></div> : 'Guardar Ficha de Alerta'}
          </button>
        </form>
      </div>
    </div>
  );
}
