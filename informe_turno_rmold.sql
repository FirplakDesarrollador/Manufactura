-- Informe de Turno · Reparación de Moldes (RMOLD)
-- Reemplaza el Excel "Productividad Moldes": el cierre del día se registra en Informe de Turno → RMOLD
-- y el Tablero de Control → RMOLD grafica productividad, nivel de servicio y paros.
-- 1) rmold_registros: un cierre por día (cantidades, personas, meta, esperados y entregados).
-- 2) rmold_paros: paros del día con causa, familia y minutos (antes hoja PAROS).
-- 3) rmold_meta_personas: meta (capacidad en moldes/día) según las personas del día; el formulario la propone.
-- El histórico del Excel se carga aparte con el archivo local datos-locales/rmold_historico.sql.

CREATE TABLE IF NOT EXISTS public.rmold_registros (
    id                    bigserial PRIMARY KEY,
    fecha                 date NOT NULL UNIQUE,
    moldes_ms             numeric(8, 2) NOT NULL DEFAULT 0,
    moldes_fv             numeric(8, 2) NOT NULL DEFAULT 0,
    moldes_rtm            numeric(8, 2) NOT NULL DEFAULT 0,
    moldes_brillados      numeric(8, 2) NOT NULL DEFAULT 0,  -- cuentan como 1/2 molde
    moldes_desmanchados   numeric(8, 2) NOT NULL DEFAULT 0,  -- cuentan como 1/3 de molde
    moldes_esperados      numeric(8, 2),
    moldes_entregados     numeric(8, 2),
    nivel_servicio        numeric(6, 4),  -- solo histórico digitado sin esperados/entregados (fracción 0-1)
    personas              numeric(5, 2) NOT NULL,
    meta                  numeric(6, 2) NOT NULL,
    tiempo_operacion_min  numeric(6, 1) NOT NULL DEFAULT 522,  -- 552 - 30 min
    observaciones         text,
    origen                text NOT NULL DEFAULT 'formulario' CHECK (origen IN ('formulario', 'excel')),
    creado_por            text,
    actualizado_por       text,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rmold_paros (
    id           bigserial PRIMARY KEY,
    fecha        date NOT NULL,
    familia      text NOT NULL,
    causa        text NOT NULL,
    minutos      numeric(8, 1) NOT NULL CHECK (minutos >= 0),
    observacion  text,
    tipo         text NOT NULL DEFAULT 'REFLEJADO' CHECK (tipo IN ('REFLEJADO', 'REAL')),
    origen       text NOT NULL DEFAULT 'formulario' CHECK (origen IN ('formulario', 'excel')),
    creado_por   text,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rmold_paros_fecha_idx ON public.rmold_paros (fecha);

CREATE TABLE IF NOT EXISTS public.rmold_meta_personas (
    personas  integer PRIMARY KEY CHECK (personas > 0),
    meta      numeric(6, 2) NOT NULL CHECK (meta >= 0)
);
-- Valores iniciales: lo más frecuente en 2026 (se cambian desde el formulario → Configurar meta)
INSERT INTO public.rmold_meta_personas (personas, meta) VALUES
    (1, 3), (2, 6), (3, 22), (4, 22), (5, 24), (6, 24), (7, 24), (8, 24)
ON CONFLICT (personas) DO NOTHING;

ALTER TABLE public.rmold_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rmold_paros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rmold_meta_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rmold_registros_select ON public.rmold_registros;
CREATE POLICY rmold_registros_select ON public.rmold_registros FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS rmold_registros_write ON public.rmold_registros;
CREATE POLICY rmold_registros_write ON public.rmold_registros FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS rmold_paros_select ON public.rmold_paros;
CREATE POLICY rmold_paros_select ON public.rmold_paros FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS rmold_paros_write ON public.rmold_paros;
CREATE POLICY rmold_paros_write ON public.rmold_paros FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS rmold_meta_select ON public.rmold_meta_personas;
CREATE POLICY rmold_meta_select ON public.rmold_meta_personas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS rmold_meta_write ON public.rmold_meta_personas;
CREATE POLICY rmold_meta_write ON public.rmold_meta_personas FOR ALL TO authenticated USING (true) WITH CHECK (true);
