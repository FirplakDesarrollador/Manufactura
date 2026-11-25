-- Sistema de Producción · versiones de las Reglas de Medición con fecha de vigencia.
-- Cada vez que los garantes guardan las reglas se guarda también una versión "vigente desde" un lunes. El cumplimiento
-- de cada semana se calcula con la versión vigente en esa semana: un cambio de exigencias no modifica las semanas
-- anteriores. Lectura: usuarios con sesión. Escritura: solo los garantes.

create table if not exists public.sp_reglas_versiones (
    vigente_desde date primary key,      -- lunes desde el que aplica
    datos jsonb not null,
    actualizado_por text,
    actualizado_at timestamptz not null default now()
);

alter table public.sp_reglas_versiones enable row level security;

drop policy if exists "sp_reglas_versiones lectura" on public.sp_reglas_versiones;
create policy "sp_reglas_versiones lectura" on public.sp_reglas_versiones for select to authenticated using (true);

drop policy if exists "sp_reglas_versiones garantes guardar" on public.sp_reglas_versiones;
create policy "sp_reglas_versiones garantes guardar" on public.sp_reglas_versiones for insert to authenticated
    with check (lower(auth.jwt() ->> 'email') in ('hector.chinchilla@firplak.com', 'supervisorcalidad3@firplak.com', 'coordinacioncalidad@firplak.com', 'estiven.londono@firplak.com'));

drop policy if exists "sp_reglas_versiones garantes actualizar" on public.sp_reglas_versiones;
create policy "sp_reglas_versiones garantes actualizar" on public.sp_reglas_versiones for update to authenticated
    using (lower(auth.jwt() ->> 'email') in ('hector.chinchilla@firplak.com', 'supervisorcalidad3@firplak.com', 'coordinacioncalidad@firplak.com', 'estiven.londono@firplak.com'))
    with check (lower(auth.jwt() ->> 'email') in ('hector.chinchilla@firplak.com', 'supervisorcalidad3@firplak.com', 'coordinacioncalidad@firplak.com', 'estiven.londono@firplak.com'));

-- Primera versión: las reglas actuales, vigentes desde el inicio del año (cubre todas las semanas ya calculadas)
insert into public.sp_reglas_versiones (vigente_desde, datos, actualizado_por, actualizado_at)
select date '2026-01-05', datos, actualizado_por, actualizado_at
  from public.sp_reglas_medicion where clave = 'reglas'
on conflict (vigente_desde) do nothing;

-- Verificación
select vigente_desde, actualizado_por, actualizado_at from public.sp_reglas_versiones order by vigente_desde;
