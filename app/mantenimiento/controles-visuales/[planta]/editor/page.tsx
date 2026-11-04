'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import Header from '@/components/opt-sistemica/Header';
import { ControlVisualPreview } from '@/components/controles-visuales/ControlVisualSheet';
import { ControlVisualRotuloPreview } from '@/components/controles-visuales/ControlVisualRotulo';
import {
  CV_TABLA,
  ICONOS,
  type ControlVisual,
  type FormatoControl,
  type IconoControl,
  PX_POR_CM,
  TAMANO_DEFECTO,
  TAMANO_MAXIMO,
  TAMANOS_PREDEFINIDOS,
  type TamanoCm,
  generarCodigo,
  mensajeError,
  mismoTamano,
  rutaImprimir,
  rutaPlanta,
  tamanoControl,
} from '@/lib/controles-visuales';

const TAMANO_MINIMO = 2;

const campo =
  'w-full rounded-xl border border-[#e2ded5] bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-[#324354]';
const etiqueta = 'text-sm font-medium text-[#324354]';
const btnPrimario =
  'inline-flex items-center justify-center rounded-xl bg-[#324354] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#25323f] disabled:opacity-50';
const btnSecundario =
  'inline-flex items-center justify-center rounded-xl border border-[#324354] bg-white px-4 py-2.5 text-sm font-semibold text-[#324354] hover:bg-[#F6F3EE] disabled:opacity-50';

function Spinner() {
  return (
    <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324354]"></div>
    </div>
  );
}

