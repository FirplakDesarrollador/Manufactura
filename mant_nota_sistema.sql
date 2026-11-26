-- Nota fija del sistema en las órdenes de mantenimiento (no la edita el técnico).
-- Antes iba al inicio de comentarios_ejecucion; este script la pasa a su propia columna.

-- 1. Columna nueva
alter table public.mantenimiento_ordenes add column if not exists nota_sistema text;

-- 2. Vista previa: cómo quedan las órdenes que traen la nota dentro de las observaciones
select id, codigo,
       substring(comentarios_ejecucion from '^\s*(Orden generada automáticamente por plan preventivo ciclo \(\d+ días\)\.|⚡ Mantenimiento preventivo forzado/adelantado desde el catálogo PMP\.)') as nota_sistema_nueva,
       regexp_replace(comentarios_ejecucion, '^\s*(Orden generada automáticamente por plan preventivo ciclo \(\d+ días\)\.|⚡ Mantenimiento preventivo forzado/adelantado desde el catálogo PMP\.)\s*', '') as observaciones_tecnico
from public.mantenimiento_ordenes
where comentarios_ejecucion ~ '^\s*(Orden generada automáticamente por plan preventivo ciclo \(\d+ días\)\.|⚡ Mantenimiento preventivo forzado/adelantado desde el catálogo PMP\.)'
order by id desc;

-- 3. Mover la nota a su columna (dejar en las observaciones solo lo que escribió el técnico)
update public.mantenimiento_ordenes
set nota_sistema = substring(comentarios_ejecucion from '^\s*(Orden generada automáticamente por plan preventivo ciclo \(\d+ días\)\.|⚡ Mantenimiento preventivo forzado/adelantado desde el catálogo PMP\.)'),
    comentarios_ejecucion = regexp_replace(comentarios_ejecucion, '^\s*(Orden generada automáticamente por plan preventivo ciclo \(\d+ días\)\.|⚡ Mantenimiento preventivo forzado/adelantado desde el catálogo PMP\.)\s*', '')
where nota_sistema is null
  and comentarios_ejecucion ~ '^\s*(Orden generada automáticamente por plan preventivo ciclo \(\d+ días\)\.|⚡ Mantenimiento preventivo forzado/adelantado desde el catálogo PMP\.)';
