-- RMOLD · campos nuevos del cierre del día (Informe de Turno → RMOLD). Se puede ejecutar varias veces.
-- 1) Contramoldes reparados (C.M.): NO suman al total de moldes reparados; solo estadística.
-- 2) Tiempo laborado del turno: hora de inicio y fin y los descuentos; el total disponible queda en tiempo_operacion_min.
--    Por defecto 6:00 a 15:12 (552 min) − 20 inicio/fin de turno − 20 alimentación 1 − 28 alimentación 2 = 484 min.
-- 3) Ausentismo: personas ausentes del día. personas = presentes (FTE); programadas = personas + ausentes;
--    presentismo = personas ÷ (personas + ausentes).
-- Vacío (NULL) en los días anteriores = no se registró.
ALTER TABLE public.rmold_registros
    ADD COLUMN IF NOT EXISTS contramoldes_reparados numeric(8, 2) CHECK (contramoldes_reparados IS NULL OR contramoldes_reparados >= 0),
    ADD COLUMN IF NOT EXISTS hora_inicio            time,
    ADD COLUMN IF NOT EXISTS hora_fin               time,
    ADD COLUMN IF NOT EXISTS min_inicio_fin_turno   numeric(6, 1) CHECK (min_inicio_fin_turno IS NULL OR min_inicio_fin_turno >= 0),
    ADD COLUMN IF NOT EXISTS min_alimentacion_1     numeric(6, 1) CHECK (min_alimentacion_1 IS NULL OR min_alimentacion_1 >= 0),
    ADD COLUMN IF NOT EXISTS min_alimentacion_2     numeric(6, 1) CHECK (min_alimentacion_2 IS NULL OR min_alimentacion_2 >= 0),
    ADD COLUMN IF NOT EXISTS ausentes               numeric(5, 2) CHECK (ausentes IS NULL OR ausentes >= 0);

-- Para que la API vea las columnas nuevas de inmediato
NOTIFY pgrst, 'reload schema';
