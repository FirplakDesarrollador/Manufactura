-- Módulo Calidad → Consumos (Pintura MS, Vaciado MS, Pintura FV, Vaciado FV y Masilla FV)
-- Soporta registro rápido de 1 pieza o ciclo de 2 piezas (Pintura MS), comparando suma real vs SAP.

CREATE TABLE IF NOT EXISTS public.calidad_consumos (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Bogota')::DATE,
    planta TEXT NOT NULL CHECK (planta IN ('MS', 'FV')),
    proceso TEXT NOT NULL CHECK (proceso IN ('pintura_ms', 'vaciado_ms', 'pintura_fv', 'vaciado_fv', 'masilla_fv')),
    tipo_resina TEXT,
    es_ciclo_dos_piezas BOOLEAN NOT NULL DEFAULT FALSE,
    referencia TEXT NOT NULL,
    peso_sap NUMERIC(10,3) NOT NULL DEFAULT 0,
    referencia_2 TEXT,
    peso_sap_2 NUMERIC(10,3),
    peso_sap_total NUMERIC(10,3) NOT NULL DEFAULT 0,
    peso_real NUMERIC(10,3) NOT NULL DEFAULT 0,
    peso_real_2 NUMERIC(10,3),
    diferencia NUMERIC(10,3) NOT NULL DEFAULT 0,
    porcentaje_variacion NUMERIC(8,2) DEFAULT 0,
    galga_pared NUMERIC(10,2),
    galga_piso NUMERIC(10,2),
    operario TEXT,
    observaciones TEXT,
    registrado_por TEXT
);

CREATE INDEX IF NOT EXISTS idx_calidad_consumos_proceso_fecha
    ON public.calidad_consumos (proceso, fecha DESC, created_at DESC);

ALTER TABLE public.calidad_consumos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'calidad_consumos'
          AND policyname = 'all for auth users'
    ) THEN
        CREATE POLICY "all for auth users"
            ON public.calidad_consumos
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
