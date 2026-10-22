-- =====================================================================
-- Unificar criterios de calidad MS con el catálogo de defectos de Calidad MS
--
-- Fuente oficial: ms_defectos (ids 1..72, la lista que usa /calidad/ms).
-- Destino:        criterios_calidad_plantas (planta = 'Ms', /calidad/criterios).
--
-- - 61 criterios toman el código y el nombre de ms_defectos, conservando
--   foto, responsable, detectarlo, evitarlo y los criterios rojo/naranja/amarillo/verde.
-- - 5 criterios sin equivalente (antiguos 81, 82, 87, 88, 89) quedan al final como 73..77.
-- - Se crean tarjetas vacías para los defectos de ms_defectos que no tenían criterio.
--
-- Ejecutar en el SQL Editor de Supabase. Todo va en una transacción y antes
-- se guarda un respaldo en criterios_calidad_plantas_backup_ms_20261022.
-- =====================================================================

BEGIN;

-- 0. Respaldo de los criterios MS actuales
CREATE TABLE IF NOT EXISTS criterios_calidad_plantas_backup_ms_20261022 AS
SELECT * FROM criterios_calidad_plantas WHERE planta = 'Ms';

-- 1. Renumerar y renombrar con ms_defectos
--    (id de la fila en criterios → id del defecto en ms_defectos)
UPDATE criterios_calidad_plantas c
SET codigo  = m.cod,
    defecto = COALESCE(
        (SELECT trim(regexp_replace(d."Defecto", '^\s*\d+\.\s*', ''))
           FROM ms_defectos d
          WHERE d.id = m.cod),
        c.defecto)
FROM (VALUES
    ( 1,  2), ( 2,  3), ( 3,  4), ( 4,  5), ( 5,  7), ( 6,  8), ( 7,  9), ( 8, 10),
    ( 9, 12), (10, 13), (11, 14), (12, 15), (13, 17), (14, 18), (15, 20), (16, 19),
    (17, 21), (18, 22), (19, 23), (20, 24), (21, 25), (22, 26), (23, 27), (24, 28),
    (25, 29), (26, 30), (27, 31), (28, 32), (29, 33), (30, 34), (31, 35), (32, 36),
    (33, 37), (34, 38), (35, 39), (36, 40), (37, 41), (38, 42), (39, 43), (42, 45),
    (46, 47), (47, 48), (48, 49), (49, 50), (50, 51), (51, 52), (52, 53), (53, 56),
    (54, 55), (55, 57), (56, 58), (57, 59), (58, 60), (59, 61), (60, 54), (61, 62),
    (62, 63), (63, 64), (64, 65), (65, 66)
) AS m(id, cod)
WHERE c.id = m.id
  AND c.planta = 'Ms';

-- 2. Criterios sin equivalente en ms_defectos: se conservan al final con su nombre actual
--    (81 Mal acabado por detrás, 82 Pestaña delgada, 87 Escala en corte CNC,
--     88 Pestaña desnivelada, 89 Pandeada)
UPDATE criterios_calidad_plantas c
SET codigo = m.cod
FROM (VALUES (40, 73), (41, 74), (43, 75), (44, 76), (45, 77)) AS m(id, cod)
WHERE c.id = m.id
  AND c.planta = 'Ms';

-- 3. Tarjetas vacías para los defectos de ms_defectos que aún no tienen criterio
--    (1 Opaco, 6, 11, 16, 44, 46, 67, 68, 69, 70, 71, 72)
INSERT INTO criterios_calidad_plantas (planta, codigo, defecto)
SELECT 'Ms', d.id, trim(regexp_replace(d."Defecto", '^\s*\d+\.\s*', ''))
FROM ms_defectos d
WHERE NOT EXISTS (
    SELECT 1 FROM criterios_calidad_plantas c
    WHERE c.planta = 'Ms' AND c.codigo::text = d.id::text
)
ORDER BY d.id;

-- 4. Verificación: debe listar 1..72 seguidos de 73..77, sin códigos repetidos
SELECT codigo, defecto, responsable
FROM criterios_calidad_plantas
WHERE planta = 'Ms'
ORDER BY codigo::int;

SELECT codigo, count(*) AS repetidos
FROM criterios_calidad_plantas
WHERE planta = 'Ms'
GROUP BY codigo
HAVING count(*) > 1;

COMMIT;

-- Para revertir (si fuera necesario):
-- BEGIN;
-- DELETE FROM criterios_calidad_plantas WHERE planta = 'Ms';
-- INSERT INTO criterios_calidad_plantas SELECT * FROM criterios_calidad_plantas_backup_ms_20261022;
-- COMMIT;
