-- Cumplimiento del Sistema de Producción (Estadísticas de Producción)
-- Cumplimiento = auditorías OPT Sistémica ejecutadas ÷ programadas (agendamiento), meta 90 %.
-- 1) Planta en el agendamiento y en cada auditoría, para el cumplimiento por planta.
-- 2) sp_cumplimiento_historico: lo que se llevaba en el Excel "ILU CONSOLIDADO" (24/04 a 24/10/2026):
--    semanal FIRPLAK por herramienta (CRONOGRAMA 2026), semanal por planta (PLANTAS 2026),
--    planta × herramienta (Herramienta) y persona × herramienta (% SUPERVISORES, % JEFES, LIDERES %).
--    Desde la semana siguiente el tablero calcula con los datos de la aplicación.
-- Los datos se cargan aparte con el archivo local datos-locales/sp_cumplimiento_historico_datos.sql
-- (no se sube a GitHub).

ALTER TABLE public.opt_planificacion ADD COLUMN IF NOT EXISTS planta text;
ALTER TABLE public.opt_registros ADD COLUMN IF NOT EXISTS planta text;

CREATE TABLE IF NOT EXISTS public.sp_cumplimiento_historico (
    id            bigserial PRIMARY KEY,
    fecha         date NOT NULL,                  -- viernes de la semana (como el Excel)
    nivel         text NOT NULL CHECK (nivel IN ('firplak', 'planta', 'persona')),
    planta        text,                           -- nivel planta
    persona       text,                           -- nivel persona
    rol           text,                           -- Jefe / Supervisor / Líder (nivel persona)
    herramienta   text,                           -- TE, EE, AF, BIT, GI, OPT, OPTS, RRC; null = total
    cumplimiento  numeric(6, 2) NOT NULL CHECK (cumplimiento >= 0 AND cumplimiento <= 100),
    origen        text NOT NULL DEFAULT 'excel',
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sp_cumpl_hist_clave_idx
    ON public.sp_cumplimiento_historico (fecha, nivel, coalesce(planta, ''), coalesce(persona, ''), coalesce(herramienta, ''));

ALTER TABLE public.sp_cumplimiento_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_cumpl_hist_select ON public.sp_cumplimiento_historico;
CREATE POLICY sp_cumpl_hist_select ON public.sp_cumplimiento_historico FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS sp_cumpl_hist_write ON public.sp_cumplimiento_historico;
CREATE POLICY sp_cumpl_hist_write ON public.sp_cumplimiento_historico FOR ALL TO authenticated USING (true) WITH CHECK (true);