function EditorControl() {
  const router = useRouter();
  const params = useParams<{ planta: string }>();
  const searchParams = useSearchParams();
  const planta = decodeURIComponent(params.planta || '');
  const idEditar = searchParams.get('id');

  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [original, setOriginal] = useState<ControlVisual | null>(null);
  const [areasExistentes, setAreasExistentes] = useState<string[]>([]);
  const [anchoPreview, setAnchoPreview] = useState(640);

  const [area, setArea] = useState('');
  const [textoPrincipal, setTextoPrincipal] = useState('');
  const [datoDestacado, setDatoDestacado] = useState('');
  const [textoSecundario, setTextoSecundario] = useState('');
  const [icono, setIcono] = useState<IconoControl>('ninguno');
  const [formato, setFormato] = useState<FormatoControl>(searchParams.get('formato') === 'rotulo' ? 'rotulo' : 'hoja');
  const rotulo = formato === 'rotulo';
  // Se guardan como texto para poder escribir libremente (ej. "11," mientras se teclea)
  const [anchoTxt, setAnchoTxt] = useState(String(TAMANO_DEFECTO[formato].ancho));
  const [altoTxt, setAltoTxt] = useState(String(TAMANO_DEFECTO[formato].alto));
  const tamano: TamanoCm = {
    ancho: parseFloat(anchoTxt.replace(',', '.')) || 0,
    alto: parseFloat(altoTxt.replace(',', '.')) || 0,
  };

  const ponerTamano = (t: TamanoCm) => {
    setAnchoTxt(String(t.ancho));
    setAltoTxt(String(t.alto));
  };

  const cambiarFormato = (f: FormatoControl) => {
    setFormato(f);
    ponerTamano(TAMANO_DEFECTO[f]);
  };

  useEffect(() => {
    const ajustar = () => setAnchoPreview(Math.min(640, window.innerWidth - 48));
    ajustar();
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserEmail(user.email || '');

      const { data: areasData } = await supabase.from(CV_TABLA).select('area').eq('planta', planta).eq('activo', true);
      setAreasExistentes(
        Array.from(new Set((areasData || []).map((r: { area: string | null }) => r.area).filter(Boolean) as string[]))
      );

      if (idEditar) {
        const { data, error } = await supabase.from(CV_TABLA).select('*').eq('id', idEditar).single();
        if (error || !data) {
          toast.error('No se encontró el control a editar');
        } else {
          const c = data as ControlVisual;
          setOriginal(c);
          setArea(c.area || '');
          setTextoPrincipal(c.texto_principal || '');
          setDatoDestacado(c.dato_destacado || '');
          setTextoSecundario(c.texto_secundario || '');
          setIcono((c.icono as IconoControl) || 'ninguno');
          setFormato(c.formato === 'rotulo' ? 'rotulo' : 'hoja');
          ponerTamano(tamanoControl(c));
        }
      }
      setLoading(false);
    };
    init();
  }, [router, planta, idEditar]);

  const titulo = useMemo(
    () => rotulo ? textoPrincipal.trim() : [textoPrincipal, datoDestacado].map((t) => t.trim()).filter(Boolean).join(' ') || textoSecundario.trim().slice(0, 60),
    [rotulo, textoPrincipal, datoDestacado, textoSecundario]
  );

  const guardar = async (imprimirDespues: boolean) => {
    if (rotulo ? !textoPrincipal.trim() : !textoPrincipal.trim() && !datoDestacado.trim()) {
      toast.error(rotulo ? 'Escribe el texto del rótulo' : 'Escribe al menos el texto principal o el dato destacado');
      return;
    }
    const esDefecto = mismoTamano(tamano, TAMANO_DEFECTO[formato]);
    if (
      !esDefecto &&
      (tamano.ancho < TAMANO_MINIMO || tamano.alto < TAMANO_MINIMO || tamano.ancho > TAMANO_MAXIMO.ancho || tamano.alto > TAMANO_MAXIMO.alto)
    ) {
      toast.error(`El tamaño debe estar entre ${TAMANO_MINIMO} y ${TAMANO_MAXIMO.ancho} cm de ancho y ${TAMANO_MAXIMO.alto} cm de alto`);
      return;
    }
    // Abrir la pestaña antes de esperar a Supabase para que el navegador no la bloquee
    const ventana = imprimirDespues ? window.open('', '_blank') : null;

    setGuardando(true);
    try {
      const datos = {
        area: area.trim() || null,
        titulo,
        texto_principal: textoPrincipal.trim() || null,
        dato_destacado: rotulo ? null : datoDestacado.trim() || null,
        texto_secundario: rotulo ? null : textoSecundario.trim() || null,
        icono: rotulo ? 'ninguno' : icono,
        // El tamaño por defecto se guarda vacío; así los controles sin tamaño propio se siguen
        // guardando aunque aún no exista la columna (solo se envía si hay que cambiarla)
        ...(!esDefecto
          ? { ancho_cm: tamano.ancho, alto_cm: tamano.alto }
          : original && original.ancho_cm != null
            ? { ancho_cm: null, alto_cm: null }
            : {}),
        actualizado_por: userEmail,
        updated_at: new Date().toISOString(),
      };

      let id: string;
      if (original) {
        const { error } = await supabase
          .from(CV_TABLA)
          .update({ ...datos, version: original.version + 1 })
          .eq('id', original.id);
        if (error) throw error;
        id = original.id;
        toast.success(`${original.codigo} actualizado (versión ${original.version + 1})`);
      } else {
        const codigo = await generarCodigo(planta);
        const { data, error } = await supabase
          .from(CV_TABLA)
          .insert({ ...datos, ...(rotulo ? { formato: 'rotulo' } : {}), codigo, planta, tipo: 'plantilla', creado_por: userEmail })
          .select('id')
          .single();
        if (error || !data) throw error || new Error('Sin respuesta al guardar');
        id = data.id as string;
        toast.success(`Control guardado como ${codigo}`);
      }

      if (ventana) ventana.location.href = rutaImprimir(id);
      router.push(rutaPlanta(planta));
    } catch (err: unknown) {
      ventana?.close();
      toast.error(`No se pudo guardar: ${mensajeError(err)}`);
      setGuardando(false);
    }
  };

  // Mientras se escribe un tamaño inválido, la vista previa usa el último razonable
  const tamanoVista =
    tamano.ancho >= TAMANO_MINIMO && tamano.alto >= TAMANO_MINIMO && tamano.ancho <= 30 && tamano.alto <= 30
      ? tamano
      : TAMANO_DEFECTO[formato];
  // Tamaño real si cabe en pantalla; si no, reducido al ancho disponible
  const escalaVista = Math.min(1, anchoPreview / (tamanoVista.ancho * PX_POR_CM));

  if (loading) return <Spinner />;

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
      <Header
        title="Controles Visuales"
        subtitle={original ? `Editar ${original.codigo}` : `Nuevo control · ${planta}`}
        userEmail={userEmail}
        showLogout={true}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
      />

      <main className="flex-1 flex justify-center p-4 md:p-10 w-full">
        <div className="w-full max-w-[1200px] space-y-6">
          <div>
            <Link href={rutaPlanta(planta)} className="text-sm text-[#324354] underline-offset-4 hover:underline">
              ← Volver a {planta}
            </Link>
            <h1 className="mt-2 text-3xl font-light uppercase tracking-wider text-[#324354]">
              {original ? `Editar ${original.codigo}` : 'Nuevo control visual'}
            </h1>
          </div>

          <div className="flex flex-wrap gap-8">
            <form
              className="flex min-w-[280px] flex-[1_1_320px] flex-col gap-4 rounded-2xl border border-[#e2ded5] bg-white p-6"
              onSubmit={(e) => {
                e.preventDefault();
                guardar(false);
              }}
            >
              {!original && (
                <fieldset className="space-y-2">
                  <legend className={etiqueta}>Formato</legend>
                  <div className="flex flex-wrap gap-2">
                    {([['hoja', 'Hoja con logo'], ['rotulo', 'Rótulo (recuadro con texto)']] as [FormatoControl, string][]).map(([valor, texto]) => (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => cambiarFormato(valor)}
                        aria-pressed={formato === valor}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                          formato === valor ? 'border-[#324354] bg-[#324354] text-white' : 'border-[#e2ded5] bg-white text-[#324354]'
                        }`}
                      >
                        {texto}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              <fieldset className="space-y-2">
                <legend className={etiqueta}>Tamaño del recuadro</legend>
                <div className="flex flex-wrap gap-2">
                  {TAMANOS_PREDEFINIDOS[formato].map((p) => (
                    <button
                      key={p.nombre}
                      type="button"
                      onClick={() => ponerTamano(p.tamano)}
                      aria-pressed={mismoTamano(tamano, p.tamano)}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                        mismoTamano(tamano, p.tamano) ? 'border-[#324354] bg-[#324354] text-white' : 'border-[#e2ded5] bg-white text-[#324354]'
                      }`}
                    >
                      {p.nombre} · {p.tamano.ancho} x {p.tamano.alto} cm
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-[#324354]">
                  <label htmlFor="cv-ancho">Ancho</label>
                  <input
                    id="cv-ancho"
                    inputMode="decimal"
                    className={`${campo} w-20`}
                    value={anchoTxt}
                    onChange={(e) => setAnchoTxt(e.target.value)}
                  />
                  <label htmlFor="cv-alto">x Alto</label>
                  <input
                    id="cv-alto"
                    inputMode="decimal"
                    className={`${campo} w-20`}
                    value={altoTxt}
                    onChange={(e) => setAltoTxt(e.target.value)}
                  />
                  <span>cm</span>
                </div>
                <p className="text-xs text-slate-500">
                  {rotulo
                    ? 'La letra se ajusta sola al recuadro; siempre es Montserrat en negrilla.'
                    : 'Todo el diseño se escala junto: el logo y la letra conservan sus proporciones.'}{' '}
                  Los controles más pequeños que una carta se imprimen varios por hoja.
                </p>
              </fieldset>

              <div className="space-y-1">
                <label htmlFor="cv-area" className={etiqueta}>Área o puesto</label>
                <input id="cv-area" list="cv-areas-editor" className={campo} value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ej. Vaciado" />
                <datalist id="cv-areas-editor">
                  {areasExistentes.map((a) => <option key={a} value={a} />)}
                </datalist>
              </div>

              <div className="space-y-1">
                <label htmlFor="cv-principal" className={etiqueta}>{rotulo ? 'Texto del rótulo' : 'Texto principal'}</label>
                <input
                  id="cv-principal"
                  className={campo}
                  value={textoPrincipal}
                  onChange={(e) => setTextoPrincipal(e.target.value)}
                  placeholder={rotulo ? 'Ej. 2 ¾ IN - SUCCIÓN' : 'Ej. PASAR PIEZA'}
                  maxLength={rotulo ? 50 : 60}
                />
              </div>

              {!rotulo && (
                <>
                <div className="space-y-1">
                  <label htmlFor="cv-destacado" className={etiqueta}>Dato destacado (se ve más grande)</label>
                  <input id="cv-destacado" className={campo} value={datoDestacado} onChange={(e) => setDatoDestacado(e.target.value)} placeholder="Ej. 200 GR" maxLength={24} />
                </div>

                <div className="space-y-1">
                  <label htmlFor="cv-secundario" className={etiqueta}>Texto secundario</label>
                  <textarea
                    id="cv-secundario"
                    className={`${campo} min-h-[90px]`}
                    value={textoSecundario}
                    onChange={(e) => setTextoSecundario(e.target.value)}
                    placeholder="Ej. ANTES DE QUE SE CUMPLA EL PESO ESTÁNDAR"
                    maxLength={160}
                  />
                  <p className="text-xs text-slate-500">Usa Enter para partir la línea donde quieras.</p>
                </div>

                <fieldset className="space-y-2">
                  <legend className={etiqueta}>Ícono</legend>
                  <div className="flex flex-wrap gap-2">
                    {ICONOS.map((i) => (
                      <button
                        key={i.value}
                        type="button"
                        onClick={() => setIcono(i.value)}
                        aria-pressed={icono === i.value}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                          icono === i.value ? 'border-[#324354] bg-[#324354] text-white' : 'border-[#e2ded5] bg-white text-[#324354]'
                        }`}
                      >
                        {i.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                </>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button type="submit" className={btnPrimario} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" className={btnSecundario} disabled={guardando} onClick={() => guardar(true)}>
                  Guardar e imprimir
                </button>
              </div>
            </form>

            <section className="flex flex-[1_1_480px] flex-col items-center gap-3" aria-label="Vista previa">
              <p className="self-start text-xs font-semibold uppercase tracking-widest text-slate-500">
                Vista previa · {rotulo ? 'rótulo' : 'hoja'} {tamanoVista.ancho} x {tamanoVista.alto} cm
                {escalaVista < 1 && ` (reducida al ${Math.round(escalaVista * 100)} %)`}
              </p>
              {rotulo ? (
                <ControlVisualRotuloPreview ancho={anchoPreview} texto={textoPrincipal} anchoCm={tamanoVista.ancho} altoCm={tamanoVista.alto} />
              ) : (
                <ControlVisualPreview
                  ancho={tamanoVista.ancho * PX_POR_CM * escalaVista}
                  alto={tamanoVista.alto * PX_POR_CM * escalaVista}
                  textoPrincipal={textoPrincipal}
                  datoDestacado={datoDestacado}
                  textoSecundario={textoSecundario}
                  icono={icono}
                  area={area}
                  codigo={original?.codigo || 'CV-NUEVO'}
                />
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function EditorControlPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <EditorControl />
    </Suspense>
  );
}
