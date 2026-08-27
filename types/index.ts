export type PlantaEnum = 'Mármol Sintético' | 'Fibra de vidrio' | 'Muebles' | 'Cefi' | string;

export type OrigenEnum = 'Saldos' | 'Destrucciones' | 'IFI' | 'Rechazos' | 'Reclamos Cliente' | string;

export type EstadoFicha = 'Abierto' | 'En Seguimiento' | 'Pendiente de Cierre' | 'Cerrado';

export interface Accion {
  accion: string;
  responsable: string;
  firma: string | null;
  fecha: string;
  cumplimiento: 'Pendiente' | 'OK' | 'NO OK' | string;
}

export interface FichaAlerta {
  id: string;
  numero_ficha?: number | string;
  user_id?: string;
  planta: PlantaEnum;
  responsable: string;
  origen: OrigenEnum;
  fecha: string;
  problema: string;
  seguimiento_entrada?: string;
  seguimiento_d1?: string;
  seguimiento_d2?: string;
  seguimiento_d3?: string;
  foto_piezas_ok?: string | null;
  foto_piezas_nok?: string | null;
  contingencias?: Accion[];
  erradicaciones?: Accion[];
  estado?: EstadoFicha | string;
  comentario_cierre?: string | null;
  cerrado_por?: string | null;
  fecha_cierre?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function getEstadoFicha(ficha: Partial<FichaAlerta>): EstadoFicha {
  // 1. Cerrado: Formalizado por Calidad / Administrador
  if (ficha.estado === 'Cerrado' || ficha.estado === 'Cerrada') {
    return 'Cerrado';
  }

  const contingencias = ficha.contingencias || [];
  const erradicaciones = ficha.erradicaciones || [];

  const erradValidas = erradicaciones.filter(e => e.accion && e.accion.trim() !== '');
  const erradOk = erradValidas.filter(e => e.cumplimiento === 'OK');

  const contValidas = contingencias.filter(c => c.accion && c.accion.trim() !== '');
  const contOk = contValidas.filter(c => c.cumplimiento === 'OK');

  // 2. Pendiente de Cierre: SOLO cuando todas las acciones de erradicación están en estado OK
  const tieneErradicaciones = erradValidas.length > 0;
  const todasErradicacionesOk = tieneErradicaciones && erradOk.length === erradValidas.length;
  const todasContingenciasOk = contValidas.length === 0 || contOk.length === contValidas.length;

  if (todasErradicacionesOk && todasContingenciasOk) {
    return 'Pendiente de Cierre';
  }

  // 3. En Seguimiento: Tiene seguimiento de días o acciones en proceso / pendientes
  const tieneEntrada = !!ficha.seguimiento_entrada && ficha.seguimiento_entrada.trim() !== '';
  const tieneD1 = !!ficha.seguimiento_d1 && ficha.seguimiento_d1.trim() !== '';
  const tieneD2 = !!ficha.seguimiento_d2 && ficha.seguimiento_d2.trim() !== '';
  const tieneD3 = !!ficha.seguimiento_d3 && ficha.seguimiento_d3.trim() !== '';

  if (tieneEntrada || tieneD1 || tieneD2 || tieneD3 || contValidas.length > 0 || erradValidas.length > 0) {
    return 'En Seguimiento';
  }

  // 4. Abierto: Ficha recién creada sin acciones ni seguimiento
  return 'Abierto';
}

export * from './muebles';
export * from './pintura';
