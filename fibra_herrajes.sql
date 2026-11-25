-- Instalación Herrajes como punto de notificación FV (entre Vaciado y Pulido)
-- Flujo: Pintura → Vaciado → [Desmolde, solo visual] → HERRAJES → Nivelación → Pulido → Ensayo …
-- Correr una sola vez en el SQL Editor de Supabase.

-- 1) Nuevo valor del estado (la lista es compartida con MS; agregar un valor no afecta a MS)
alter type trazabilidad_ms_type add value if not exists 'Herrajes' after 'Vaciado';

-- 2) Fecha y usuario del registro de Herrajes en cada pieza
alter table trazabilidad_fv
    add column if not exists herrajes_fecha timestamp without time zone,
    add column if not exists herrajes_user_id bigint references usuarios(id);

-- 3) Vista de órdenes FV: nueva columna "herrajes" (al final) y Herrajes resta de Programado.
--    Se conservan las opciones de la vista (p. ej. security_invoker) y sus permisos.
do $$
declare
    opciones text[];
begin
    select reloptions into opciones from pg_class where oid = 'public.ordenes_fabricacion_fv'::regclass;

    execute $v$
    create or replace view public.ordenes_fabricacion_fv as
    SELECT of.id,
        of.created_at,
        of.numero_pedido,
        of.orden_fabricacion,
        of.cantidad,
        of.fecha_entrega_estimada,
        of.pendiente,
        of.modificado_por,
        of.cliente,
        of.producto_sku,
        of.fecha_ideal_produccion,
        of.comentario,
        COALESCE(pr.producto_descripcion, ps."Producto_Descripcion") AS producto_descripcion,
        pr.masa AS producto_masa,
        tm.id AS molde_id,
        tm.molde_sku,
        tm.molde_descripcion,
        ( SELECT count(*) AS count FROM moldes m
          WHERE m.tipo_molde_id = tm.id AND (m.estado::text <> ALL (ARRAY['Indefinido'::text, 'Destruido'::text]))) AS moldes_totales,
        ( SELECT count(*) AS count FROM moldes m
          WHERE m.tipo_molde_id = tm.id AND m.estado::text = 'Disponible'::text) AS moldes_disponibles,
        ( SELECT count(*) AS count FROM moldes m
          WHERE m.tipo_molde_id = tm.id AND m.estado::text = 'En uso'::text) AS moldes_en_uso,
        ( SELECT count(*) AS count FROM moldes m
          WHERE m.tipo_molde_id = tm.id AND m.estado::text = 'En reparacion'::text) AS moldes_en_reparacion,
        ( SELECT count(*) AS count FROM moldes m
          WHERE m.tipo_molde_id = tm.id AND m.estado::text = 'En fabricacion'::text) AS moldes_en_fabricacion,
        sum(CASE WHEN tms.estado::text = 'Pintura'::text THEN 1 ELSE 0 END) AS pintura,
        sum(CASE WHEN tms.estado::text = 'Vaciado'::text THEN 1 ELSE 0 END) AS vaciado,
        sum(CASE WHEN tms.estado::text = 'Desgelcada'::text THEN 1 ELSE 0 END) AS desgelcada,
        sum(CASE WHEN tms.estado::text = 'Estanteria'::text THEN 1 ELSE 0 END) AS estanteria,
        sum(CASE WHEN tms.estado::text = 'Pulido'::text THEN 1 ELSE 0 END) AS pulido,
        sum(CASE WHEN tms.estado::text = 'Ensayo'::text THEN 1 ELSE 0 END) AS acabado,
        sum(CASE WHEN tms.estado::text = 'Reparacion'::text THEN 1 ELSE 0 END) AS reparacion,
        sum(CASE WHEN tms.estado::text = 'Reparacion_larga'::text THEN 1 ELSE 0 END) AS reparacion_larga,
        sum(CASE WHEN tms.estado::text = 'Saldo'::text THEN 1 ELSE 0 END) AS saldo,
        sum(CASE WHEN tms.estado::text = 'Destruccion'::text THEN 1 ELSE 0 END) AS destruccion,
        sum(CASE WHEN tms.estado::text = ANY (ARRAY['Empaque'::text, 'Guacales'::text, 'Acabado'::text]) THEN 1 ELSE 0 END) AS empaque,
        sum(CASE WHEN tms.estado::text = 'Digitado'::text THEN 1 ELSE 0 END) AS digitado,
        sum(CASE WHEN tms.estado::text = 'Transito'::text THEN 1 ELSE 0 END) AS transito,
        sum(CASE WHEN tms.estado::text = 'Cedi'::text THEN 1 ELSE 0 END) AS cedi,
        of.cantidad - sum(CASE WHEN tms.estado::text = ANY (ARRAY['Pintura'::text, 'Vaciado'::text, 'Herrajes'::text, 'Pulido'::text, 'Acabado'::text, 'Ensayo'::text, 'Reparacion'::text, 'Reparacion_larga'::text, 'Empaque'::text, 'Guacales'::text, 'Digitado'::text, 'Transito'::text, 'Cedi'::text, 'Estanteria'::text]) THEN 1 ELSE 0 END) AS programado,
        sum(CASE WHEN tms.estado::text = 'Herrajes'::text THEN 1 ELSE 0 END) AS herrajes
    FROM ordenes_fabricacion_fibra of
        LEFT JOIN productos pr ON of.producto_sku = pr.producto_sku
        LEFT JOIN "productos desde sap" ps ON of.producto_sku = ps."Producto_Sku"
        LEFT JOIN tipos_moldes tm ON COALESCE(pr.molde_sku, ps."Molde_sku") = tm.molde_sku
        LEFT JOIN trazabilidad_fv tms ON of.id = tms.orden_fabricacion_id
    WHERE of.pendiente = true AND (pr.planta = 'Fibra_de_vidrio'::plantas_type OR pr.planta IS NULL AND (of.producto_sku ~~ 'VTIN%'::text OR of.producto_sku ~~ 'VHEM%'::text OR of.producto_sku ~~ 'VHPT%'::text OR of.producto_sku ~~ 'PPRD%'::text))
    GROUP BY of.id, pr.producto_descripcion, ps."Producto_Descripcion", pr.masa, tm.id, tm.molde_sku, tm.molde_descripcion
    ORDER BY (LEAST(of.fecha_entrega_estimada, of.fecha_ideal_produccion))
    $v$;

    if opciones is not null then
        execute format('alter view public.ordenes_fabricacion_fv set (%s)', array_to_string(opciones, ', '));
    end if;
