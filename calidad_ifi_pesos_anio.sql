-- IFI general: pesos de las plantas por año.
-- Si un año no tiene pesos aquí, se usan los vigentes de calidad_ifi_plantas.
-- Los pesos se guardan como fracción (0,55 = 55 %) y por año deben sumar 100 %.

CREATE TABLE IF NOT EXISTS public.calidad_ifi_pesos (
    anio            int NOT NULL CHECK (anio BETWEEN 2020 AND 2100),
    planta          text NOT NULL REFERENCES public.calidad_ifi_plantas(codigo),
    peso            numeric(6,4) NOT NULL CHECK (peso >= 0 AND peso <= 1),
    registrado_por  text,
    updated_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (anio, planta)
);

ALTER TABLE public.calidad_ifi_pesos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calidad_ifi_pesos_select ON public.calidad_ifi_pesos;
CREATE POLICY calidad_ifi_pesos_select ON public.calidad_ifi_pesos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS calidad_ifi_pesos_write ON public.calidad_ifi_pesos;
CREATE POLICY calidad_ifi_pesos_write ON public.calidad_ifi_pesos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Pesos de 2026 = los vigentes hoy (se pueden cambiar desde "Configurar pesos")
INSERT INTO public.calidad_ifi_pesos (anio, planta, peso, registrado_por)
SELECT 2026, codigo, peso, 'script inicial' FROM public.calidad_ifi_plantas WHERE activa
ON CONFLICT (anio, planta) DO NOTHING;

NOTIFY pgrst, 'reload schema';
