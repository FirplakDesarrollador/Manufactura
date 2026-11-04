-- =====================================================================
-- Fotos base para los criterios de calidad MS
--
-- Llena los criterios que NO tienen fotos con hasta 5 fotos tomadas del registro
-- diario de MS (ms_reporte_defectos.fotoUrl). Los criterios que ya tienen fotos
-- no se modifican. Las fotos no se duplican: se enlaza la misma URL pública.
--
-- Elección por defecto:
--   1. Registros donde ese defecto es el ÚNICO reportado.
--   2. Los más recientes.
--   3. Una foto por referencia de producto (variedad); luego completa hasta 5.
-- Se excluyen los registros de Saldos / Destrucciones (usan ids de otro catálogo).
--
-- Requisitos: criterios_fotos.sql (columna fotos) y corregir_criterios_ms.sql (id_defecto_ms).
-- Ejecutar en el SQL Editor de Supabase. Se puede volver a correr: solo toca criterios sin fotos.
-- =====================================================================

BEGIN;

-- Respaldo de las fotos actuales de los criterios MS
CREATE TABLE IF NOT EXISTS criterios_calidad_plantas_backup_fotos_20261024 AS
SELECT id, codigo, foto, fotos FROM criterios_calidad_plantas WHERE planta = 'Ms';

WITH rep AS (
    -- Ids de defecto de cada registro con foto (funciona con json[], jsonb o texto)
    SELECT r.id,
           r.created_at,
           r.producto_id,
           r."fotoUrl" AS url,
           ARRAY(
               SELECT DISTINCT (m)[1]::int
               FROM regexp_matches(r.defecto::text, 'id[\\"]*\s*:\s*(\d+)', 'g') AS m
           ) AS ids
    FROM ms_reporte_defectos r
    WHERE r."fotoUrl" IS NOT NULL
      AND r."fotoUrl" <> ''
      AND r.created_at > '2025-09-17'
      AND r.defecto::text NOT ILIKE '%Saldo -%'
      AND r.defecto::text NOT ILIKE '%Destrucci%'
),
cand AS (
    SELECT unnest(ids) AS defecto_id, url, created_at, producto_id, cardinality(ids) AS n_defectos
    FROM rep
    WHERE cardinality(ids) > 0
),
por_producto AS (
    SELECT *,
           row_number() OVER (PARTITION BY defecto_id, producto_id ORDER BY n_defectos, created_at DESC) AS rn_producto
    FROM cand
),
ranked AS (
    SELECT *,
           row_number() OVER (
               PARTITION BY defecto_id
               ORDER BY (rn_producto > 1), n_defectos, created_at DESC
           ) AS rn
    FROM por_producto
),
top5 AS (
    SELECT defecto_id, array_agg(url ORDER BY rn) AS fotos
    FROM ranked
    WHERE rn <= 5
    GROUP BY defecto_id
)
UPDATE criterios_calidad_plantas c
SET fotos = t.fotos,
    foto  = t.fotos[1]
FROM top5 t
WHERE c.planta = 'Ms'
  AND c.id_defecto_ms = t.defecto_id
  AND COALESCE(cardinality(c.fotos), 0) = 0
  AND COALESCE(c.foto, '') = '';

-- Verificación: fotos por criterio
SELECT codigo, defecto, COALESCE(cardinality(fotos), 0) AS fotos
FROM criterios_calidad_plantas
WHERE planta = 'Ms'
ORDER BY codigo::int;

COMMIT;
