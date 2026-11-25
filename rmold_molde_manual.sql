-- Calidad Reparación de Moldes (RMOLD): molde escrito a mano.
-- Si el molde no aparece en la lista o está mal marcado, el inspector escribe el nombre del molde y su serial
-- (o solo el serial). El registro queda sin tipo de molde (producto_id vacío) cuando se escribe el nombre.
-- Se puede correr más de una vez.

alter table public.rmold_reporte_defectos add column if not exists molde_manual text;            -- nombre escrito
alter table public.rmold_reporte_defectos add column if not exists molde_escrito boolean not null default false; -- se escribió a mano (nombre o serial)
alter table public.rmold_reporte_defectos alter column producto_id drop not null;

-- Verificación
select column_name, data_type, is_nullable from information_schema.columns
 where table_schema = 'public' and table_name = 'rmold_reporte_defectos' and column_name in ('producto_id', 'molde_manual', 'molde_escrito', 'Molde');
