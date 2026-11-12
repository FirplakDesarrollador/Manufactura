-- Módulo Traslados (FV) · Parámetros a revisar: decisión Sí / No por artículo.
-- Manda sobre la regla por defecto (accesorios sí, consumibles por palabra / materias primas / mano de obra no).
-- La revisión automática solo lee (anon); los cambios los hacen usuarios con sesión desde el módulo.

create table if not exists public.traslados_articulos_fv (
    item text primary key,                -- Nº de artículo SAP
    descripcion text,
    revisar boolean not null,             -- true = se exige en el traslado de la OF
    actualizado_por text,
    actualizado_at timestamptz not null default now()
);

alter table public.traslados_articulos_fv enable row level security;
drop policy if exists "traslados_articulos_fv lectura" on public.traslados_articulos_fv;
create policy "traslados_articulos_fv lectura" on public.traslados_articulos_fv for select to anon, authenticated using (true);
drop policy if exists "traslados_articulos_fv guardar" on public.traslados_articulos_fv;
create policy "traslados_articulos_fv guardar" on public.traslados_articulos_fv for insert to authenticated with check (true);
drop policy if exists "traslados_articulos_fv actualizar" on public.traslados_articulos_fv;
create policy "traslados_articulos_fv actualizar" on public.traslados_articulos_fv for update to authenticated using (true) with check (true);
drop policy if exists "traslados_articulos_fv borrar" on public.traslados_articulos_fv;
create policy "traslados_articulos_fv borrar" on public.traslados_articulos_fv for delete to authenticated using (true);

-- Verificación: debe devolver 1 fila
select table_name from information_schema.tables where table_schema = 'public' and table_name = 'traslados_articulos_fv';
