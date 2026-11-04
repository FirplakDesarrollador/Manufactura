-- % máximo de piezas con el defecto permitido al día (criterios de aceptación y rechazo).
-- Si se supera 3 días seguidos, el tema sube de nivel y se abre el tratamiento de problemas en QRR.
ALTER TABLE public.criterios_calidad_plantas
  ADD COLUMN IF NOT EXISTS pct_max_dia numeric(6,2)
  CHECK (pct_max_dia IS NULL OR (pct_max_dia >= 0 AND pct_max_dia <= 100));

COMMENT ON COLUMN public.criterios_calidad_plantas.pct_max_dia IS
  '% máximo de piezas con el defecto permitido al día; 3 días seguidos por encima escala a QRR';

NOTIFY pgrst, 'reload schema';
