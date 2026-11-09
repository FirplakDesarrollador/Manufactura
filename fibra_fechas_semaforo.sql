-- Control de piso Fibra: las 4 fechas del Semáforo (query "FPK - Semaforo - DJP") en cada OF.
-- Las llena el botón "Cargar Órdenes" (app/api/sap/ordenes-liberadas) consultando la API del Semáforo de Sistemas.
-- Ejecutar una vez en el SQL Editor de Supabase.

alter table public.ordenes_fabricacion_fibra
    add column if not exists fecha_entrega_lote date,              -- Fecha Entrega Lote (columna T)
    add column if not exists fecha_real_liberacion date,           -- Fecha Real Liberación
    add column if not exists fecha_ideal_entrega_produccion date,  -- Fecha Ideal Entrega Producción (columna W)
    add column if not exists fecha_prometida_entrega date,         -- Fecha Prometida Entrega Item (columna AF)
    add column if not exists fechas_semaforo_actualizadas timestamptz; -- cuándo se trajeron del Semáforo
