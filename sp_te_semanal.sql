-- Sistema de Producción · Trabajo Estandarizado (TE) por planta y semana.
-- TE = 50 % Cobertura del puesto + 50 % Calidad de la HDT (fórmulas de HDT → Estadísticas).
-- Las HDT no guardan historia, así que el tablero guarda la foto de la semana en curso cada vez que se abre
-- (la última foto de la semana es la que queda). Lectura y escritura: usuarios con sesión.

create table if not exists public.sp_te_semanal (
    semana text not null,             -- '2026-S48'
    planta text not null,             -- código de planta del Sistema de Producción (MS, FV…)
    fecha date not null,              -- día de la foto
    cobertura numeric,                -- %
    calidad numeric,                  -- %
    te numeric,                       -- 50 % cobertura + 50 % calidad
    cargos int,
    cargos_cubiertos int,
    hdts int,
    actualizado_at timestamptz not null default now(),
    primary key (semana, planta)
);

alter table public.sp_te_semanal enable row level security;

drop policy if exists "sp_te_semanal lectura" on public.sp_te_semanal;
create policy "sp_te_semanal lectura" on public.sp_te_semanal for select to authenticated using (true);

drop policy if exists "sp_te_semanal guardar" on public.sp_te_semanal;
create policy "sp_te_semanal guardar" on public.sp_te_semanal for insert to authenticated with check (true);

drop policy if exists "sp_te_semanal actualizar" on public.sp_te_semanal;
create policy "sp_te_semanal actualizar" on public.sp_te_semanal for update to authenticated using (true) with check (true);

-- Verificación: debe devolver 1 fila
select table_name from information_schema.tables where table_schema = 'public' and table_name = 'sp_te_semanal';
