-- =====================================================================
-- FV: piezas de órdenes cerradas en SAP (no por la app)
-- Cuando la carga de órdenes liberadas ve que una OF ya no está liberada en SAP, la marca pendiente = false con
-- modificado_por = 'Sistema SAP (Cierre automático)'. Sus piezas seguían en el proceso (Pulido, Huacales,
-- Digitado…) sin la tarjeta de la orden y hacían ruido en las listas.
-- Esta función las pasa a CEDI con la fecha en que se detectó el cierre y deja el motivo en el historial
-- (movimientos_fv, origen 'sap'), que se ve en la trazabilidad de la pieza y en Administración.
-- No toca piezas en Reparación, Saldo o Destrucción (no son producto bueno).
-- La llaman los crons (cargue de órdenes liberadas y el de cada hora) y el botón de la tarjeta.
-- Se puede ejecutar varias veces. Al final hace el barrido de una vez.
-- =====================================================================

create or replace function public.fv_barrer_of_cerradas_sap()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    r record;
    movidas jsonb := '[]'::jsonb;
begin
    for r in
        select t.registrer, t.estado, t.molde_id, t.mesa_fv, o.orden_fabricacion, o.cantidad,
               coalesce(o.fecha_entrega_real, now()) as fecha_cierre, m.serial as molde_serial
          from trazabilidad_fv t
          join ordenes_fabricacion_fibra o on o.id = t.orden_fabricacion_id
          left join moldes m on m.id = t.molde_id
         where o.pendiente = false
           and o.modificado_por = 'Sistema SAP (Cierre automático)'
           and t.estado not in ('Cedi', 'Saldo', 'Destruccion', 'Reparacion', 'Reparacion_larga')
         for update of t
    loop
        update trazabilidad_fv
           set estado = 'Cedi', cedi_fecha = r.fecha_cierre, mesa_fv = null
         where registrer = r.registrer;

        -- Si la pieza aún ocupaba el molde, se libera (igual que al salir de Vaciado)
        if r.estado in ('Pintura', 'Vaciado') and r.molde_id is not null then
            update moldes set estado = 'Disponible', modificado_por = 'Sistema SAP (Cierre automático)', modified_at = now()
             where id = r.molde_id and estado = 'En uso';
        end if;

        insert into movimientos_fv (usuario_email, origen, accion, registrer, orden_fabricacion, estado_antes, estado_despues,
                                    mesa_antes, molde_id, molde_serial, detalle)
        values ('Sistema SAP', 'sap', 'cierre_sap', r.registrer, r.orden_fabricacion, r.estado, 'Cedi',
                r.mesa_fv, r.molde_id, r.molde_serial,
                jsonb_build_object('motivo', 'OF cerrada en SAP: la pieza salió del proceso y quedó en CEDI',
                                   'fecha_cierre', r.fecha_cierre, 'cantidad_of', r.cantidad));

        movidas := movidas || jsonb_build_object('of', r.orden_fabricacion, 'registrer', r.registrer, 'estado_antes', r.estado);
    end loop;
    return movidas;
end $$;

-- La pueden llamar los crons (sin sesión) y los usuarios de la app
grant execute on function public.fv_barrer_of_cerradas_sap() to anon, authenticated;

notify pgrst, 'reload schema';

-- Barrido de una vez: muestra las piezas que movió
select jsonb_array_elements(public.fv_barrer_of_cerradas_sap()) as pieza_movida;
