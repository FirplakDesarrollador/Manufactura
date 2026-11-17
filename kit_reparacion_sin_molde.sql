-- Control de Piso FV: los KITS DE REPARACIÓN no usan molde. La app ya registra el kit con molde_id vacío y lo pasa
-- directo a Digitado, pero la tabla trazabilidad_fv exige molde en cada pieza (molde_id NOT NULL) y rechaza el registro:
-- "La base de datos exige molde en cada pieza: no se puede registrar el kit sin molde".
-- Este cambio solo quita esa obligación: las piezas normales siguen guardando su molde (la app lo exige al pintar).
-- query_trazabilidad_fv une los moldes con LEFT JOIN, así que el kit sin molde se ve igual en todos los módulos.
-- Se puede ejecutar varias veces.

alter table public.trazabilidad_fv alter column molde_id drop not null;

notify pgrst, 'reload schema';

-- Verificación: debe decir is_nullable = YES
select column_name, is_nullable from information_schema.columns
 where table_schema = 'public' and table_name = 'trazabilidad_fv' and column_name = 'molde_id';

-- Informativo: disparadores de trazabilidad_fv (si alguno usa el molde, avisar para revisarlo con el kit)
select tgname as disparador, pg_get_triggerdef(oid) as definicion
  from pg_trigger where tgrelid = 'public.trazabilidad_fv'::regclass and not tgisinternal;
