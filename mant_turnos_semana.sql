-- Turnos de los técnicos de mantenimiento por semana (Gestor de Mantenimiento → pestaña Turnos).
-- Una fila por semana (domingo de inicio) y técnico; "dias" trae el turno de domingo a sábado:
-- 'T1'..'T9', 'D' (descanso), 'V' (vacaciones) o null (sin turno). Se puede volver a ejecutar sin perder datos.

create table if not exists public.mant_turnos_semana (
    semana          date    not null,              -- domingo de la semana
    tecnico_id      bigint  not null,              -- mantenimiento_tecnicos.id
    tecnico_nombre  text    not null,
    dias            text[]  not null default array[null, null, null, null, null, null, null]::text[],
    actualizado_por text,
    actualizado_at  timestamptz not null default now(),
    primary key (semana, tecnico_id)
);

alter table public.mant_turnos_semana enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'mant_turnos_semana' and policyname = 'mant_turnos_semana_select') then
    create policy mant_turnos_semana_select on public.mant_turnos_semana for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'mant_turnos_semana' and policyname = 'mant_turnos_semana_write') then
    create policy mant_turnos_semana_write on public.mant_turnos_semana for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Orden de las filas de técnicos (se cambia arrastrando la fila); el mismo para todas las semanas
create table if not exists public.mant_turnos_orden (
    tecnico_id bigint primary key,
    orden      integer not null
);
alter table public.mant_turnos_orden enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'mant_turnos_orden' and policyname = 'mant_turnos_orden_all') then
    create policy mant_turnos_orden_all on public.mant_turnos_orden for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Horario de las plantas por semana (domingo de inicio). "dias" (domingo a sábado): {"i":"06:00","f":"22:00"},
-- "NO" (no trabaja) o null (sin definir). Con este horario y el turno de hoy de cada técnico la app ubica la cuadrilla
-- (PR / NP / NPPR / Inactivo) y actualiza mantenimiento_tecnicos.modalidad_operativa.
create table if not exists public.mant_horario_plantas (
    semana          date  not null,
    planta          text  not null,              -- código de planta (MS, FV, MBL, CEFI, RTM…)
    dias            jsonb not null default '[null,null,null,null,null,null,null]'::jsonb,
    actualizado_por text,
    actualizado_at  timestamptz not null default now(),
    primary key (semana, planta)
);
alter table public.mant_horario_plantas enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'mant_horario_plantas' and policyname = 'mant_horario_plantas_all') then
    create policy mant_horario_plantas_all on public.mant_horario_plantas for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Semana del 22 al 28 de noviembre de 2026 (horario enviado). Domingo descanso.
-- Se busca a cada técnico por nombre en mantenimiento_tecnicos; si ya hay turnos para esa semana no se tocan.
insert into public.mant_turnos_semana (semana, tecnico_id, tecnico_nombre, dias, actualizado_por)
select date '2026-11-22', t.id, t.nombre, h.dias, 'horario 22-28 nov'
  from (values
    ('%jhan%martinez%',       array['D','T1','T1','T1','T1','T1','T1']),
    ('%carlos%giraldo%',      array['D','T7','T7','T7','T7','T7','T7']),
    ('%alvaro%gonz%lez%',     array['D','T4','T4','T4','T4','T4','T4']),
    ('%gustavo%gonz%lez%',    array['D','T6','T6','T6','T6','T6','D']),
    ('%yeison%correa%',       array['D','T9','T9','T9','T9','T9','T9']),
    ('%andr%alarc%',          array['D','T8','T8','T8','T8','T8','T8']),
    ('%harr%mendoza%',        array['D','T5','T5','T5','T5','T5','T5']),
    ('%sebasti%arango%',      array['D','T8','T8','T8','T8','T8','T8']),
    ('%nicol%osorio%',        array['D','T2','T2','T2','T2','T2','T2'])
  ) as h(patron, dias)
  join lateral (
    select m.id, m.nombre from public.mantenimiento_tecnicos m
     where m.nombre ilike h.patron order by m.id limit 1
  ) t on true
on conflict (semana, tecnico_id) do nothing;

notify pgrst, 'reload schema';

-- Verificación
select tecnico_nombre, dias from public.mant_turnos_semana where semana = date '2026-11-22' order by tecnico_nombre;


-- Técnicos quitados de la tabla de turnos (siguen en la cuadrilla y el planificador)
alter table public.mant_turnos_orden add column if not exists oculto boolean not null default false;
-- Anderson David Plata Peña no va en la tabla de turnos (24/11/2026)
insert into public.mant_turnos_orden (tecnico_id, orden, oculto)
select id, 100000, true from public.mantenimiento_tecnicos where nombre ilike 'anderson%plata%'
on conflict (tecnico_id) do update set oculto = true;

-- "Practicante de tecnología" pasa a llamarse "Practicante Mantenimiento" (técnico, turnos y usuario de la app)
update public.mantenimiento_tecnicos set nombre = 'Practicante Mantenimiento' where nombre = 'Practicante de tecnología';
update public.mant_turnos_semana set tecnico_nombre = 'Practicante Mantenimiento' where tecnico_nombre = 'Practicante de tecnología';
update public.usuarios set nombre = 'Practicante Mantenimiento' where lower(correo) = 'practicante.tecnologia@firplak.com';

notify pgrst, 'reload schema';
