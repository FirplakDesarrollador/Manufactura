-- =====================================================================
-- Corrige el error "column FECHA ENTRADA is of type date but expression is of type text"
-- que bloquea mover piezas (Mapa FV, Pintura…) cuando su molde llega a las vueltas de desmanchado.
--
-- Causa: en auto_desmanchado_moldes_v2 (trigger trg_auto_desmanchado_v2 de la tabla moldes),
-- el INSERT a BD_moldes mandaba las fechas como texto (CURRENT_DATE::text, v_fecha_esperada::text).
-- Único cambio: se quitan esos dos ::text. Todo lo demás queda igual.
-- No borra ni modifica ningún dato.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.auto_desmanchado_moldes_v2()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_umbral INTEGER;
    v_tiempo_desmanchado NUMERIC := 0.25;
    v_fecha_esperada DATE;
    v_id_bd BIGINT;
    v_estado_bd TEXT;
    v_defectos TEXT;
BEGIN
    v_umbral := NEW."Vueltas_Desmanchado";

    -- Se conserva la condición actual de salida.
    IF v_umbral IS NULL
       OR v_umbral <= 0
       OR NEW.vueltas_actuales <> v_umbral THEN
        RETURN NEW;
    END IF;

    -- Se conserva la prevención de reprocesos.
    IF NEW.estado::text = 'Por desmanchar' THEN
        RETURN NEW;
    END IF;

    NEW.estado := 'Por desmanchar'::public.estado_molde_type;
    NEW."Estado_reparacion" := 'En espera-produccion';

    SELECT "Tiempo"
    INTO v_tiempo_desmanchado
    FROM public."Defectos_moldes"
    WHERE "Título" ILIKE '%Desmanchado%'
    LIMIT 1;

    IF v_tiempo_desmanchado IS NULL THEN
        v_tiempo_desmanchado := 0.25;
    END IF;

    v_fecha_esperada := public.calcular_fecha_desmanchado(clock_timestamp());

    -- Se conserva la selección actual del registro.
    SELECT id, "ESTADO", "DEFECTOS A REPARAR"
    INTO v_id_bd, v_estado_bd, v_defectos
    FROM public."BD_moldes"
    WHERE "CODIGO MOLDE" = NEW.serial
    ORDER BY
        CASE WHEN "ESTADO" ILIKE '%Entregado%' THEN 1 ELSE 0 END,
        id DESC
    LIMIT 1;

    IF v_id_bd IS NOT NULL THEN
        -- Se conserva la condición actual para no duplicar.
        IF NOT (
            v_estado_bd ILIKE 'En reparaci_n'
            AND v_defectos ILIKE '%Desmanchado%'
        ) THEN
            UPDATE public."BD_moldes"
            SET "ESTADO" = 'En reparación',
                "Tipo de reparacion" = 'Rapida',

                -- Único cambio: no arrastrar defectos anteriores.
                "DEFECTOS A REPARAR" = 'Desmanchado',

                "FECHA ENTRADA" = CURRENT_DATE,
                "FECHA ESPERADA" = v_fecha_esperada,
                "Modified" = NOW(),
                "Modified By" = 'Sistema Automático'
            WHERE id = v_id_bd;
        END IF;
    ELSE
        -- Se conserva el ingreso de moldes sin registro previo.
        INSERT INTO public."BD_moldes" (
            id,
            "Título",
            "CODIGO MOLDE",
            "ESTADO",
            "DEFECTOS A REPARAR",
            "Tipo de reparacion",
            "FECHA ENTRADA",
            "FECHA ESPERADA",
            "Created",
            "Created By",
            "Modified",
            "Modified By",
            repair_event_id
        ) VALUES (
            (extract(epoch FROM now()) * 1000)::bigint,
            NEW.nombre_articulo,
            NEW.serial,
            'En reparación',
            'Desmanchado',
            'Rapida',
            CURRENT_DATE,          -- antes CURRENT_DATE::text (la columna es date)
            v_fecha_esperada,      -- antes v_fecha_esperada::text
            NOW(),
            'Sistema Automático',
            NOW(),
            'Sistema Automático',
            gen_random_uuid()
        );
    END IF;

    RETURN NEW;
END;
$function$;
