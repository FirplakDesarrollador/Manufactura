-- Saldos y destrucciones de producto no conforme (Tablero de Control → Calidad → Saldos y Destrucciones)
-- 1) calidad_costos_sku: costo promedio por SKU (hoja "Costos SKU" del Excel de No Conformes).
--    Da el costo a los eventos automáticos de Mármol (Calidad MS → Saldos) y al formulario manual.
-- 2) calidad_saldos_destrucciones: eventos registrados a mano (FV, Muebles, CEFI, Cuarzo, RTM)
--    y el histórico de MS que venía del Excel (origen = 'excel').
-- Los datos (costos e histórico) se cargan aparte con el archivo local datos-locales/saldos_destrucciones_datos.sql
-- (no se sube a GitHub porque trae costos).

CREATE TABLE IF NOT EXISTS public.calidad_costos_sku (
    sku             text PRIMARY KEY,
    descripcion     text NOT NULL,
    costo_promedio  numeric(14, 2) NOT NULL DEFAULT 0,
    actualizado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calidad_saldos_destrucciones (
    id           bigserial PRIMARY KEY,
    fecha        date NOT NULL,
    tipo         text NOT NULL CHECK (tipo IN ('saldo', 'destruccion')),
    planta       text NOT NULL,
    sku          text,
    referencia   text NOT NULL,
    causa        text NOT NULL,
    responsable  text,
    cantidad     integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    costo        numeric(14, 2) NOT NULL DEFAULT 0,  -- costo total del evento (cantidad × costo unitario)
    origen       text NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual', 'excel')),
    creado_por   text,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calidad_sd_fecha_idx ON public.calidad_saldos_destrucciones (fecha);
CREATE INDEX IF NOT EXISTS calidad_sd_planta_idx ON public.calidad_saldos_destrucciones (planta);

ALTER TABLE public.calidad_costos_sku ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calidad_saldos_destrucciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calidad_costos_sku_select ON public.calidad_costos_sku;
CREATE POLICY calidad_costos_sku_select ON public.calidad_costos_sku FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS calidad_costos_sku_write ON public.calidad_costos_sku;
CREATE POLICY calidad_costos_sku_write ON public.calidad_costos_sku FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS calidad_sd_select ON public.calidad_saldos_destrucciones;
CREATE POLICY calidad_sd_select ON public.calidad_saldos_destrucciones FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS calidad_sd_write ON public.calidad_saldos_destrucciones;
CREATE POLICY calidad_sd_write ON public.calidad_saldos_destrucciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
