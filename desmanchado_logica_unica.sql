-- =====================================================================
-- Desmanchado de moldes: una sola lógica (la acordada).
--
--   Si vueltas_actuales >= Vueltas_Desmanchado (y el límite es mayor que cero) se activa la salida automática.
--   Ej.: con límite 28, tanto 28 como 29 vueltas la activan.
--   La salida es cuando el molde YA CUMPLIÓ la vuelta, no mientras se pinta: al pintar (27 → 28) el molde queda
--   En uso; cuando se libera (desmolde / la pieza sale del molde, la app lo pone 'Disponible') pasa a:
--   estado = 'Por desmanchar', Estado_reparacion = 'En espera-produccion'
--   (y se abre la reparación "Desmanchado" en BD_moldes / Registro moldes, como ya lo hacía).
--   La app de Control de Piso permite 1 sola vuelta más estando Por desmanchar (con alerta) y después lo bloquea.
--
-- Cambios:
--   1. auto_desmanchado_moldes_v2: la condición pasa de "= límite" a ">= límite" y solo actúa cuando el molde
--      se libera (pasa a 'Disponible'), no cuando se está pintando ('En uso').
--      Incluye la corrección de fechas de fix_auto_desmanchado_fecha.sql. Lo demás queda igual.
--   2. Se DESACTIVA (no se borra) el trigger trg_vueltas_desmanchado, que hacía otra cosa con el mismo molde:
--      lo pasaba a "En reparacion", reiniciaba las vueltas a 0 y BORRABA el historial del molde en BD_moldes.
--      Se puede volver a activar con:  ALTER TABLE public.moldes ENABLE TRIGGER trg_vueltas_desmanchado;
--
-- No borra ni modifica datos existentes.
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

    -- Salida automática solo con límite > 0 y vueltas actuales >= límite
    IF v_umbral IS NULL
       OR v_umbral <= 0
       OR NEW.vueltas_actuales IS NULL
       OR NEW.vueltas_actuales < v_umbral THEN
        RETURN NEW;
    END IF;

    -- Solo cuando el molde ya cumplió la vuelta y se libera (pasa a Disponible).
    -- Mientras se pinta (En uso) o si está en reparación no se toca.
    IF NEW.estado::text <> 'Disponible' THEN
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
            CURRENT_DATE,
            v_fecha_esperada,
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

-- 2. Desactivar (no borrar) el trigger que hacía la otra lógica (En reparacion + vueltas a 0 + DELETE en BD_moldes)
ALTER TABLE public.moldes DISABLE TRIGGER trg_vueltas_desmanchado;
