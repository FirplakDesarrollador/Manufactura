-- Velocidad del Control de Piso Muebles / CEFI / Semielaborados (27/11/2026).
-- Las vistas query_of_muebles, query_of_semielaborados y metricas_turno_dia_muebles suman la tabla trazabilidad_muebles
-- por OF y por fecha; sin índices la recorren completa en cada consulta (los indicadores del día no alcanzan a
-- responder). Estos índices no cambian ningún dato. Es seguro ejecutarlo varias veces.

create index if not exists trazabilidad_muebles_of_idx on public.trazabilidad_muebles (orden_fabricacion);
create index if not exists trazabilidad_muebles_created_idx on public.trazabilidad_muebles (created_at);
create index if not exists trazabilidad_muebles_proceso_created_idx on public.trazabilidad_muebles (proceso, created_at);
create index if not exists ordenes_fabricacion_muebles_planta_pend_idx on public.ordenes_fabricacion_muebles (planta, pendiente);
create index if not exists ordenes_fabricacion_muebles_of_idx on public.ordenes_fabricacion_muebles (orden_fabricacion);

analyze public.trazabilidad_muebles;
analyze public.ordenes_fabricacion_muebles;

-- Para revisar después (copie el resultado y envíelo): cómo está hecha la vista de indicadores del día
select pg_get_viewdef('public.metricas_turno_dia_muebles'::regclass, true) as definicion_metricas;
