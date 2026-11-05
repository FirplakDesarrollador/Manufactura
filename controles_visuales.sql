-- =====================================================================
-- Módulo: Controles Visuales (Mantenimiento)
-- Ejecutar UNA vez en el SQL Editor del proyecto Supabase principal
-- (el mismo de NEXT_PUBLIC_SUPABASE_URL).
-- =====================================================================

-- 1. Tabla de controles visuales
create table if not exists public.controles_visuales (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,               -- ej. CV-MS-001
  planta text not null,                      -- nombre tal como está en la tabla plantas
  area text,                                 -- área o puesto donde va el control
  titulo text not null,                      -- texto para buscar en la biblioteca
  tipo text not null default 'plantilla'
    check (tipo in ('plantilla', 'pdf')),    -- plantilla = creado en la app; pdf = archivo subido
  texto_principal text,
  dato_destacado text,
  texto_secundario text,
  icono text default 'ninguno',
  pdf_path text,                             -- ruta en el bucket (solo tipo pdf)
  version integer not null default 1,
  activo boolean not null default true,      -- eliminar = activo false (no se borra)
  creado_por text,
  actualizado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists controles_visuales_planta_idx
  on public.controles_visuales (planta) where activo;

alter table public.controles_visuales enable row level security;

drop policy if exists "cv_select_autenticados" on public.controles_visuales;
create policy "cv_select_autenticados" on public.controles_visuales
  for select to authenticated using (true);

drop policy if exists "cv_insert_autenticados" on public.controles_visuales;
create policy "cv_insert_autenticados" on public.controles_visuales
  for insert to authenticated with check (true);

drop policy if exists "cv_update_autenticados" on public.controles_visuales;
create policy "cv_update_autenticados" on public.controles_visuales
  for update to authenticated using (true) with check (true);

-- 2. Bucket privado para los PDF subidos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('controles-visuales', 'controles-visuales', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "cv_storage_select" on storage.objects;
create policy "cv_storage_select" on storage.objects
  for select to authenticated using (bucket_id = 'controles-visuales');

drop policy if exists "cv_storage_insert" on storage.objects;
create policy "cv_storage_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'controles-visuales');
