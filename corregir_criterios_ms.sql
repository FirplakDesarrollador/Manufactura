-- =====================================================================
-- CORRECCIÓN de unificar_criterios_ms.sql
--
-- El primer script asumió que ms_defectos.id = número visible del defecto.
-- No es así: el número visible está en el nombre ("68. Pestaña deslaminada")
-- y el id interno puede ser otro (81). Este script:
--   1. Restaura codigo/defecto de los criterios MS desde el respaldo
--      criterios_calidad_plantas_backup_ms_20261022 y borra las tarjetas creadas.
--   2. Agrega id_defecto_ms (llave foránea a ms_defectos.id) para vincular
--      cada criterio con los registros diarios de ms_reporte_defectos.
--   3. Rehace la unificación usando el NÚMERO del nombre del defecto.
--
-- Todo va en una transacción: si alguna validación falla, no cambia nada.
-- Ejecutar UNA sola vez en el SQL Editor de Supabase.
-- =====================================================================

BEGIN;

-- 0. Validaciones previas -----------------------------------------------
DO $$
DECLARE
    sin_numero int;
    repetidos int;
    max_num int;
BEGIN
    IF to_regclass('public.criterios_calidad_plantas_backup_ms_20261022') IS NULL THEN
        RAISE EXCEPTION 'No existe el respaldo criterios_calidad_plantas_backup_ms_20261022';
    END IF;

    SELECT count(*) INTO sin_numero
    FROM ms_defectos
    WHERE (regexp_match("Defecto", '^\s*(\d+)\s*\.'))[1] IS NULL;
    IF sin_numero > 0 THEN
        RAISE EXCEPTION 'Hay % defectos en ms_defectos sin número al inicio del nombre', sin_numero;
    END IF;

    SELECT count(*) - count(DISTINCT (regexp_match("Defecto", '^\s*(\d+)\s*\.'))[1]::int), max((regexp_match("Defecto", '^\s*(\d+)\s*\.'))[1]::int)
    INTO repetidos, max_num
    FROM ms_defectos;
    IF repetidos > 0 THEN
        RAISE EXCEPTION 'Hay números de defecto repetidos en ms_defectos';
    END IF;
    IF max_num > 72 THEN
        RAISE EXCEPTION 'ms_defectos tiene números mayores a 72 (máximo %): revisar códigos 73..77 de criterios sin pareja', max_num;
    END IF;
END $$;

-- 1. Restaurar código y nombre originales; quitar tarjetas creadas -------
UPDATE criterios_calidad_plantas c
SET codigo = b.codigo,
    defecto = b.defecto
FROM criterios_calidad_plantas_backup_ms_20261022 b
WHERE c.id = b.id;

DELETE FROM criterios_calidad_plantas
WHERE planta = 'Ms'
  AND id NOT IN (SELECT id FROM criterios_calidad_plantas_backup_ms_20261022);

-- 2. Vínculo formal con el catálogo de defectos MS ----------------------
ALTER TABLE criterios_calidad_plantas
    ADD COLUMN IF NOT EXISTS id_defecto_ms bigint REFERENCES ms_defectos(id);

-- 3. Unificar por NÚMERO visible del defecto -----------------------------
--    (id de la fila en criterios → número visible del defecto en Calidad MS)
WITH ms AS (
    SELECT id,
           (regexp_match("Defecto", '^\s*(\d+)\s*\.'))[1]::int AS numero,
           trim(regexp_replace("Defecto", '^\s*\d+\s*\.\s*', '')) AS nombre
    FROM ms_defectos
)
UPDATE criterios_calidad_plantas c
SET codigo = m.num,
    defecto = ms.nombre,
    id_defecto_ms = ms.id
FROM (VALUES
    ( 1,  2), ( 2,  3), ( 3,  4), ( 4,  5), ( 5,  7), ( 6,  8), ( 7,  9), ( 8, 10),
    ( 9, 12), (10, 13), (11, 14), (12, 15), (13, 17), (14, 18), (15, 20), (16, 19),
    (17, 21), (18, 22), (19, 23), (20, 24), (21, 25), (22, 26), (23, 27), (24, 28),
    (25, 29), (26, 30), (27, 31), (28, 32), (29, 33), (30, 34), (31, 35), (32, 36),
    (33, 37), (34, 38), (35, 39), (36, 40), (37, 41), (38, 42), (39, 43), (42, 45),
    (46, 47), (47, 48), (48, 49), (49, 50), (50, 51), (51, 52), (52, 53), (53, 56),
    (54, 55), (55, 57), (56, 58), (57, 59), (58, 60), (59, 61), (60, 54), (61, 62),
    (62, 63), (63, 64), (64, 65), (65, 66)
) AS m(id, num)
JOIN ms ON ms.numero = m.num
WHERE c.id = m.id
  AND c.planta = 'Ms';

-- Criterios sin equivalente: al final con su nombre actual
-- (81 Mal acabado por detrás, 82 Pestaña delgada, 87 Escala en corte CNC,
--  88 Pestaña desnivelada, 89 Pandeada)
UPDATE criterios_calidad_plantas c
SET codigo = m.num
FROM (VALUES (40, 73), (41, 74), (43, 75), (44, 76), (45, 77)) AS m(id, num)
WHERE c.id = m.id
  AND c.planta = 'Ms';

-- Tarjetas vacías para los defectos que aún no tienen criterio
INSERT INTO criterios_calidad_plantas (planta, codigo, defecto, id_defecto_ms)
SELECT 'Ms', ms.numero, ms.nombre, ms.id
FROM (
    SELECT id,
           (regexp_match("Defecto", '^\s*(\d+)\s*\.'))[1]::int AS numero,
           trim(regexp_replace("Defecto", '^\s*\d+\s*\.\s*', '')) AS nombre
    FROM ms_defectos
) ms
WHERE NOT EXISTS (
    SELECT 1 FROM criterios_calidad_plantas c
    WHERE c.planta = 'Ms' AND c.codigo::text = ms.numero::text
)
ORDER BY ms.numero;

-- 4. Verificación: 1..77 en orden, con su id interno (vacío solo en 73..77)
SELECT codigo, defecto, id_defecto_ms, responsable
FROM criterios_calidad_plantas
WHERE planta = 'Ms'
ORDER BY codigo::int;

COMMIT;
