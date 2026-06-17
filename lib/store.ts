import { create } from 'zustand';

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

type AppState = {
    evaluacionActual: EvaluacionHoraHora | null;
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
    estadoGlobal: 'Pendiente',
    ciclos: [],
};

export const useStore = create<AppState>((set) => ({
    evaluacionActual: null,
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
                console.error('Error saving to Supabase, saving locally:', err);
                // Fallback: save only to localStorage
                const historial = JSON.parse(localStorage.getItem('historialHoraHora') || '[]');
                const maxConsecutivo = historial.reduce((max: number, item: any) => Math.max(max, item.consecutivo || 0), 0);
                finalEvaluacion.consecutivo = maxConsecutivo + 1;
                historial.push(finalEvaluacion);
                localStorage.setItem('historialHoraHora', JSON.stringify(historial));
            });
        });

        return { evaluacionActual: finalEvaluacion };
    }),
    reset: () => set({ evaluacionActual: null }),
}));
