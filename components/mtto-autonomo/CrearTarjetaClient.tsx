"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { supabaseTalentoHumano as supabaseTH } from '@/lib/supabase_talento_humano';
import SearchableSelect from './SearchableSelect';
import { v4 as uuidv4 } from 'uuid';

export default function CrearTarjetaClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    planta_proceso: '',
    maquina: '',
    responsable: '',
    tipo_aviso: 'seguridad',
    prioridad: 'B',
    fecha_apertura: new Date().toISOString().split('T')[0],
    detectada_por: '',
    descripcion_que: '',
    descripcion_como: '',
    descripcion_donde: '',
    observaciones: '',
    fecha_cierre: '',
    cerrada_por: '',
    estado: 'abierta'
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPriorityGuide, setShowPriorityGuide] = useState(false);

  // Seeds for Selects
  const [plantas, setPlantas] = useState<string[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      // Fetch available plants from the dedicated primary table
      const { data: pData } = await supabaseTH.from('plantas').select('planta').order('planta');
      if (pData && pData.length > 0) {
        setPlantas(pData.map(p => p.planta));
      } else {
        setPlantas(["Marmol Sintetico", "Bañeras", "Ensamble", "Extrusión"]);
      }

      // Fetch employees from TH database
      const { data: eData } = await supabaseTH.from('empleados').select('nombreCompleto').eq('activo', true).order('nombreCompleto');
      if (eData) {
        setEmpleados(eData.map(e => ({ nombre: e.nombreCompleto })));
      }
    }
    fetchData();

    // Get current user email for "detectada_por" - but now it will be a searchable select too
    if (typeof window !== 'undefined') {
       const email = localStorage.getItem('userEmail') || '';
       // Optionally, find the employee with this email if needed, but for now we'll just let them pick
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).slice(0, 2); // Limit to 2
      setSelectedFiles(filesArray);
      
      // Generate previews
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviews(newPreviews);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let uploadedUrls: string[] = [];

      // Upload Photos if any
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${uuidv4()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('tarjetas-falla')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('tarjetas-falla')
            .getPublicUrl(filePath);
          
          if (urlData) uploadedUrls.push(urlData.publicUrl);
        }
      }

      // Conditional validation for closure
      if (formData.estado === 'cerrada') {
        if (!formData.cerrada_por || !formData.fecha_cierre) {
          alert('❌ Para cerrar la tarjeta debe indicar quién la cerró y la fecha de cierre.');
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('tarjetas_falla_anomalia')
        .insert([{
          ...formData,
          fotos: uploadedUrls,
          fecha_cierre: formData.fecha_cierre || null,
          cerrada_por: formData.cerrada_por || null
        }]);

      if (error) throw error;

      alert('✅ Tarjeta creada correctamente');
      router.push('/tarjetas-falla');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert('❌ Error al crear tarjeta: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '92%', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header with Logo and Icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#F1F5F9', padding: '12px', borderRadius: '14px', color: '#1B2B41' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
              <path d="M227.31,73.37,182.63,28.69a16,16,0,0,0-22.63,0L135.37,53.31a16,16,0,0,0,0,22.63L148,88.58,110.6,126l-11.31-11.31a16,16,0,0,0-22.63,0L32,159.37a16,16,0,0,0,0,22.63l44.68,44.68a16,16,0,0,0,22.63,0l44.69-44.69a16,16,0,0,0,0-22.63l-11.31-11.31L170,110.6l12.63,12.63a16,16,0,0,0,22.63,0l24.68-24.68A16,16,0,0,0,227.31,73.37ZM132,170.69,87.31,215.37,42.63,170.69,87.31,126Zm84-84-24.68,24.68L170,89.31l24.69-24.68,21.31,21.31Z"></path>
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1B2B41', margin: 0, fontFamily: "'Inter', sans-serif" }}>Registro de Falla</h2>
            <p style={{ color: '#64748B', fontSize: '0.95rem', margin: 0, fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>Complete los detalles técnicos de la anomalía</p>
          </div>
        </div>
        <img src="/logo_2.png" alt="Firplak Logo" style={{ height: '45px', objectFit: 'contain' }} />
      </div>

      {/* Basic Info Section */}
      <div className="form-card-premium" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
        
        <div className="input-group-premium">
          <SearchableSelect 
             label="Planta de Proceso *"
             options={plantas.map(p => ({ label: p, id: p }))}
             value={formData.planta_proceso}
             onChange={(val) => setFormData(prev => ({ ...prev, planta_proceso: val }))}
             placeholder="Seleccionar planta..."
          />
        </div>

        <div className="input-group-premium">
          <label className="label-premium">Máquina / Equipo</label>
          <input 
            type="text" 
            name="maquina"
            className="input-premium"
            value={formData.maquina}
            onChange={handleChange}
            placeholder="Nombre de la máquina"
          />
        </div>

        <div className="input-group-premium">
          <SearchableSelect 
             label="Responsable"
             options={empleados.map(e => ({ label: e.nombre, id: e.nombre }))}
             value={formData.responsable}
             onChange={(val) => setFormData(prev => ({ ...prev, responsable: val }))}
             placeholder="Seleccionar responsable..."
          />
        </div>


        <div className="input-group-premium">
          <label className="label-premium">Tipo de Aviso *</label>
          <select 
            name="tipo_aviso"
            className={`select-premium tipo-aviso-${formData.tipo_aviso}`}
            value={formData.tipo_aviso}
            onChange={handleChange}
            required
            style={{
              backgroundColor: formData.tipo_aviso === 'seguridad' ? '#FEF2F2' : 
                               formData.tipo_aviso === 'mantenimiento_autonomo' ? '#EFF6FF' :
                               formData.tipo_aviso === 'mantenimiento_planeado' ? '#FEFCE8' : '#F8FAFC',
              color: formData.tipo_aviso === 'seguridad' ? '#DC2626' : 
                     formData.tipo_aviso === 'mantenimiento_autonomo' ? '#2563EB' :
                     formData.tipo_aviso === 'mantenimiento_planeado' ? '#CA8A04' : '#1B2B41',
              fontWeight: 700,
              border: `1px solid ${
                formData.tipo_aviso === 'seguridad' ? '#FEE2E2' : 
                formData.tipo_aviso === 'mantenimiento_autonomo' ? '#DBEAFE' :
                formData.tipo_aviso === 'mantenimiento_planeado' ? '#FEF9C3' : '#E2E8F0'
              }`
            }}
          >
            <option value="seguridad" style={{ backgroundColor: 'white', color: '#DC2626' }}>Seguridad</option>
            <option value="mantenimiento_planeado" style={{ backgroundColor: 'white', color: '#CA8A04' }}>Mantenimiento Planeado</option>
            <option value="mantenimiento_autonomo" style={{ backgroundColor: 'white', color: '#2563EB' }}>Mantenimiento Autónomo</option>
            <option value="otros" style={{ backgroundColor: 'white', color: '#1B2B41' }}>Otros</option>
          </select>
        </div>

        <div className="input-group-premium">
          <label className="label-premium">Estado de la Tarjeta *</label>
          <select 
            name="estado"
            className="select-premium"
            value={formData.estado}
            onChange={handleChange}
            required
            style={{
              backgroundColor: formData.estado === 'abierta' ? '#FEF2F2' : 
                               formData.estado === 'en_proceso' ? '#FFFBEB' : 
                               formData.estado === 'cerrada' ? '#F0FDF4' : '#F8FAFC',
              color: formData.estado === 'abierta' ? '#DC2626' : 
                     formData.estado === 'en_proceso' ? '#D97706' : 
                     formData.estado === 'cerrada' ? '#16A34A' : '#1B2B41',
              fontWeight: 700
            }}
          >
            <option value="abierta">Abierta</option>
            <option value="en_proceso">En Proceso</option>
            <option value="cerrada">Cerrada</option>
          </select>
        </div>

        <div 
          className="input-group-premium"
          onMouseEnter={() => setShowPriorityGuide(true)}
          onMouseLeave={() => setShowPriorityGuide(false)}
          onFocus={() => setShowPriorityGuide(true)}
          onBlur={() => setShowPriorityGuide(false)}
          style={{ position: 'relative' }}
        >
          <label className="label-premium">Prioridad *</label>
          <select 
            name="prioridad"
            className="select-premium"
            value={formData.prioridad}
            onChange={handleChange}
            required
          >
            <option value="A">Prioridad A (8 días)</option>
            <option value="B">Prioridad B (30 días)</option>
            <option value="C">Prioridad C (60 días)</option>
          </select>
          
          <div style={{ 
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px', 
            padding: '12px 16px', 
            backgroundColor: '#F0F9FF', 
            borderRadius: '12px', 
            border: '1px solid #BAE6FD',
            fontSize: '0.8rem',
            color: '#0369A1',
            lineHeight: '1.4',
            fontFamily: "'Inter', sans-serif",
            zIndex: 100,
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            opacity: showPriorityGuide ? 1 : 0,
            visibility: showPriorityGuide ? 'visible' : 'hidden',
            transform: showPriorityGuide ? 'translateY(0)' : 'translateY(-10px)',
            transition: 'all 0.2s ease-in-out'
          }}>
            <strong style={{ display: 'block', marginBottom: '6px', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
              Guía de Selección:
            </strong>
            {formData.prioridad === 'A' && (
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                <li>Cualquier condición insegura.</li>
                <li>Problema que atenta contra la calidad del producto.</li>
                <li>Problema que atenta contra el funcionamiento inmediato de la máquina.</li>
              </ul>
            )}
            {formData.prioridad === 'B' && (
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                <li>Problema que atenta contra el funcionamiento del equipo, pero puede esperar.</li>
                <li>Demarcaciones de área.</li>
              </ul>
            )}
            {formData.prioridad === 'C' && (
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                <li>Pintura / Óxido.</li>
                <li>Problemas estéticos.</li>
              </ul>
            )}
          </div>
        </div>

        <div className="input-group-premium">
          <label className="label-premium">Fecha de Apertura *</label>
          <input 
            type="date" 
            name="fecha_apertura"
            className="input-premium"
            value={formData.fecha_apertura}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group-premium">
          <SearchableSelect 
             label="Detectada Por"
             options={empleados.map(e => ({ label: e.nombre, id: e.nombre }))}
             value={formData.detectada_por}
             onChange={(val) => setFormData(prev => ({ ...prev, detectada_por: val }))}
             placeholder="Seleccionar quien detectó..."
          />
        </div>
      </div>

      {/* Description Section */}
      <div className="form-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="input-group-premium">
          <label className="label-premium">¿QUÉ SE ENCONTRÓ? *</label>
          <textarea 
            name="descripcion_que"
            className="textarea-premium"
            value={formData.descripcion_que}
            onChange={handleChange}
            placeholder="Tornillos, tuercas, puerta, tapa, motor..."
            rows={4}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="input-group-premium">
            <label className="label-premium">¿CÓMO LO ENCONTRÓ?</label>
            <textarea 
              name="descripcion_como"
              className="textarea-premium"
              value={formData.descripcion_como}
              onChange={handleChange}
              placeholder="Roto, oxidado, desajustado, golpeado, despintado..."
              rows={3}
            />
          </div>
          <div className="input-group-premium">
            <label className="label-premium">¿DONDE LO ENCONTRÓ?</label>
            <textarea 
              name="descripcion_donde"
              className="textarea-premium"
              value={formData.descripcion_donde}
              onChange={handleChange}
              placeholder="Ubicación exacta del sitio del problema"
              rows={3}
            />
          </div>
        </div>

        <div className="input-group-premium">
          <label className="label-premium">Observaciones Adicionales</label>
          <textarea 
            name="observaciones"
            className="textarea-premium"
            value={formData.observaciones}
            onChange={handleChange}
            placeholder="Notas extra..."
            rows={2}
          />
        </div>

        {/* Photos Upload Section */}
        <div className="input-group-premium">
          <label className="label-premium">Anexar Fotos (1-2)</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="photo-upload"
              />
              <label 
                htmlFor="photo-upload"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: '#F1F5F9',
                  color: '#1B2B41',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  border: '1px dashed #CBD5E1'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M208,56H168V48a16,16,0,0,0-16-16H104A16,16,0,0,0,88,48v8H48A16,16,0,0,0,32,72V200a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V72A16,16,0,0,0,208,56Zm0,144H48V72H208V200ZM128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152Z"></path>
                </svg>
                {selectedFiles.length > 0 ? `${selectedFiles.length} fotos seleccionadas` : 'Subir Fotos'}
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {previews.map((src, i) => (
                <img 
                  key={i} 
                  src={src} 
                  alt={`Preview ${i}`} 
                  onClick={() => setPreviewImage(src)}
                  style={{ 
                    width: '50px', 
                    height: '50px', 
                    borderRadius: '8px', 
                    objectFit: 'cover', 
                    border: '1px solid #E2E8F0',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }} 
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Closure Information Section */}
      <div className="form-card-premium">
        <h3 style={{ fontSize: '1.1rem', color: '#1B2B41', fontWeight: 800, marginBottom: '1.5rem', fontFamily: "'Inter', sans-serif" }}>
          Información de Cierre
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          <div className="input-group-premium">
            <SearchableSelect 
               label={`Cerrada Por ${formData.estado === 'cerrada' ? '*' : ''}`}
               options={empleados.map(e => ({ label: e.nombre, id: e.nombre }))}
               value={formData.cerrada_por}
               onChange={(val) => setFormData(prev => ({ ...prev, cerrada_por: val }))}
               placeholder="Seleccionar quien cerró..."
            />
          </div>

          <div className="input-group-premium">
            <label className="label-premium">Fecha de Cierre {formData.estado === 'cerrada' ? '*' : ''}</label>
            <input 
              type="date" 
              name="fecha_cierre"
              className="input-premium"
              value={formData.fecha_cierre}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', marginBottom: '4rem' }}>
        <button 
          type="button" 
          onClick={() => router.back()}
          className="secondary-button-premium"
          disabled={loading}
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          className="submit-button-premium"
          disabled={loading}
          style={{ padding: '14px 40px', fontSize: '1rem' }}
        >
          {loading ? 'Guardando...' : 'Crear Tarjeta'}
        </button>
      </div>
      
      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          `}</style>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img 
              src={previewImage} 
              alt="Full Preview" 
              style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} 
            />
            <button 
              onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0px',
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '2rem',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .form-card-premium {
          background: white;
          padding: 2.5rem;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }
        .input-group-premium {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .label-premium {
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .input-premium, .select-premium, .textarea-premium {
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          font-size: 0.9rem;
          color: #1b2b41;
          font-weight: 700;
          background-color: #f8fafc;
          transition: all 0.2s;
          outline: none;
          font-family: 'Inter', sans-serif;
        }
        .input-premium::placeholder, .textarea-premium::placeholder {
          color: #94a3b8;
          font-weight: 400;
          font-family: 'Inter', sans-serif;
        }
        .input-premium:focus, .select-premium:focus, .textarea-premium:focus {
          border-color: #1a445b;
          background-color: white;
          box-shadow: 0 0 0 4px rgba(26,68,91,0.1);
        }
        .textarea-premium {
          resize: none;
        }
        .submit-button-premium {
          background-color: #1a445b;
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(26,68,91,0.25);
        }
        .submit-button-premium:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(26,68,91,0.3);
          background-color: #15364a;
        }
        .secondary-button-premium {
          background-color: white;
          color: #64748b;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 24px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .secondary-button-premium:hover:not(:disabled) {
          background-color: #f8fafc;
          border-color: #cbd5e1;
        }
      `}</style>
    </form>
  );
}
