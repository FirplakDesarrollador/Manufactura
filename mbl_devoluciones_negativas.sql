-- Muebles / CEFI / Semielaborados: permitir devoluciones en trazabilidad_muebles.
-- "Devolver a Inspección" (Digitado), "Devolver a Digitado" (Tránsito) y Mover OF hacia atrás registran la
-- devolución con cantidad NEGATIVA (queda en la trazabilidad a nombre de quien devolvió y las vistas restan solas).
-- La restricción actual (trazabilidad_muebles_cantidad_check) solo acepta cantidades positivas y las rechaza.
-- Nueva regla: cualquier cantidad distinta de 0.

-- 1) Ver la regla actual (solo consulta)
select conname, pg_get_constraintdef(oid) as regla
from pg_constraint
where conrelid = 'public.trazabilidad_muebles'::regclass and conname = 'trazabilidad_muebles_cantidad_check';

-- 2) Cambiarla
alter table public.trazabilidad_muebles drop constraint if exists trazabilidad_muebles_cantidad_check;
alter table public.trazabilidad_muebles add constraint trazabilidad_muebles_cantidad_check check (cantidad <> 0);
