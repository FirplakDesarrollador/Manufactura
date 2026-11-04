'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import Header from '@/components/opt-sistemica/Header';
import { ControlVisualPreview } from '@/components/controles-visuales/ControlVisualSheet';
import { ControlVisualRotuloPreview } from '@/components/controles-visuales/ControlVisualRotulo';
import PdfMiniatura from '@/components/controles-visuales/PdfMiniatura';
import {
  CV_BASE_PATH,
  CV_BUCKET,
  CV_MAX_ARCHIVO_BYTES,
  CV_MIME_ARCHIVO,
  CV_TABLA,
  type ControlVisual,
  esImagen,
  esRotulo,
  generarCodigo,
  mensajeError,
  generarCodigos,
  leerRotulosPptx,
  rutaImprimir,
  rutaImprimirPliego,
  tamanoControl,
  PX_POR_CM,
  type TamanoCm,
  rutaPlanta,
  slugPlanta,
} from '@/lib/controles-visuales';

const btnPrimario =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#324354] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#25323f] disabled:opacity-50';
const btnSecundario =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#324354] bg-white px-4 py-2.5 text-sm font-semibold text-[#324354] hover:bg-[#F6F3EE] disabled:opacity-50';
const btnPeq =
  'inline-flex items-center justify-center rounded-lg border border-[#e2ded5] bg-white px-3 py-2 text-xs font-semibold text-[#324354] hover:bg-[#F6F3EE]';

const MIME_PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

// Miniaturas de las tarjetas, en la proporción de la hoja carta horizontal
const MINI_ANCHO = 200;
const MINI_ALTO = 155;

/** Ancho y alto en px para mostrar una hoja de cualquier tamaño dentro de la miniatura */
function miniatura({ ancho, alto }: TamanoCm) {
  const escala = Math.min(MINI_ANCHO / (ancho * PX_POR_CM), MINI_ALTO / (alto * PX_POR_CM));
  return { ancho: ancho * PX_POR_CM * escala, alto: alto * PX_POR_CM * escala };
}

type FiltroFormato = '' | 'hoja' | 'rotulo' | 'archivo';

function formatoDe(c: ControlVisual): Exclude<FiltroFormato, ''> {
  if (c.tipo === 'pdf') return 'archivo';
  return esRotulo(c) ? 'rotulo' : 'hoja';
}

