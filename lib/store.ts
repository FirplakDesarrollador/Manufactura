import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

export type CicloMedido = {
    id: string;
    numero: number;
    timestampInicio: number;
    timestampFin: number;
    duracion: number; // in seconds
    valido: boolean;
    causaInvalido?: string;
};

export type EvaluacionHoraHora = {
    id: string;
    consecutivo: number;
    fecha: string;
    turno: string;
    planta: string;
    linea: string;
    puesto: string;
    supervisor: string;
    operario: string;
    creadoPor: string; // nombre del usuario que registró
    creadoPorEmail: string; // email del usuario que registró
    realizadoPor: string; // persona que realiza la evaluación
    compromiso: string; // compromiso / retroalimentación
    tiempoCicloTeorico: number; // seconds per piece
    tiempoInicio: number;
    tiempoFin: number | null;
    tiempoTotal: number;
    ciclosTotales: number;
    tiempoPromedio: number;
    piezasTeoricas: number;
    piezasReales: number;
    rendimiento: number;
    piezasTotalesCalidad: number;
    piezasBuenas: number;
    piezasDefectuosas: number;
    calidad: number;
    hdtCumple: boolean | null;
    hdtComentario: string;
    desperdicios: string[];
    comentarioGeneral: string;
    firmaOperario: string;
    estadoGlobal: 'Verde' | 'Amarillo' | 'Rojo' | 'Pendiente';
    ciclos: CicloMedido[];
};

// Cronómetro del paso Tiempos: se guarda con el borrador para que una recarga no lo pierda
export type Cronometro = { isRunning: boolean; startTime: number | null; elapsed: number };
const CRONOMETRO_INICIAL: Cronometro = { isRunning: false, startTime: null, elapsed: 0 };

export type ResultadoGuardado =
    | { ok: true; consecutivo: number | null }
    | { ok: false; error: string; copiaLocal: boolean };

// Copia de respaldo en el equipo de los registros que NO llegaron a la base (Historial → Subir)
export function guardarPendienteLocal(ev: EvaluacionHoraHora): boolean {
    try {
        const historial: EvaluacionHoraHora[] = JSON.parse(localStorage.getItem('historialHoraHora') || '[]');
        const resto = historial.filter(h => h?.id !== ev.id);
        localStorage.setItem('historialHoraHora', JSON.stringify([...resto, ev]));
        return true;
    } catch (e) {
        console.error('No se pudo guardar la copia local del Hora a Hora:', e);
        return false;
    }
}

const conLimite = <T,>(p: Promise<T>, ms: number) => new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('La base de datos no respondió a tiempo (revise la conexión a internet)')), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
});

// Si el navegador está lleno aun después de limpiar, el formulario lo avisa (borradorSinEspacio)
export let borradorSinEspacio = false;
let limpiando = false;
let ultimoPendiente: [string, string] | null = null;

// localStorage que no rompe la app si está lleno o bloqueado
const almacenamientoSeguro: StateStorage = {
    getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    setItem: (k, v) => {
        try { localStorage.setItem(k, v); borradorSinEspacio = false; return; } catch { /* lleno: se intenta liberar */ }
        ultimoPendiente = [k, v];
        if (limpiando) return;
        limpiando = true;
        // Libera las copias viejas que ya están en la base y reintenta con el valor más reciente
        import('@/lib/db/horaHora').then(m => m.limpiarCopiasSubidas()).catch(() => 0).then(() => {
            limpiando = false;
            if (!ultimoPendiente) return;
            const [kk, vv] = ultimoPendiente;
            ultimoPendiente = null;
            try { localStorage.setItem(kk, vv); borradorSinEspacio = false; }
            catch {
                if (!borradorSinEspacio) console.warn('Hora a Hora: el almacenamiento del navegador está lleno; el borrador no se puede guardar en este equipo.');
                borradorSinEspacio = true;
            }
        });
    },
    removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* sin acceso */ } },
};

type AppState = {
    evaluacionActual: EvaluacionHoraHora | null;
    paso: number;
    setPaso: (paso: number) => void;
    cronometro: Cronometro;
    setCronometro: (c: Partial<Cronometro>) => void;
    guardarEvaluacion: () => Promise<ResultadoGuardado>;
    iniciarEvaluacion: (datosBasicos: Partial<EvaluacionHoraHora>) => void;
    actualizarEvaluacion: (datos: Partial<EvaluacionHoraHora>) => void;
    agregarCiclo: (ciclo: CicloMedido) => void;
    marcarCicloInvalido: (id: string, causa: string) => void;
    cerrarEvaluacion: () => void;
    reset: () => void;
};

