-- Sistema de Producción · Trabajo Estandarizado (TE) semanal
-- 1) Función para que la tarea automática de los domingos (sin sesión) guarde la foto de la semana.
-- 2) Relleno de S44 a S47 de 2026 (semanas sin foto) con el promedio del resto del año de cada planta.
-- Ejecutar después de sp_te_semanal.sql. Se puede correr más de una vez.

-- Origen de cada fila: 'foto' (calculada desde las HDT) o 'promedio' (relleno)
alter table public.sp_te_semanal add column if not exists origen text not null default 'foto';

-- 1) Guardar la foto (una fila por semana y planta; si ya existe, se reemplaza)
create or replace function public.sp_te_guardar(p_filas jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
    insert into public.sp_te_semanal (semana, planta, fecha, cobertura, calidad, te, cargos, cargos_cubiertos, hdts, origen, actualizado_at)
    select x.semana, x.planta, x.fecha, x.cobertura, x.calidad, x.te, x.cargos, x.cargos_cubiertos, x.hdts, 'foto', now()
      from jsonb_to_recordset(p_filas) as x(semana text, planta text, fecha date, cobertura numeric, calidad numeric, te numeric,
                                            cargos int, cargos_cubiertos int, hdts int)
     where x.semana ~ '^\d{4}-S\d{2}$' and x.planta <> '' and x.te between 0 and 100
    on conflict (semana, planta) do update
       set fecha = excluded.fecha, cobertura = excluded.cobertura, calidad = excluded.calidad, te = excluded.te,
           cargos = excluded.cargos, cargos_cubiertos = excluded.cargos_cubiertos, hdts = excluded.hdts,
           origen = 'foto', actualizado_at = now();
    get diagnostics n = row_count;
    return n;
end $$;
revoke all on function public.sp_te_guardar(jsonb) from public;
grant execute on function public.sp_te_guardar(jsonb) to anon, authenticated;

-- 2) Relleno S44–S47 de 2026. Promedio de cada planta con las demás semanas del año:
--    histórico del Excel ILU (Trabajo Estandarizado por planta) + fotos de la app (sin contar otros rellenos).
--    Códigos viejos del Excel → código de la nomenclatura. No pisa una semana que ya tenga foto.
with fuentes as (
    select case h.planta when 'MBLES' then 'MBL' when 'CALIDAD' then 'CALID' when 'MOLDES' then 'MOLD'
                         when 'RR MOLDES' then 'RMOLD' when 'MANTENIMIENTO' then 'MTTO' when 'ALMACEN' then 'ALM'
                         else h.planta end as planta,
           h.cumplimiento::numeric as te
      from public.sp_cumplimiento_historico h
     where h.herramienta = 'TE' and h.nivel = 'planta' and h.planta is not null and extract(year from h.fecha) = 2026
    union all
    select t.planta, t.te
      from public.sp_te_semanal t
     where t.semana like '2026-S%' and t.semana not in ('2026-S44', '2026-S45', '2026-S46', '2026-S47')
       and t.origen = 'foto' and t.te is not null
), promedios as (
    select planta, round(avg(te), 2) as te from fuentes group by planta
)
insert into public.sp_te_semanal (semana, planta, fecha, te, origen, actualizado_at)
select s.semana, p.planta, s.viernes, p.te, 'promedio', now()
  from promedios p
 cross join (values ('2026-S44', date '2026-10-30'), ('2026-S45', date '2026-11-06'),
                    ('2026-S46', date '2026-11-13'), ('2026-S47', date '2026-11-20')) as s(semana, viernes)
on conflict (semana, planta) do nothing;

-- Verificación: lo que quedó en S44–S47 (una fila por planta y semana)
select semana, planta, te, origen from public.sp_te_semanal
 where semana in ('2026-S44', '2026-S45', '2026-S46', '2026-S47') order by semana, planta;