end $$;

-- 4) Vista de trazabilidad FV: fecha, usuario y nombre de quien registró Herrajes (al final)
do $$
declare
    opciones text[];
begin
    select reloptions into opciones from pg_class where oid = 'public.query_trazabilidad_fv'::regclass;

    execute $v$
    create or replace view public.query_trazabilidad_fv as
    SELECT t.orden_fabricacion_id,
        t.molde_id,
        t.pintura_user_id,
        t.pintura_linea,
        t.vaciado_fecha,
        t.vaciado_user_id,
        t.contramolde,
        t.contramolde_fecha,
        t.contramolde_user_id,
        t.pulido_fecha,
        t.pulido_user_id,
        t.enviar_reparar_molde,
        t.reparacion_fecha,
        t.reparacion_user_id,
        t.empaque_fecha,
        t.empaque_user_id,
        t.cedi_fecha,
        t.cedi_user_id,
        t.digitado_user_id,
        t.digitado_fecha,
        t.transito_fecha,
        t.transito_user_id,
        t.acabado_user_id,
        t.acabado_fecha,
        t.saldo_user_id,
        t.saldo_fecha,
        t.vaciado_linea,
        t.registrer,
        t.estado,
        t.destruccion_user_id,
        t.destruccion_fecha,
        t.estanteria_user_id,
        t.estanteria_fecha,
        t.kilos_vaciados,
        of.numero_pedido,
        of.orden_fabricacion,
        of.cantidad AS of_cantidad,
        of.fecha_entrega_estimada AS of_fecha_entrega_estimada,
        of.pendiente AS of_pendiente,
        of.producto_sku,
        COALESCE(p.producto_descripcion, ps."Producto_Descripcion") AS producto_descripcion,
        tm.tamano AS producto_tamano,
        p.color AS producto_color,
        p.flauta AS producto_flauta,
        p.planta,
        tm.molde_descripcion,
        tm.molde_sku,
        m.serial AS molde_serial,
        m.estado AS molde_estado,
        m.vueltas_actuales AS molde_vueltas_actuales,
        m.vueltas_acumuladas AS molde_vueltas_acumuladas,
        tm.vueltas_mtto AS molde_vueltas_mto,
        m.vueltas_mto_atipicas AS molde_mto_atipicas,
        m.observaciones AS molde_observaciones,
        round(p.masa * (1::numeric - p.porcentaje_reduccion / 100::numeric) - p.kilos_reduccion, 2) AS molde_masa_teorica,
        upi.nombre AS pintura_user_name,
        uva.nombre AS vaciado_user_name,
        upu.nombre AS pulido_user_name,
        uac.nombre AS acabado_user_name,
        ure.nombre AS reparacion_user_name,
        uco.nombre AS contramolde_user_name,
        uem.nombre AS empaque_user_name,
        udi.nombre AS digitado_user_name,
        utr.nombre AS transito_user_name,
        uce.nombre AS cedi_user_name,
        usa.nombre AS saldo_user_name,
        ude.nombre AS destruccion_user_name,
        t.pintura_fecha,
        t.herrajes_fecha,
        t.herrajes_user_id,
        uhe.nombre AS herrajes_user_name
    FROM trazabilidad_fv t
        LEFT JOIN ordenes_fabricacion_fibra of ON t.orden_fabricacion_id = of.id
        LEFT JOIN productos p ON of.producto_sku = p.producto_sku
        LEFT JOIN "productos desde sap" ps ON of.producto_sku = ps."Producto_Sku"
        LEFT JOIN moldes m ON t.molde_id = m.id
        LEFT JOIN tipos_moldes tm ON m.tipo_molde_id = tm.id
        LEFT JOIN usuarios upi ON t.pintura_user_id = upi.id
        LEFT JOIN usuarios uva ON t.vaciado_user_id = uva.id
        LEFT JOIN usuarios upu ON t.pulido_user_id = upu.id
        LEFT JOIN usuarios uac ON t.acabado_user_id = uac.id
        LEFT JOIN usuarios ure ON t.reparacion_user_id = ure.id
        LEFT JOIN usuarios uco ON t.contramolde_user_id = uco.id
        LEFT JOIN usuarios uem ON t.empaque_user_id = uem.id
        LEFT JOIN usuarios udi ON t.digitado_user_id = udi.id
        LEFT JOIN usuarios utr ON t.transito_user_id = utr.id
        LEFT JOIN usuarios uce ON t.cedi_user_id = uce.id
        LEFT JOIN usuarios usa ON t.saldo_user_id = usa.id
        LEFT JOIN usuarios ude ON t.destruccion_user_id = ude.id
        LEFT JOIN usuarios uhe ON t.herrajes_user_id = uhe.id
    $v$;

    if opciones is not null then
        execute format('alter view public.query_trazabilidad_fv set (%s)', array_to_string(opciones, ', '));
    end if;
end $$;

-- 5) Verificación: debe devolver 3 filas (las 2 columnas nuevas y la columna herrajes de la vista)
select table_name, column_name from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'trazabilidad_fv' and column_name in ('herrajes_fecha', 'herrajes_user_id'))
    or (table_name = 'ordenes_fabricacion_fv' and column_name = 'herrajes'));
