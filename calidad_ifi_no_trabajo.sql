-- IFI general: permitir marcar que una planta "No trabajó" un día.
-- Se guarda en calidad_ifi_diaria con fuente = 'no_trabajo' y calidad vacía; ese día la planta
-- queda fuera del cálculo y su peso se reparte entre las plantas que sí trabajaron.

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

NOTIFY pgrst, 'reload schema';
