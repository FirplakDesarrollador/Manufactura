-- Ejecutor del mantenimiento: MT = técnicos de mantenimiento, OP = operativo / producción.
-- Nomenclatura: Periodicidad + Ejecutor + Planta + Intervención + Tiempo (ej. S01MTMSPRT30 / S01OPMSPRT30).

-- 1. Planes preventivos (PMP): todos los existentes quedan MT
alter table public.mantenimiento_planes_preventivos
  add column if not exists ejecutor text not null default 'MT';
update public.mantenimiento_planes_preventivos set ejecutor = 'MT' where ejecutor is null or ejecutor not in ('MT', 'OP');
do $$ begin
  alter table public.mantenimiento_planes_preventivos add constraint mant_planes_ejecutor_chk check (ejecutor in ('MT', 'OP'));
exception when duplicate_object then null; end $$;

-- 2. Técnicos: todos MT, excepto Jakeline Chaverra (encargada de planta) = OP
alter table public.mantenimiento_tecnicos
  add column if not exists ejecutor text not null default 'MT';
update public.mantenimiento_tecnicos set ejecutor = 'MT' where ejecutor is null or ejecutor not in ('MT', 'OP');
update public.mantenimiento_tecnicos set ejecutor = 'OP' where nombre ilike 'jakeline%chaverra%';
do $$ begin
  alter table public.mantenimiento_tecnicos add constraint mant_tecnicos_ejecutor_chk check (ejecutor in ('MT', 'OP'));
exception when duplicate_object then null; end $$;

-- Verificación
select ejecutor, count(*) as planes from public.mantenimiento_planes_preventivos group by ejecutor;
select id, nombre, ejecutor, activo from public.mantenimiento_tecnicos order by ejecutor desc, nombre;
