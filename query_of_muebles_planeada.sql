-- query_of_muebles (27/11/2026): piezas, canto (m) y RH (m²) de cada OF con la cantidad PLANEADA de los componentes.
-- Antes usaba la cantidad pendiente (planeado − consumido): cuando la OF consumía sus materiales en SAP todo quedaba
-- en 0 (Entregas hoy sin piezas/m²/m, sin pastilla "Por mueble" en las OF entregadas). La sincronización con SAP
-- (/api/sap/liberacion-muebles) ahora guarda "planeada" en cada componente; mientras una OF no se vuelva a
-- sincronizar, se usa la cantidad de antes (COALESCE). El resto de la vista queda igual.
create or replace view public.query_of_muebles as
WITH base_data AS (
         SELECT ofm.id,
            ofm.created_at,
            ofm.numero_pedido,
            ofm.orden_fabricacion,
            ofm.cantidad,
            ofm.fecha_entrega_estimada,
            ofm.pendiente,
            ofm.fecha_entrega_real,
            ofm.modificado_por,
            ofm.cliente,
            ofm.ensayo,
            ofm.producto_sku,
            ofm.producto_descripcion,
            ofm.componentes,
            ofm.planta,
            ( SELECT COALESCE(sum(COALESCE((comp.value ->> 'planeada'::text)::numeric, (comp.value ->> 'cantidad'::text)::numeric)), 0::numeric) AS "coalesce"
                   FROM jsonb_array_elements(COALESCE(ofm.componentes, '[]'::jsonb)) comp(value)
                  WHERE (comp.value ->> 'sku'::text) ~~* 'CMPD09%'::text) AS piezas_total,
            ( SELECT COALESCE(sum(COALESCE((comp.value ->> 'planeada'::text)::numeric, (comp.value ->> 'cantidad'::text)::numeric)), 0::numeric) AS "coalesce"
                   FROM jsonb_array_elements(COALESCE(ofm.componentes, '[]'::jsonb)) comp(value)
                  WHERE (comp.value ->> 'sku'::text) ~~* 'CMPD06%'::text AND (comp.value ->> 'componente'::text) ~~* '%canto%'::text) AS canto_total,
            ( SELECT COALESCE(sum(COALESCE((comp.value ->> 'planeada'::text)::numeric, (comp.value ->> 'cantidad'::text)::numeric)), 0::numeric) AS "coalesce"
                   FROM jsonb_array_elements(COALESCE(ofm.componentes, '[]'::jsonb)) comp(value)
                  WHERE (comp.value ->> 'sku'::text) ~~* 'CMPD06%'::text AND ((comp.value ->> 'componente'::text) ~~* '%rh%'::text OR (comp.value ->> 'componente'::text) ~~* '%tablero%'::text)) AS rh_total
           FROM ordenes_fabricacion_muebles ofm
        ), proceso_stats AS (
         SELECT tm.orden_fabricacion,
            sum(CASE WHEN tm.proceso = 'Corte'::proceso_muebles THEN tm.cantidad ELSE 0 END) AS corte_total,
            sum(CASE WHEN tm.proceso = 'Enchape'::proceso_muebles THEN tm.cantidad ELSE 0 END) AS enchape_total,
            sum(CASE WHEN tm.proceso = 'Inspeccion'::proceso_muebles THEN tm.cantidad ELSE 0 END) AS inspeccion_total,
            sum(CASE WHEN tm.proceso = 'Empaque'::proceso_muebles THEN tm.cantidad ELSE 0 END) AS empaque_total,
            sum(CASE WHEN tm.proceso = 'Digitado'::proceso_muebles THEN tm.cantidad ELSE 0 END) AS digitado_total,
            sum(CASE WHEN tm.proceso = 'Transito'::proceso_muebles THEN tm.cantidad ELSE 0 END) AS transito_total,
            sum(CASE WHEN tm.proceso = 'Cedi'::proceso_muebles THEN tm.cantidad ELSE 0 END) AS cedi_total
           FROM trazabilidad_muebles tm
          GROUP BY tm.orden_fabricacion
        ), reposicion_stats AS (
         SELECT rpm.orden_fabricacion,
            count(*) AS total_reposiciones,
            count(*) FILTER (WHERE rpm.estado = 'Empaque'::proceso_muebles) AS reposiciones_completadas,
            count(*) FILTER (WHERE rpm.estado <> 'Empaque'::proceso_muebles) AS reposiciones_pendientes,
            count(*) FILTER (WHERE rpm.estado = 'Corte'::proceso_muebles) AS pendientes_corte,
            count(*) FILTER (WHERE rpm.estado = 'Enchape'::proceso_muebles) AS pendientes_enchape,
            count(*) FILTER (WHERE rpm.estado = 'Inspeccion'::proceso_muebles) AS pendientes_inspeccion
           FROM reposiciones_muebles rpm
          GROUP BY rpm.orden_fabricacion
        )
 SELECT bd.id,
    bd.created_at,
    bd.numero_pedido,
    bd.orden_fabricacion,
    bd.cantidad,
    bd.fecha_entrega_estimada,
    bd.pendiente,
    bd.fecha_entrega_real,
    bd.modificado_por,
    bd.cliente,
    bd.ensayo,
    bd.producto_sku,
    bd.producto_descripcion,
    bd.componentes,
    bd.planta,
        CASE
            WHEN bd.planta = 'Cefi'::planta_muebles THEN
            CASE
                WHEN COALESCE(bd.piezas_total, 0::numeric) > 0::numeric THEN round(bd.piezas_total)::bigint
                ELSE bd.cantidad
            END - COALESCE(ps.corte_total, 0::bigint)
            ELSE bd.cantidad - COALESCE(ps.corte_total, 0::bigint)
        END AS por_cortar,
        CASE
            WHEN bd.planta = 'Cefi'::planta_muebles THEN GREATEST(0::numeric,
            CASE
                WHEN COALESCE(bd.piezas_total, 0::numeric) > 0::numeric THEN round(bd.piezas_total)
                ELSE bd.cantidad::numeric
            END - COALESCE(ps.corte_total, 0::bigint)::numeric)
            ELSE ceil(bd.piezas_total - COALESCE(ps.corte_total, 0::bigint)::numeric * bd.piezas_total / NULLIF(bd.cantidad, 0)::numeric)
        END AS piezas_pendientes,
    COALESCE(ps.corte_total, 0::bigint) - COALESCE(ps.enchape_total, 0::bigint) AS corte,
    COALESCE(ps.enchape_total, 0::bigint) - COALESCE(ps.inspeccion_total, 0::bigint) AS enchape,
    COALESCE(ps.inspeccion_total, 0::bigint) - COALESCE(ps.empaque_total, 0::bigint) AS inspeccion,
    COALESCE(ps.empaque_total, 0::bigint) - COALESCE(ps.digitado_total, 0::bigint) AS empaque,
    COALESCE(ps.digitado_total, 0::bigint) - COALESCE(ps.transito_total, 0::bigint) AS digitado,
    COALESCE(ps.transito_total, 0::bigint) - COALESCE(ps.cedi_total, 0::bigint) AS transito,
    COALESCE(ps.cedi_total, 0::bigint) AS cedi,
    COALESCE(ps.corte_total, 0::bigint) AS sum_cortados,
    COALESCE(ps.enchape_total, 0::bigint) AS sum_enchapado,
    COALESCE(ps.inspeccion_total, 0::bigint) AS sum_inspeccion,
    COALESCE(ps.empaque_total, 0::bigint) AS sum_empacado,
    COALESCE(ps.digitado_total, 0::bigint) AS sum_digitado,
    COALESCE(ps.transito_total, 0::bigint) AS sum_transito,
    round(bd.piezas_total) AS piezas,
    bd.canto_total AS canto,
    bd.rh_total AS rh_metros,
    COALESCE(rs.reposiciones_completadas, 0::bigint) AS reposiciones,
    COALESCE(rs.reposiciones_pendientes, 0::bigint) AS por_reponer,
    COALESCE(rs.pendientes_corte, 0::bigint) AS reponer_corte,
    COALESCE(rs.pendientes_enchape, 0::bigint) AS reponer_enchape,
    COALESCE(rs.pendientes_inspeccion, 0::bigint) AS reponer_inspeccion
   FROM base_data bd
     LEFT JOIN proceso_stats ps ON ps.orden_fabricacion = bd.orden_fabricacion
     LEFT JOIN reposicion_stats rs ON rs.orden_fabricacion = bd.orden_fabricacion
  ORDER BY (
        CASE
            WHEN COALESCE(rs.reposiciones_pendientes, 0::bigint) > 0 THEN 0
            ELSE 1
        END), bd.created_at DESC, bd.fecha_entrega_estimada DESC;

-- Comprobación: OF entregadas hoy en CEDI (deben mostrar piezas, canto y RH después de sincronizar con SAP)
select orden_fabricacion, cantidad, piezas, canto, rh_metros, cedi
from public.query_of_muebles
where orden_fabricacion in ('10077203', '10077182', '10076864', '10077411');
