'use client';

import { useState, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/ficha-rcc/supabaseClient';
import { PlantaEnum, OrigenEnum, Accion, FichaAlerta } from '@/types';
import Link from 'next/link';
import SignatureCanvas from 'react-signature-canvas';
import FirplakLogo from '@/components/ficha-rcc/FirplakLogo';
import Combobox from '@/components/ficha-rcc/Combobox';
import { PLANTAS_LIST, ORIGENES_LIST } from '@/lib/ficha-rcc/constants';
import { isAuthorized } from '@/lib/ficha-rcc/auth';

export default function DetalleFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isAuthorizedUser, setIsAuthorizedUser] = useState(false);

  // Form states
  const [planta, setPlanta] = useState<PlantaEnum>('Mármol Sintético');
  const [responsable, setResponsable] = useState('');
  const [responsablesCargados, setResponsablesCargados] = useState<string[]>([]);
  const [origen, setOrigen] = useState<OrigenEnum>('Saldos');
  const [fecha, setFecha] = useState('');
  const [problema, setProblema] = useState('');
  const [defectosCargados, setDefectosCargados] = useState<string[]>([]);
  
  // Carga de catálogos
  useEffect(() => {
    fetchDefectos();
    fetchResponsables();
  }, [planta]);

  const fetchDefectos = async () => {
    try {
      const { data, error } = await supabase
        .from('cat_defectos')
        .select('nombre_defecto')
        .eq('planta', planta)
        .order('posicion', { ascending: true });
      
      if (data) setDefectosCargados(data.map(d => d.nombre_defecto));
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    }
  };

  const fetchResponsables = async () => {
    const { data } = await supabase
      .from('cat_responsables')
      .select('nombre')
      .order('nombre', { ascending: true });
    if (data) setResponsablesCargados(data.map(r => r.nombre));
  };
  const [segEntrada, setSegEntrada] = useState('');
  const [segD1, setSegD1] = useState('');
  const [segD2, setSegD2] = useState('');
  const [segD3, setSegD3] = useState('');
  const [urlFotoOk, setUrlFotoOk] = useState<string | null>(null);
  const [urlFotoNok, setUrlFotoNok] = useState<string | null>(null);
  const [fotoOkFile, setFotoOkFile] = useState<File | null>(null);
  const [fotoNokFile, setFotoNokFile] = useState<File | null>(null);

  const emptyAccion: Accion = { accion: '', responsable: '', firma: null, fecha: '', cumplimiento: 'Pendiente' };
  const [contingencias, setContingencias] = useState<Accion[]>([{ ...emptyAccion }]);
  const [erradicaciones, setErradicaciones] = useState<Accion[]>([{ ...emptyAccion }]);

  const contingenciaRefs = useRef<(SignatureCanvas | null)[]>([]);
  const erradicacionRefs = useRef<(SignatureCanvas | null)[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }
        setUser(session.user);
        setIsAuthorizedUser(isAuthorized(session.user.email));

        const { data: ficha, error: fetchError } = await supabase
          .from('fichas_alerta')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (!ficha) throw new Error('Ficha no encontrada');

        const f = ficha as FichaAlerta;
        setIsOwner(f.user_id === session.user.id);

        // Populate form
        setPlanta(f.planta);
        setResponsable(f.responsable);
        setOrigen(f.origen);
        setFecha(f.fecha);
        setProblema(f.problema);
        setSegEntrada(f.seguimiento_entrada || '');
        setSegD1(f.seguimiento_d1 || '');
        setSegD2(f.seguimiento_d2 || '');
        setSegD3(f.seguimiento_d3 || '');
        setUrlFotoOk(f.foto_piezas_ok);
        setUrlFotoNok(f.foto_piezas_nok);
        setContingencias(f.contingencias?.length ? f.contingencias : [{ ...emptyAccion }]);
        setErradicaciones(f.erradicaciones?.length ? f.erradicaciones : [{ ...emptyAccion }]);

      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error al cargar la ficha');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  useEffect(() => {
    // Solo creamos URL si es un archivo local nuevo
    if (fotoOkFile) {
        const url = URL.createObjectURL(fotoOkFile);
        setUrlFotoOk(url);
        return () => URL.revokeObjectURL(url);
    }
  }, [fotoOkFile]);

  useEffect(() => {
    if (fotoNokFile) {
        const url = URL.createObjectURL(fotoNokFile);
        setUrlFotoNok(url);
        return () => URL.revokeObjectURL(url);
    }
  }, [fotoNokFile]);

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
    if (!isOwner) return;
    setPlanta(nuevaPlanta);
    // Nota: El useEffect de defectosCargados se disparará solo.
    // Podríamos querer resetear el problema aquí si es una nueva selección.
  };

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

    if (uploadError) throw new Error(`Error subiendo la foto: ${uploadError.message}`);

    const { data } = supabase.storage.from('fichas-media').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner && !isAuthorizedUser) return;

    try {
      setSaving(true);
      setError(null);

      let finalUrlFotoOk = urlFotoOk;
      let finalUrlFotoNok = urlFotoNok;

      // Solo subimos si hay un archivo nuevo. Si no, mantenemos la URL existente.
      if (fotoOkFile) finalUrlFotoOk = await uploadImageToSupabase(fotoOkFile, 'ok');
      if (fotoNokFile) finalUrlFotoNok = await uploadImageToSupabase(fotoNokFile, 'nok');

      const contingenciasFinal = contingencias.map((acc, i) => {
        const canvas = contingenciaRefs.current[i];
        const firmaBase64 = canvas && !canvas.isEmpty() ? canvas.getTrimmedCanvas().toDataURL('image/png') : acc.firma;
        return { ...acc, firma: firmaBase64 };
      });

      const erradicacionesFinal = erradicaciones.map((acc, i) => {
        const canvas = erradicacionRefs.current[i];
        const firmaBase64 = canvas && !canvas.isEmpty() ? canvas.getTrimmedCanvas().toDataURL('image/png') : acc.firma;
        return { ...acc, firma: firmaBase64 };
      });

      const { error: updateError } = await supabase
        .from('fichas_alerta')
        .update({
          planta,
          responsable,
          origen,
          fecha,
          problema,
          seguimiento_entrada: segEntrada,
          seguimiento_d1: segD1,
          seguimiento_d2: segD2,
          seguimiento_d3: segD3,
          foto_piezas_ok: finalUrlFotoOk,
          foto_piezas_nok: finalUrlFotoNok,
          contingencias: contingenciasFinal,
          erradicaciones: erradicacionesFinal
        })
        .eq('id', id);

      if (updateError) throw updateError;
      
      router.push("/ficha-rcc");
      router.refresh();
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al actualizar la ficha.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-gradient)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>
                {isOwner ? 'Editar Ficha de Alerta' : 'Consultar Ficha de Alerta'}
            </h2>
            {!isOwner && <span style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.05)', borderRadius: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>Modo Solo Lectura</span>}
        </div>

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
                disabled={!isOwner}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Combobox 
                label="Responsable Principal"
                options={responsablesCargados}
                value={responsable}
                onChange={setResponsable}
                placeholder={responsablesCargados.length === 0 ? "Cargando personal..." : "Seleccionar responsable..."}
                disabled={!isOwner}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Combobox 
                label="Origen"
                options={ORIGENES_LIST}
                value={origen}
                onChange={(val) => setOrigen(val as OrigenEnum)}
                disabled={!isOwner}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '14px' }}>Fecha</label>
              <input type="date" className="input-field" disabled={!isOwner} value={fecha} onChange={e => setFecha(e.target.value)} required />
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
                disabled={!isOwner}
              />
          </div>

          {/* Seguimiento */}
          <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Seguimiento</h3>
          <div className="seguimiento-grid">
             <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Entrada</label>
                <input type="text" className="input-field" disabled={!isOwner} value={segEntrada} onChange={e => setSegEntrada(e.target.value)} />
             </div>
             <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>D-1</label>
                <input type="text" className="input-field" disabled={!isOwner} value={segD1} onChange={e => setSegD1(e.target.value)} />
             </div>
             <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>D-2</label>
                <input type="text" className="input-field" disabled={!isOwner} value={segD2} onChange={e => setSegD2(e.target.value)} />
             </div>
             <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>D-3</label>
                <input type="text" className="input-field" disabled={!isOwner} value={segD3} onChange={e => setSegD3(e.target.value)} />
             </div>
          </div>

          {/* Acción de Contingencia */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--primary)' }}>Acciones de Contingencia</h3>
            {isOwner && <button type="button" onClick={handleAddContingencia} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>+ Agregar Acción</button>}
          </div>
          <div style={{ marginBottom: '32px' }}>
            {contingencias.map((acc, index) => (
              <div key={index} className="accion-card-grid" style={{ background: 'var(--surface-hover)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                   <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Descripción y Fecha</label>
                   <input type="text" placeholder="Acción (Descripción)" className="input-field" disabled={!isOwner} style={{ marginBottom: 0, height: '48px' }} value={acc.accion} onChange={e => updateContingencia(index, 'accion', e.target.value)} />
                   <div style={{ marginTop: '12px' }}>
                    <input type="date" className="input-field" disabled={!isOwner} style={{ marginBottom: 0, height: '48px' }} value={acc.fecha} onChange={e => updateContingencia(index, 'fecha', e.target.value)} />
                   </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                   <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Responsable y Estado</label>
                   <Combobox 
                     options={responsablesCargados}
                     value={acc.responsable}
                     onChange={(val) => updateContingencia(index, 'responsable', val)}
                     placeholder="Responsable..."
                     disabled={!isOwner}
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
                   <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', height: '108px', position: 'relative' }}>
                     {!acc.firma || (contingenciaRefs.current[index] && !contingenciaRefs.current[index]?.isEmpty()) ? (
                         <SignatureCanvas 
                            ref={(el) => { if (el) contingenciaRefs.current[index] = el; }} 
                            penColor="black" 
                            canvasProps={{ width: 250, height: 108, className: 'sigCanvas' }} 
                        />
                     ) : (
                         <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                             <img src={acc.firma} alt="Firma" style={{ maxHeight: '80px' }} />
                             {isOwner && (
                                 <button 
                                    type="button" 
                                    onClick={() => updateContingencia(index, 'firma', '')}
                                    style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                 >
                                     ×
                                 </button>
                             )}
                         </div>
                     )}
                   </div>
                   {isOwner && (
                       <button type="button" onClick={() => { contingenciaRefs.current[index]?.clear(); updateContingencia(index, 'firma', ''); }} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '11px', textAlign: 'right', marginTop: '4px' }}>Limpiar Firma</button>
                   )}
                </div>
              </div>
            ))}
          </div>

          {/* Piezas */}
          <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Reporte de Piezas y Adjuntos</h3>
          <div className="piezas-grid">
             <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: 600 }}>Foto de Piezas OK</label>
                {urlFotoOk ? (
                    <div style={{ marginBottom: '12px', border: '2px solid var(--primary)', borderRadius: '10px', overflow: 'hidden', minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--surface)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--primary)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', zIndex: 1 }}>ARCHIVO ADJUNTO</div>
                        <img 
                          src={urlFotoOk} 
                          alt="Piezas OK" 
                          style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} 
                        />
                        <a href={urlFotoOk} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '8px', marginBottom: '8px', textDecoration: 'underline' }}>Ver tamaño completo</a>
                    </div>
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', border: '2px dashed var(--border)', borderRadius: '10px', marginBottom: '12px' }}>
                       Sin foto adjunta (OK)
                    </div>
                )}
                {isOwner && (
                  <div>
                    <input type="file" id="fileOk" accept="image/*" style={{ display: 'none' }} onChange={e => setFotoOkFile(e.target.files?.[0] || null)} />
                    <label htmlFor="fileOk" className="btn-secondary" style={{ display: 'inline-block', cursor: 'pointer', padding: '8px 16px', fontSize: '13px' }}>
                       {urlFotoOk ? 'Cambiar Foto' : 'Subir Foto Piezas OK'}
                    </label>
                  </div>
                )}
             </div>
             <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: 600 }}>Foto de Piezas NO OK</label>
                {urlFotoNok ? (
                    <div style={{ marginBottom: '12px', border: '2px solid var(--text)', borderRadius: '10px', overflow: 'hidden', minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--surface)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--text)', color: 'var(--surface)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', zIndex: 1 }}>ARCHIVO ADJUNTO</div>
                        <img 
                          src={urlFotoNok} 
                          alt="Piezas NO OK" 
                          style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} 
                        />
                        <a href={urlFotoNok} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--text)', marginTop: '8px', marginBottom: '8px', textDecoration: 'underline' }}>Ver tamaño completo</a>
                    </div>
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', border: '2px dashed var(--border)', borderRadius: '10px', marginBottom: '12px' }}>
                       Sin foto adjunta (NO OK)
                    </div>
                )}
                {isOwner && (
                  <div>
                    <input type="file" id="fileNok" accept="image/*" style={{ display: 'none' }} onChange={e => setFotoNokFile(e.target.files?.[0] || null)} />
                    <label htmlFor="fileNok" className="btn-secondary" style={{ display: 'inline-block', cursor: 'pointer', padding: '8px 16px', fontSize: '13px' }}>
                       {urlFotoNok ? 'Cambiar Foto' : 'Subir Foto Piezas NO OK'}
                    </label>
                  </div>
                )}
             </div>
          </div>

          {/* Acción de Erradicación */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--primary)' }}>Acciones de Erradicación</h3>
            {isOwner && <button type="button" onClick={handleAddErradicacion} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>+ Agregar Acción</button>}
          </div>
          <div style={{ marginBottom: '32px' }}>
            {erradicaciones.map((acc, index) => (
              <div key={index} className="accion-card-grid" style={{ background: 'var(--surface-hover)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                   <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Descripción y Fecha</label>
                   <input type="text" placeholder="Acción (Descripción)" className="input-field" disabled={!isOwner} style={{ marginBottom: 0, height: '48px' }} value={acc.accion} onChange={e => updateErradicacion(index, 'accion', e.target.value)} />
                   <div style={{ marginTop: '12px' }}>
                    <input type="date" className="input-field" disabled={!isOwner} style={{ marginBottom: 0, height: '48px' }} value={acc.fecha} onChange={e => updateErradicacion(index, 'fecha', e.target.value)} />
                   </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                   <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Responsable y Estado</label>
                   <Combobox 
                     options={responsablesCargados}
                     value={acc.responsable}
                     onChange={(val) => updateErradicacion(index, 'responsable', val)}
                     placeholder="Responsable..."
                     disabled={!isOwner}
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
                   <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', height: '108px', position: 'relative' }}>
                     {!acc.firma || (erradicacionRefs.current[index] && !erradicacionRefs.current[index]?.isEmpty()) ? (
                        <SignatureCanvas 
                            ref={(el) => { if (el) erradicacionRefs.current[index] = el; }} 
                            penColor="black" 
                            canvasProps={{ width: 250, height: 108, className: 'sigCanvas' }} 
                        />
                     ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <img src={acc.firma} alt="Firma" style={{ maxHeight: '80px' }} />
                            {isOwner && (
                                <button 
                                    type="button" 
                                    onClick={() => updateErradicacion(index, 'firma', '')}
                                    style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                     )}
                   </div>
                   {isOwner && (
                       <button type="button" onClick={() => { erradicacionRefs.current[index]?.clear(); updateErradicacion(index, 'firma', ''); }} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '11px', textAlign: 'right', marginTop: '4px' }}>Limpiar Firma</button>
                   )}
                </div>
              </div>
            ))}
          </div>

          {(isOwner || isAuthorizedUser) && (
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '16px 32px', fontSize: '18px' }}>
                {saving ? <div className="spinner"></div> : 'Guardar Cambios'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
