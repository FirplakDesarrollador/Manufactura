-- Tiempo real de ejecución de las órdenes de mantenimiento (minutos), obligatorio al cerrarlas desde la app.
alter table public.mantenimiento_ordenes add column if not exists tiempo_ejecucion_min integer;
comment on column public.mantenimiento_ordenes.tiempo_ejecucion_min is 'Minutos reales que tomó la ejecución (se pide al cerrar la orden)';
