-- Reglas de Medición del Sistema de Producción (un documento: clave 'reglas').
-- Lectura: cualquier usuario con sesión. Modificación: solo los garantes del Sistema de Producción
-- (Héctor Chinchilla, María Isabel Escobar y Estiven Londoño), validado aquí por correo.

create table if not exists public.sp_reglas_medicion (
    clave text primary key,
    datos jsonb not null,
    actualizado_por text,
    actualizado_at timestamptz not null default now()
);

alter table public.sp_reglas_medicion enable row level security;

drop policy if exists "sp_reglas_medicion lectura" on public.sp_reglas_medicion;
create policy "sp_reglas_medicion lectura" on public.sp_reglas_medicion
    for select to authenticated using (true);

drop policy if exists "sp_reglas_medicion garantes guardar" on public.sp_reglas_medicion;
create policy "sp_reglas_medicion garantes guardar" on public.sp_reglas_medicion
    for insert to authenticated
    with check (lower(auth.jwt() ->> 'email') in ('hector.chinchilla@firplak.com', 'supervisorcalidad3@firplak.com', 'coordinacioncalidad@firplak.com', 'estiven.londono@firplak.com'));

drop policy if exists "sp_reglas_medicion garantes actualizar" on public.sp_reglas_medicion;
create policy "sp_reglas_medicion garantes actualizar" on public.sp_reglas_medicion
    for update to authenticated
    using (lower(auth.jwt() ->> 'email') in ('hector.chinchilla@firplak.com', 'supervisorcalidad3@firplak.com', 'coordinacioncalidad@firplak.com', 'estiven.londono@firplak.com'))
    with check (lower(auth.jwt() ->> 'email') in ('hector.chinchilla@firplak.com', 'supervisorcalidad3@firplak.com', 'coordinacioncalidad@firplak.com', 'estiven.londono@firplak.com'));

-- Verificación: debe devolver 1 fila
select table_name from information_schema.tables where table_schema = 'public' and table_name = 'sp_reglas_medicion';
