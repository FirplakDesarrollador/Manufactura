-- Hora a Hora FV: tipo de bañera (define el tiempo de ciclo teórico) y descripción/referencia de la bañera.
-- Solo agrega columnas; no modifica ni borra datos.
ALTER TABLE public."Hora_Hora" ADD COLUMN IF NOT EXISTS tipo_producto text;
ALTER TABLE public."Hora_Hora" ADD COLUMN IF NOT EXISTS descripcion_producto text;
