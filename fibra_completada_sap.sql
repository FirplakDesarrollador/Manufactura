-- Control de Piso FV: cantidad COMPLETADA en SAP de cada OF de Fibra (unidades ya recibidas en PT).
-- Se llena sola al "Cargar órdenes". Sirve para que una unidad entregada directamente en SAP, sin registrarla en
-- planta, cuente como CEDI y no quede como "Programado" (caso OF 2246519: 4 planificadas, 1 completada en SAP).
-- No cambia ni crea registros de trazabilidad. Se puede ejecutar varias veces.

alter table public.ordenes_fabricacion_fibra add column if not exists cantidad_completada_sap numeric;

notify pgrst, 'reload schema';

-- Verificación: debe devolver una fila
select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'ordenes_fabricacion_fibra' and column_name = 'cantidad_completada_sap';