export default function BibliotecaPlantaPage() {
  const router = useRouter();
  const params = useParams<{ planta: string }>();
  const planta = decodeURIComponent(params.planta || '');

  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [controles, setControles] = useState<ControlVisual[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [areaFiltro, setAreaFiltro] = useState('');
  const [formatoFiltro, setFormatoFiltro] = useState<FiltroFormato>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [archivosUrl, setArchivosUrl] = useState<Record<string, string>>({});

  // Subir controles existentes: PDF o imagen se guardan como archivo; un PowerPoint se convierte en rótulos
  const [modalAbierto, setModalAbierto] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tituloPdf, setTituloPdf] = useState('');
  const [areaPdf, setAreaPdf] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [textosPptx, setTextosPptx] = useState<{ texto: string; incluir: boolean }[] | null>(null);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from(CV_TABLA)
      .select('*')
      .eq('planta', planta)
      .eq('activo', true)
      .order('codigo');
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    const lista = (data || []) as ControlVisual[];
    setControles(lista);

    // Los archivos subidos están en un bucket privado: se previsualizan con URL firmada
    const conArchivo = lista.filter((c) => c.tipo === 'pdf' && c.pdf_path);
    if (conArchivo.length > 0) {
      const { data: firmadas } = await supabase.storage
        .from(CV_BUCKET)
        .createSignedUrls(conArchivo.map((c) => c.pdf_path as string), 60 * 60);
      const urls: Record<string, string> = {};
      (firmadas || []).forEach((f, i) => {
        if (f.signedUrl) urls[conArchivo[i].id] = f.signedUrl;
      });
      setArchivosUrl(urls);
    }
  }, [planta]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserEmail(user.email || '');
      await cargar();
      setLoading(false);
    };
    init();
  }, [router, cargar]);

  const areas = useMemo(
    () => Array.from(new Set(controles.map((c) => c.area).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'es')),
    [controles]
  );

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return controles.filter((c) => {
      if (areaFiltro && c.area !== areaFiltro) return false;
      if (formatoFiltro && formatoDe(c) !== formatoFiltro) return false;
      if (!term) return true;
      return [c.codigo, c.titulo, c.area, c.texto_principal, c.dato_destacado, c.texto_secundario]
        .filter(Boolean)
        .some((t) => (t as string).toLowerCase().includes(term));
    });
  }, [controles, busqueda, areaFiltro, formatoFiltro]);

  // Los controles creados en la app se pueden imprimir juntos; los archivos subidos se imprimen solos
  const imprimiblesVisibles = useMemo(() => filtrados.filter((c) => c.tipo === 'plantilla'), [filtrados]);

  const alternarSeleccion = (id: string) =>
    setSeleccion((prev) => {
      const nueva = new Set(prev);
      if (nueva.has(id)) nueva.delete(id);
      else nueva.add(id);
      return nueva;
    });

  // Imprime en el orden de la biblioteca
  const imprimirSeleccion = () => {
    const ids = controles.filter((c) => seleccion.has(c.id)).map((c) => c.id);
    if (ids.length > 0) window.open(rutaImprimirPliego(ids), '_blank');
  };

  const eliminar = async (c: ControlVisual) => {
    if (!window.confirm(`¿Eliminar el control ${c.codigo} de la biblioteca?`)) return;
    const { error } = await supabase
      .from(CV_TABLA)
      .update({ activo: false, actualizado_por: userEmail, updated_at: new Date().toISOString() })
      .eq('id', c.id);
    if (error) {
      toast.error(`No se pudo eliminar: ${error.message}`);
      return;
    }
    toast.success(`${c.codigo} eliminado`);
    setControles((prev) => prev.filter((x) => x.id !== c.id));
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setArchivo(null);
    setTituloPdf('');
    setAreaPdf('');
    setTextosPptx(null);
  };

  const elegirArchivo = async (f: File | null) => {
    setArchivo(f);
    setTextosPptx(null);
    if (!f) return;
    if (f.type === MIME_PPTX || /\.pptx$/i.test(f.name)) {
      try {
        const textos = await leerRotulosPptx(f);
        if (textos.length === 0) toast.error('No se encontró texto en la presentación');
        setTextosPptx(textos.map((texto) => ({ texto, incluir: true })));
      } catch {
        toast.error('No se pudo leer la presentación. Debe ser un archivo .pptx');
      }
      return;
    }
    if (!tituloPdf) setTituloPdf(f.name.replace(/\.[^.]+$/, ''));
  };

  const importarRotulos = async () => {
    const textos = (textosPptx || []).filter((t) => t.incluir).map((t) => t.texto.trim()).filter(Boolean);
    if (textos.length === 0) return toast.error('Elige al menos un rótulo para importar');

    setSubiendo(true);
    try {
      const codigos = await generarCodigos(planta, textos.length);
      const { error } = await supabase.from(CV_TABLA).insert(
        textos.map((texto, i) => ({
          codigo: codigos[i],
          planta,
          area: areaPdf.trim() || null,
          titulo: texto,
          tipo: 'plantilla',
          formato: 'rotulo',
          texto_principal: texto,
          icono: 'ninguno',
          creado_por: userEmail,
          actualizado_por: userEmail,
        }))
      );
      if (error) throw error;

      const plural = textos.length === 1 ? '' : 's';
      toast.success(`${textos.length} rótulo${plural} importado${plural} (${codigos[0]} a ${codigos[codigos.length - 1]})`);
      cerrarModal();
      await cargar();
    } catch (err: unknown) {
      toast.error(`No se pudo importar: ${mensajeError(err)}`);
    } finally {
      setSubiendo(false);
    }
  };

  const subirPdf = async () => {
    if (!archivo) return toast.error('Selecciona un archivo');
    if (!CV_MIME_ARCHIVO.includes(archivo.type)) return toast.error('El archivo debe ser PDF, imagen (PNG, JPG, WEBP) o PowerPoint (.pptx)');
    if (archivo.size > CV_MAX_ARCHIVO_BYTES) return toast.error('El archivo supera 20 MB');
    if (!tituloPdf.trim()) return toast.error('Escribe un título para encontrarlo después');

    setSubiendo(true);
    try {
      const extension = archivo.name.split('.').pop()?.toLowerCase() || 'pdf';
      const ruta = `${slugPlanta(planta)}/${crypto.randomUUID()}.${extension}`;
      const { error: errSubida } = await supabase.storage
        .from(CV_BUCKET)
        .upload(ruta, archivo, { contentType: archivo.type, upsert: false });
      if (errSubida) throw errSubida;

      const codigo = await generarCodigo(planta);
      const { error: errInsert } = await supabase.from(CV_TABLA).insert({
        codigo,
        planta,
        area: areaPdf.trim() || null,
        titulo: tituloPdf.trim(),
        tipo: 'pdf',
        pdf_path: ruta,
        // Los PDF no lo envían, así siguen funcionando aunque falte la columna
        ...(archivo.type === 'application/pdf' ? {} : { archivo_mime: archivo.type }),
        creado_por: userEmail,
        actualizado_por: userEmail,
      });
      if (errInsert) throw errInsert;

      toast.success(`Archivo guardado como ${codigo}`);
      cerrarModal();
      await cargar();
    } catch (err: unknown) {
      toast.error(`No se pudo subir: ${mensajeError(err)}`);
    } finally {
      setSubiendo(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324354]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
      <Header
        title="Controles Visuales"
        subtitle={planta}
        userEmail={userEmail}
        showLogout={true}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
      />

      <main className="flex-1 flex justify-center p-4 md:p-10 w-full">
        <div className="w-full max-w-[1200px] space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link href={CV_BASE_PATH} className="text-sm text-[#324354] underline-offset-4 hover:underline">
                ← Todas las plantas
              </Link>
              <h1 className="mt-2 text-3xl font-light uppercase tracking-wider text-[#324354]">{planta}</h1>
              <p className="text-sm text-slate-500">
                {controles.length} control{controles.length === 1 ? '' : 'es'} en la biblioteca
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={btnSecundario} onClick={() => setModalAbierto(true)}>
                Subir existentes
              </button>
              <Link href={`${rutaPlanta(planta)}/editor`} className={btnPrimario}>
                + Nuevo control
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              aria-label="Buscar control"
              placeholder="Buscar por código, texto o área..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="min-w-[240px] flex-1 rounded-xl border border-[#e2ded5] bg-white px-4 py-2.5 text-sm text-[#324354] outline-none focus:border-[#324354]"
            />
            <select
              aria-label="Filtrar por área"
              value={areaFiltro}
              onChange={(e) => setAreaFiltro(e.target.value)}
              className="rounded-xl border border-[#e2ded5] bg-white px-4 py-2.5 text-sm text-[#324354] outline-none focus:border-[#324354]"
            >
              <option value="">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              aria-label="Filtrar por formato"
              value={formatoFiltro}
              onChange={(e) => setFormatoFiltro(e.target.value as FiltroFormato)}
              className="rounded-xl border border-[#e2ded5] bg-white px-4 py-2.5 text-sm text-[#324354] outline-none focus:border-[#324354]"
            >
              <option value="">Todos los formatos</option>
              <option value="hoja">Hojas carta</option>
              <option value="rotulo">Rótulos pequeños</option>
              <option value="archivo">Archivos subidos</option>
            </select>
          </div>

          {imprimiblesVisibles.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e2ded5] bg-white px-4 py-3 text-sm text-[#324354]">
              <span>
                {seleccion.size === 0
                  ? 'Marca varios controles para imprimirlos juntos y ahorrar papel'
                  : `${seleccion.size} control${seleccion.size === 1 ? '' : 'es'} seleccionado${seleccion.size === 1 ? '' : 's'}`}
              </span>
              <button type="button" className={btnPeq} onClick={() => setSeleccion(new Set(imprimiblesVisibles.map((c) => c.id)))}>
                Seleccionar los {imprimiblesVisibles.length}
              </button>
              {seleccion.size > 0 && (
                <>
                  <button type="button" className={btnPeq} onClick={() => setSeleccion(new Set())}>
                    Quitar selección
                  </button>
                  <button type="button" className={btnPrimario} onClick={imprimirSeleccion}>
                    Imprimir {seleccion.size} en la misma hoja
                  </button>
                </>
              )}
            </div>
          )}

          {errorMsg && (
            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
              {errorMsg}. Si es la primera vez, ejecuta el archivo controles_visuales.sql en Supabase.
            </p>
          )}

          {filtrados.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#d6d1c6] bg-white p-10 text-center">
              <p className="font-medium text-[#324354]">
                {controles.length === 0 ? 'Esta planta aún no tiene controles visuales.' : 'Ningún control coincide con la búsqueda.'}
              </p>
              {controles.length === 0 && (
                <p className="mt-2 text-sm text-slate-500">Crea uno nuevo o sube los que ya tengas (PDF, imagen o PowerPoint).</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filtrados.map((c) => (
                <article key={c.id} className="flex flex-col overflow-hidden rounded-2xl border border-[#e2ded5] bg-white">
                  <div className="relative flex justify-center bg-[#F6F3EE] p-3">
                    {c.tipo === 'plantilla' && (
                      <label className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-[#324354]">
                        <input type="checkbox" checked={seleccion.has(c.id)} onChange={() => alternarSeleccion(c.id)} />
                        Imprimir
                      </label>
                    )}
                    {esRotulo(c) ? (
                      <div className="flex items-center justify-center" style={{ width: MINI_ANCHO, height: MINI_ALTO }}>
                        <ControlVisualRotuloPreview
                          ancho={MINI_ANCHO}
                          texto={c.texto_principal}
                          anchoCm={tamanoControl(c).ancho}
                          altoCm={tamanoControl(c).alto}
                        />
                      </div>
                    ) : c.tipo === 'plantilla' ? (
                      <div className="flex items-center justify-center" style={{ width: MINI_ANCHO, height: MINI_ALTO }}>
                        <ControlVisualPreview
                          {...miniatura(tamanoControl(c))}
                          textoPrincipal={c.texto_principal}
                          datoDestacado={c.dato_destacado}
                          textoSecundario={c.texto_secundario}
                          icono={c.icono}
                          area={c.area}
                          codigo={c.codigo}
                        />
                      </div>
                    ) : (
                      // Archivo subido: clic para abrirlo completo
                      <a href={rutaImprimir(c.id)} target="_blank" rel="noopener noreferrer" title="Abrir archivo completo">
                        {!archivosUrl[c.id] ? (
                          <PdfMiniatura url="" ancho={MINI_ANCHO} alto={MINI_ALTO} />
                        ) : esImagen(c) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={archivosUrl[c.id]} alt={c.titulo} className="bg-white object-contain" style={{ width: MINI_ANCHO, height: MINI_ALTO }} />
                        ) : (
                          <PdfMiniatura url={archivosUrl[c.id]} ancho={MINI_ANCHO} alto={MINI_ALTO} />
                        )}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold tracking-widest text-[#324354]">{c.codigo}</span>
                      <span className="text-xs text-slate-500">
                        {{ hoja: 'Hoja', rotulo: 'Rótulo', archivo: esImagen(c) ? 'Imagen' : 'PDF' }[formatoDe(c)]}
                        {c.tipo === 'plantilla' && ` ${tamanoControl(c).ancho} x ${tamanoControl(c).alto} cm`} · v{c.version}
                      </span>
                    </div>
                    <h2 className="text-sm font-semibold text-black">{c.titulo}</h2>
                    <p className="text-xs text-slate-600">{c.area || 'Sin área'}</p>
                    <p className="text-xs text-slate-500">
                      Actualizado {new Date(c.updated_at).toLocaleDateString('es-CO')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={rutaImprimir(c.id)} target="_blank" rel="noopener noreferrer" className={btnPeq}>
                        Imprimir
                      </a>
                      {c.tipo === 'plantilla' && (
                        <Link href={`${rutaPlanta(planta)}/editor?id=${c.id}`} className={btnPeq}>
                          Editar
                        </Link>
                      )}
                      <button type="button" onClick={() => eliminar(c)} className={`${btnPeq} text-red-700`}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-subir">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6">
            <h2 id="titulo-subir" className="text-lg font-semibold text-[#324354]">Subir controles existentes a {planta}</h2>
            <div className="space-y-1">
              <label htmlFor="cv-archivo" className="text-sm font-medium text-[#324354]">Archivo (máx. 20 MB)</label>
              <input
                id="cv-archivo"
                type="file"
                accept={[...CV_MIME_ARCHIVO, MIME_PPTX, '.pptx'].join(',')}
                onChange={(e) => elegirArchivo(e.target.files?.[0] || null)}
                className="block w-full text-sm"
              />
              <p className="text-xs text-slate-500">
                PDF o imagen: se guarda tal cual. PowerPoint (.pptx): cada recuadro de texto se vuelve un rótulo pequeño editable.
              </p>
            </div>
            {textosPptx ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#324354]">
                    Rótulos encontrados ({textosPptx.filter((t) => t.incluir).length} de {textosPptx.length})
                  </span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#324354] underline"
                    onClick={() => {
                      const todos = textosPptx.every((t) => t.incluir);
                      setTextosPptx(textosPptx.map((t) => ({ ...t, incluir: !todos })));
                    }}
                  >
                    {textosPptx.every((t) => t.incluir) ? 'Quitar todos' : 'Marcar todos'}
                  </button>
                </div>
                <ul className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-[#e2ded5] p-2">
                  {textosPptx.map((t, i) => (
                    <li key={i}>
                      <label className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-[#F6F3EE]">
                        <input
                          type="checkbox"
                          checked={t.incluir}
                          onChange={() => setTextosPptx(textosPptx.map((x, j) => (j === i ? { ...x, incluir: !x.incluir } : x)))}
                        />
                        <span className="font-semibold uppercase">{t.texto}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="space-y-1">
                <label htmlFor="cv-titulo" className="text-sm font-medium text-[#324354]">Título</label>
                <input
                  id="cv-titulo"
                  type="text"
                  value={tituloPdf}
                  onChange={(e) => setTituloPdf(e.target.value)}
                  placeholder="Ej. Pasar pieza 200 gr"
                  className="w-full rounded-xl border border-[#e2ded5] px-3 py-2 text-sm outline-none focus:border-[#324354]"
                />
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="cv-area-pdf" className="text-sm font-medium text-[#324354]">Área o puesto</label>
              <input
                id="cv-area-pdf"
                type="text"
                list="cv-areas"
                value={areaPdf}
                onChange={(e) => setAreaPdf(e.target.value)}
                placeholder="Ej. Vaciado"
                className="w-full rounded-xl border border-[#e2ded5] px-3 py-2 text-sm outline-none focus:border-[#324354]"
              />
              <datalist id="cv-areas">
                {areas.map((a) => <option key={a} value={a} />)}
              </datalist>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className={btnSecundario} onClick={cerrarModal} disabled={subiendo}>
                Cancelar
              </button>
              <button type="button" className={btnPrimario} onClick={textosPptx ? importarRotulos : subirPdf} disabled={subiendo}>
                {subiendo ? 'Guardando...' : textosPptx ? 'Importar rótulos' : 'Guardar archivo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
