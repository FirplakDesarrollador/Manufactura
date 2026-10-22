-- =====================================================================
-- Criterios de calidad: permitir hasta 5 fotos por defecto
--
-- Agrega la columna `fotos` (arreglo de URLs) a criterios_calidad_plantas y la
-- llena con la foto actual. La columna `foto` se mantiene como foto principal
-- (la app la actualiza con la primera de `fotos`) para no romper las vistas existentes.
--
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- =====================================================================

ALTER TABLE criterios_calidad_plantas
    ADD COLUMN IF NOT EXISTS fotos text[] NOT NULL DEFAULT '{}';

UPDATE criterios_calidad_plantas
SET fotos = ARRAY[foto]
WHERE foto IS NOT NULL
  AND trim(foto) <> ''
  AND cardinality(fotos) = 0;

-- Máximo 5 fotos por criterio
ALTER TABLE criterios_calidad_plantas
    DROP CONSTRAINT IF EXISTS criterios_calidad_plantas_fotos_max5;
ALTER TABLE criterios_calidad_plantas
    ADD CONSTRAINT criterios_calidad_plantas_fotos_max5 CHECK (cardinality(fotos) <= 5);