const initialState: Partial<EvaluacionHoraHora> = {
    consecutivo: 0,
    tiempoInicio: 0,
    tiempoFin: null,
    tiempoTotal: 0,
    ciclosTotales: 0,
    tiempoPromedio: 0,
    piezasTeoricas: 0,
    piezasReales: 0,
    rendimiento: 0,
    piezasTotalesCalidad: 0,
    piezasBuenas: 0,
    piezasDefectuosas: 0,
    calidad: 0,
    hdtCumple: null,
    hdtComentario: '',
    desperdicios: [],
    comentarioGeneral: '',
    firmaOperario: '',
    creadoPor: '',
    creadoPorEmail: '',
    realizadoPor: '',
    compromiso: '',
    estadoGlobal: 'Pendiente',
    ciclos: [],
};

export const useStore = create<AppState>()(persist((set, get) => ({
    evaluacionActual: null,
    paso: 0,
    setPaso: (paso) => set({ paso }),
    cronometro: CRONOMETRO_INICIAL,
    setCronometro: (c) => set((state) => ({ cronometro: { ...state.cronometro, ...c } })),
    iniciarEvaluacion: (datosBasicos) => set((state) => {
        return {
            evaluacionActual: {
                id: crypto.randomUUID(),
                ...initialState,
                ...datosBasicos,
                fecha: new Date().toISOString().split('T')[0],
                tiempoInicio: Date.now(),
            } as EvaluacionHoraHora
        };
    }),
    actualizarEvaluacion: (datos) => set((state) => {
        if (!state.evaluacionActual) return state;

        // Auto-calculate piezas defectuosas and calidad if updating quality
        let updatedQuality = { ...datos };
        if (datos.piezasTotalesCalidad !== undefined && datos.piezasBuenas !== undefined) {
            const def = (datos.piezasTotalesCalidad || 0) - (datos.piezasBuenas || 0);
            const cal = datos.piezasTotalesCalidad && datos.piezasTotalesCalidad > 0 ? ((datos.piezasBuenas || 0) / datos.piezasTotalesCalidad) * 100 : 0;
            updatedQuality = {
                ...datos,
                piezasDefectuosas: def > 0 ? def : 0,
                calidad: cal,
            };
        }

        return {
            evaluacionActual: {
                ...state.evaluacionActual,
                ...updatedQuality,
            }
        };
    }),
    agregarCiclo: (ciclo) => set((state) => {
        if (!state.evaluacionActual) return state;
        const nuevosCiclos = [...state.evaluacionActual.ciclos, ciclo];
        const ciclosValidos = nuevosCiclos.filter(c => c.valido);

        const tiempoTotalMedido = ciclosValidos.reduce((acc, curr) => acc + curr.duracion, 0);
        const piezasReales = ciclosValidos.length;
        const tiempoPromedio = piezasReales > 0 ? tiempoTotalMedido / piezasReales : 0;
        const piezasTeoricas = state.evaluacionActual.tiempoCicloTeorico ? tiempoTotalMedido / state.evaluacionActual.tiempoCicloTeorico : 0;
        const rendimiento = piezasTeoricas > 0 ? (piezasReales / piezasTeoricas) * 100 : 0;

        return {
            evaluacionActual: {
                ...state.evaluacionActual,
                ciclos: nuevosCiclos,
                ciclosTotales: ciclosValidos.length,
                tiempoTotal: tiempoTotalMedido,
                tiempoPromedio,
                piezasTeoricas,
                piezasReales,
                rendimiento,
            }
        };
    }),
    marcarCicloInvalido: (id, causa) => set((state) => {
        if (!state.evaluacionActual) return state;
        const nuevosCiclos = state.evaluacionActual.ciclos.map(c =>
            c.id === id ? { ...c, valido: false, causaInvalido: causa } : c
        );
        const ciclosValidos = nuevosCiclos.filter(c => c.valido);

        const tiempoTotalMedido = ciclosValidos.reduce((acc, curr) => acc + curr.duracion, 0);
        const piezasReales = ciclosValidos.length;
        const tiempoPromedio = piezasReales > 0 ? tiempoTotalMedido / piezasReales : 0;
        const piezasTeoricas = state.evaluacionActual.tiempoCicloTeorico ? tiempoTotalMedido / state.evaluacionActual.tiempoCicloTeorico : 0;
        const rendimiento = piezasTeoricas > 0 ? (piezasReales / piezasTeoricas) * 100 : 0;

        return {
            evaluacionActual: {
                ...state.evaluacionActual,
                ciclos: nuevosCiclos,
                ciclosTotales: ciclosValidos.length,
                tiempoTotal: tiempoTotalMedido,
                tiempoPromedio,
                piezasTeoricas,
                piezasReales,
                rendimiento,
            }
        };
    }),
    // Guarda en la base y ESPERA la respuesta. Si falla, la evaluación sigue en pantalla para reintentar
    // y queda una copia en el equipo (Historial → Subir). El id es fijo: un reintento no duplica el registro.
    guardarEvaluacion: async () => {
        const actual = get().evaluacionActual;
        if (!actual) return { ok: false, error: 'No hay evaluación en curso', copiaLocal: false };
        const { rendimiento, calidad, hdtCumple } = actual;
        let estadoGlobal: 'Verde' | 'Amarillo' | 'Rojo' = 'Verde';
        if (rendimiento < 80 || calidad < 80 || !hdtCumple) estadoGlobal = 'Rojo';
        else if (rendimiento < 90 || calidad < 90) estadoGlobal = 'Amarillo';
        const final: EvaluacionHoraHora = { ...actual, tiempoFin: Date.now(), estadoGlobal };
        set({ evaluacionActual: final });
        try {
            const { insertEvaluacion } = await import('@/lib/db/horaHora');
            const consecutivo = await conLimite(insertEvaluacion(final), 25000);
            return { ok: true, consecutivo: consecutivo ?? null };
        } catch (err: any) {
            // Ya estaba guardado (un intento anterior sí llegó aunque no respondió a tiempo)
            if (err?.code === '23505') return { ok: true, consecutivo: null };
            const error = err?.message || err?.details || String(err);
            console.error('Error guardando Hora a Hora:', error);
            return { ok: false, error, copiaLocal: guardarPendienteLocal(final) };
        }
    },
    cerrarEvaluacion: () => set((state) => {
        if (!state.evaluacionActual) return state;

        const { rendimiento, calidad, hdtCumple } = state.evaluacionActual;
        let estadoGlobal: 'Verde' | 'Amarillo' | 'Rojo' = 'Verde';

        if (rendimiento < 80 || calidad < 80 || !hdtCumple) {
            estadoGlobal = 'Rojo';
        } else if (rendimiento < 90 || calidad < 90) {
            estadoGlobal = 'Amarillo';
        }

        const finalEvaluacion = {
            ...state.evaluacionActual,
            tiempoFin: Date.now(),
            estadoGlobal
        };

        // Save to Supabase (async, fire-and-forget with localStorage backup)
        import('@/lib/db/horaHora').then(({ insertEvaluacion }) => {
            insertEvaluacion(finalEvaluacion).then((consecutivo) => {
                // Update consecutivo from DB serial
                finalEvaluacion.consecutivo = consecutivo;
                // Also keep localStorage as backup
                const historial = JSON.parse(localStorage.getItem('historialHoraHora') || '[]');
                historial.push(finalEvaluacion);
                localStorage.setItem('historialHoraHora', JSON.stringify(historial));
            }).catch((err) => {
                console.error('Error saving to Supabase, saving locally:', err?.message || err?.details || err);
                // Fallback: save only to localStorage
                const historial = JSON.parse(localStorage.getItem('historialHoraHora') || '[]');
                const maxConsecutivo = historial.reduce((max: number, item: any) => Math.max(max, item.consecutivo || 0), 0);
                finalEvaluacion.consecutivo = maxConsecutivo + 1;
                historial.push(finalEvaluacion);
                localStorage.setItem('historialHoraHora', JSON.stringify(historial));
                alert(`NO se pudo guardar el Hora a Hora en la base de datos (${err?.message || err?.details || err}).\n\nQuedó guardado SOLO en este equipo. Abra Historial en este mismo equipo, con internet, y use el botón "Subir" de la fila marcada en ámbar.`);
            });
        });

        return { evaluacionActual: finalEvaluacion };
    }),
    reset: () => set({ evaluacionActual: null, paso: 0, cronometro: CRONOMETRO_INICIAL }),
}), {
    // Borrador en el equipo: si se recarga la página, se cierra el navegador o se va a otra pantalla, no se pierde lo registrado
    name: 'horaHoraBorrador',
    storage: createJSONStorage(() => almacenamientoSeguro),
    partialize: (s) => ({ evaluacionActual: s.evaluacionActual, paso: s.paso, cronometro: s.cronometro }),
    skipHydration: true,
}));
