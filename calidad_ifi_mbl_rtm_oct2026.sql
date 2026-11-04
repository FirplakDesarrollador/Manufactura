-- IFI general: Muebles (MBL) y Superficies (RTM / QZ / SUP), octubre 2026 (tablas enviadas por Calidad).
-- Días con dato: su % de calidad. Días de producción (con registro de otras plantas) que no están en la tabla de la planta:
-- "No trabajó"; ese día la planta queda fuera del IFI y su peso se reparte entre las demás.
--   MBL no trabajó: 3, 10 y 17.
--   RTM no trabajó: 1, 3, 5, 7, 10, 15, 16, 17, 20, 21, 22, 23 y 24.
-- Si el día ya tenía dato, se reemplaza. Se puede ejecutar más de una vez.

-- 1) Habilitar "No trabajó" (mismo contenido de calidad_ifi_no_trabajo.sql; no pasa nada si ya se ejecutó)
ALTER TABLE public.calidad_ifi_diaria ALTER COLUMN calidad DROP NOT NULL;

ALTER TABLE public.calidad_ifi_diaria DROP CONSTRAINT IF EXISTS calidad_ifi_diaria_fuente_check;
ALTER TABLE public.calidad_ifi_diaria
  ADD CONSTRAINT calidad_ifi_diaria_fuente_check
  CHECK (fuente IN ('supabase_ms', 'sharepoint_fv', 'manual', 'excel', 'no_trabajo'));

-- Solo "No trabajó" puede ir sin calidad
ALTER TABLE public.calidad_ifi_diaria DROP CONSTRAINT IF EXISTS calidad_ifi_diaria_calidad_requerida;
ALTER TABLE public.calidad_ifi_diaria
  ADD CONSTRAINT calidad_ifi_diaria_calidad_requerida
  CHECK (fuente = 'no_trabajo' OR calidad IS NOT NULL);

-- 2) Nombre nuevo de la planta RTM (el código RTM se mantiene)
UPDATE public.calidad_ifi_plantas SET nombre = 'Superficies', updated_at = now() WHERE codigo = 'RTM';

-- 3) Calidad diaria y días sin trabajo
INSERT INTO public.calidad_ifi_diaria (fecha, planta, calidad, revisadas, buenas, fuente, registrado_por, updated_at) VALUES
    ('2026-10-01', 'MBL', 0.9760, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-01', 'RTM', NULL, NULL, NULL, 'no_trabajo', 'Tabla Superficies oct-2026', now()),
    ('2026-10-02', 'MBL', 0.9870, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-02', 'RTM', 1.0000, 8, 8, 'manual', 'Tabla Superficies oct-2026', now()),
    ('2026-10-03', 'MBL', NULL, NULL, NULL, 'no_trabajo', 'Tabla MBL oct-2026', now()),
    ('2026-10-03', 'RTM', NULL, NULL, NULL, 'no_trabajo', 'Tabla Superficies oct-2026', now()),
    ('2026-10-05', 'MBL', 0.9650, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-05', 'RTM', NULL, NULL, NULL, 'no_trabajo', 'Tabla Superficies oct-2026', now()),
    ('2026-10-06', 'MBL', 0.9600, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-06', 'RTM', 1.0000, 9, 9, 'manual', 'Tabla Superficies oct-2026', now()),
    ('2026-10-07', 'MBL', 0.9560, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-07', 'RTM', NULL, NULL, NULL, 'no_trabajo', 'Tabla Superficies oct-2026', now()),
    ('2026-10-08', 'MBL', 0.8800, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-08', 'RTM', 1.0000, 7, 7, 'manual', 'Tabla Superficies oct-2026', now()),
    ('2026-10-09', 'MBL', 0.9570, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-09', 'RTM', 1.0000, 3, 3, 'manual', 'Tabla Superficies oct-2026', now()),
    ('2026-10-10', 'MBL', NULL, NULL, NULL, 'no_trabajo', 'Tabla MBL oct-2026', now()),
    ('2026-10-10', 'RTM', NULL, NULL, NULL, 'no_trabajo', 'Tabla Superficies oct-2026', now()),
    ('2026-10-13', 'MBL', 0.9840, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-13', 'RTM', 1.0000, 3, 3, 'manual', 'Tabla Superficies oct-2026', now()),
    ('2026-10-14', 'MBL', 0.9950, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-14', 'RTM', 1.0000, 4, 4, 'manual', 'Tabla Superficies oct-2026', now()),
    ('2026-10-15', 'MBL', 0.9630, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-15', 'RTM', NULL, NULL, NULL, 'no_trabajo', 'Tabla Superficies oct-2026', now()),
    ('2026-10-16', 'MBL', 0.9410, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-16', 'RTM', NULL, NULL, NULL, 'no_trabajo', 'Tabla Superficies oct-2026', now()),
    ('2026-10-17', 'MBL', NULL, NULL, NULL, 'no_trabajo', 'Tabla MBL oct-2026', now()),
    ('2026-10-17', 'RTM', NULL, NULL, NULL, 'no_trabajo', 'Tabla Superficies oct-2026', now()),
    ('2026-10-19', 'MBL', 0.8700, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-19', 'RTM', 0.0000, 1, 0, 'manual', 'Tabla Superficies oct-2026', now()),
    ('2026-10-20', 'MBL', 0.8920, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-20', 'RTM', NULL, NULL, NULL, 'no_trabajo', 'Tabla Superficies oct-2026', now()),
    ('2026-10-21', 'MBL', 0.9040, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-21', 'RTM', NULL, NULL, NULL, 'no_trabajo', 'Tabla Superficies oct-2026', now()),
    ('2026-10-22', 'MBL', 0.9100, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-22', 'RTM', NULL, NULL, NULL, 'no_trabajo', 'Tabla Superficies oct-2026', now()),
    ('2026-10-23', 'MBL', 0.8560, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-23', 'RTM', NULL, NULL, NULL, 'no_trabajo', 'Tabla Superficies oct-2026', now()),
    ('2026-10-24', 'MBL', 0.9210, NULL, NULL, 'manual', 'Tabla MBL oct-2026', now()),
    ('2026-10-24', 'RTM', NULL, NULL, NULL, 'no_trabajo', 'Tabla Superficies oct-2026', now())
ON CONFLICT (fecha, planta) DO UPDATE
SET calidad = EXCLUDED.calidad, revisadas = EXCLUDED.revisadas, buenas = EXCLUDED.buenas, fuente = EXCLUDED.fuente, registrado_por = EXCLUDED.registrado_por, updated_at = now();

NOTIFY pgrst, 'reload schema';

-- Revisión: MBL 17 con dato + 3 no_trabajo; RTM 7 con dato + 13 no_trabajo
SELECT planta, fuente, count(*) FROM public.calidad_ifi_diaria
WHERE planta IN ('MBL', 'RTM') AND fecha BETWEEN '2026-10-01' AND '2026-10-31'
GROUP BY planta, fuente ORDER BY planta, fuente;
