-- Control de Piso Semielaborados (27/11/2026): las cajas (SKU que empieza por PEMP) salen de Muebles y CEFI y tienen
-- su propio control de piso: Corte → Digitado → Tránsito → Almacén (+ Administración).
-- Las OF siguen en ordenes_fabricacion_muebles con planta = 'Semielaborados' y los registros en trazabilidad_muebles
-- (procesos Corte, Digitado, Transito y Cedi = Almacén, porque proceso es una lista fija proceso_muebles); así no se
-- pierde lo que ya estaba registrado.
-- PASO 2 de 2. ANTES ejecutar semielaborados_paso1.sql (agrega Semielaborados a la lista de plantas) en una
-- pestaña aparte; si no, el update falla con "invalid input value for enum planta_muebles". Es seguro repetirlo.

-- 0) Fechas del Semáforo (por si aún no se ejecutó muebles_control_piso_fv.sql)
alter table public.ordenes_fabricacion_muebles add column if not exists fecha_entrega_lote date;
alter table public.ordenes_fabricacion_muebles add column if not exists fecha_real_liberacion date;
alter table public.ordenes_fabricacion_muebles add column if not exists fecha_ideal_entrega_produccion date;
alter table public.ordenes_fabricacion_muebles add column if not exists fecha_prometida_entrega date;
alter table public.ordenes_fabricacion_muebles add column if not exists fechas_semaforo_actualizadas timestamptz;

-- 1) Vista previa: cuántas OF son cajas (PEMP) por planta actual
select planta, pendiente, count(*) from public.ordenes_fabricacion_muebles
 where producto_sku ilike 'PEMP%' group by planta, pendiente order by 1, 2;

-- 2) Pasar las cajas a la planta Semielaborados (la sincronización con SAP ya las clasifica así de ahora en adelante)
update public.ordenes_fabricacion_muebles set planta = 'Semielaborados'
 where producto_sku ilike 'PEMP%' and planta is distinct from 'Semielaborados';

-- 3) Vista con las unidades en cada proceso (lo que hay EN el proceso = lo registrado ahí − lo que ya pasó al siguiente)
create or replace view public.query_of_semielaborados as
select o.id, o.created_at, o.numero_pedido, o.orden_fabricacion, o.cantidad, o.pendiente, o.cliente,
       o.producto_sku, o.producto_descripcion, o.planta, o.fecha_entrega_estimada,
       o.fecha_real_liberacion, o.fecha_prometida_entrega, o.fecha_ideal_entrega_produccion,
       greatest(o.cantidad - coalesce(t.corte, 0), 0)::int as programado,
       greatest(coalesce(t.corte, 0) - coalesce(t.digitado, 0), 0)::int as corte,
       greatest(coalesce(t.digitado, 0) - coalesce(t.transito, 0), 0)::int as digitado,
       greatest(coalesce(t.transito, 0) - coalesce(t.almacen, 0), 0)::int as transito,
       coalesce(t.almacen, 0)::int as almacen,
       coalesce(t.corte, 0)::int as sum_corte,
       coalesce(t.digitado, 0)::int as sum_digitado,
       coalesce(t.transito, 0)::int as sum_transito
  from public.ordenes_fabricacion_muebles o
  left join lateral (
      select sum(x.cantidad) filter (where lower(x.proceso::text) = 'corte') as corte,
             sum(x.cantidad) filter (where lower(x.proceso::text) = 'digitado') as digitado,
             sum(x.cantidad) filter (where lower(x.proceso::text) = 'transito') as transito,
             sum(x.cantidad) filter (where lower(x.proceso::text) in ('almacen', 'cedi')) as almacen
        from public.trazabilidad_muebles x
       where x.orden_fabricacion::text = o.orden_fabricacion::text
  ) t on true
 where o.planta = 'Semielaborados';

grant select on public.query_of_semielaborados to anon, authenticated;

-- Verificación
select count(*) filter (where pendiente) as abiertas, count(*) as total from public.query_of_semielaborados;
