-- Módulo Traslados (Fibra FV): verifica que cada OF liberada tenga su traslado y que lo trasladado cubra la lista de materiales.
-- 1) traslados_of_fv: resultado de la última revisión por OF (la calcula /api/sap/traslados-fv a las 5 a. m., 12 m. y 5 p. m.
--    de lunes a viernes, o con el botón "Revisar ahora"). La revisión automática corre sin usuario, por eso puede escribir anon.
-- 2) traslados_consumibles_fv: palabras de la descripción de los consumibles de uso común que NO se exigen por OF
--    (tornillería, cartón, calcomanías...). Se editan desde el módulo (solo usuarios con sesión).

create table if not exists public.traslados_of_fv (
    orden_fabricacion text primary key,
    estado text not null,                 -- completo | solicitado | faltante | sin_traslado | error
    producto_sku text,
    producto_descripcion text,
    cantidad numeric,
    exigidos int not null default 0,      -- artículos de la lista que se exigen (accesorios sin consumibles)
    entregados int not null default 0,
    solicitados_pendientes int not null default 0,
    faltantes int not null default 0,
    sustitutos int not null default 0,
    documentos jsonb not null default '[]'::jsonb,   -- solicitudes y traslados encontrados (sin líneas)
    detalle jsonb not null default '[]'::jsonb,      -- artículo por artículo: requerido, solicitado, trasladado, pendiente
    extras jsonb not null default '[]'::jsonb,       -- trasladado que no está en la lista (posibles sustitutos)
    error text,
    calculado_at timestamptz not null default now()
);

alter table public.traslados_of_fv enable row level security;
drop policy if exists "traslados_of_fv lectura" on public.traslados_of_fv;
create policy "traslados_of_fv lectura" on public.traslados_of_fv for select to anon, authenticated using (true);
drop policy if exists "traslados_of_fv guardar" on public.traslados_of_fv;
create policy "traslados_of_fv guardar" on public.traslados_of_fv for insert to anon, authenticated with check (true);
drop policy if exists "traslados_of_fv actualizar" on public.traslados_of_fv;
create policy "traslados_of_fv actualizar" on public.traslados_of_fv for update to anon, authenticated using (true) with check (true);
drop policy if exists "traslados_of_fv borrar" on public.traslados_of_fv;
create policy "traslados_of_fv borrar" on public.traslados_of_fv for delete to anon, authenticated using (true);

create table if not exists public.traslados_consumibles_fv (
    patron text primary key,              -- palabra(s) de la descripción, en mayúsculas sin tildes
    creado_at timestamptz not null default now(),
    creado_por text
);

alter table public.traslados_consumibles_fv enable row level security;
drop policy if exists "traslados_consumibles_fv lectura" on public.traslados_consumibles_fv;
create policy "traslados_consumibles_fv lectura" on public.traslados_consumibles_fv for select to anon, authenticated using (true);
drop policy if exists "traslados_consumibles_fv guardar" on public.traslados_consumibles_fv;
create policy "traslados_consumibles_fv guardar" on public.traslados_consumibles_fv for insert to authenticated with check (true);
drop policy if exists "traslados_consumibles_fv borrar" on public.traslados_consumibles_fv;
create policy "traslados_consumibles_fv borrar" on public.traslados_consumibles_fv for delete to authenticated using (true);

-- Consumibles iniciales (vistos en las OF revisadas: no llegan por traslado de la OF)
insert into public.traslados_consumibles_fv (patron) values
    ('TORNILLO'), ('CHAPOLA'), ('ARANDELA'), ('TUERCA'), ('VARILLA ROSCADA'),
    ('CARTON'), ('CALCOMANIA'), ('ETIQUETA'), ('MALLA GALLINERO'), ('VARILLA MADERA'),
    ('MANGUERA AGRICOLA'), ('GRAPAS'), ('LISTON ICOPOR'), ('REGLETA'), ('CINTA'),
    -- Confirmados en planta (11/11/2026): llegan por otro medio, no por el traslado de la OF
    ('TUBERIA FLEXIBLE'), ('PATA SOPORTE'), ('SNAP FIJACION'), ('L FIJACION'), ('MANGUERA 3/8IN BLANCA PARA AIRE'), ('MANGUERA TRANSPAREN'), ('TUBO CERRAM'), ('TUBO C18'), ('CANTONERA'), ('NIVELADOR')
on conflict (patron) do nothing;

-- Verificación: debe devolver 2 filas
select table_name from information_schema.tables where table_schema = 'public' and table_name in ('traslados_of_fv', 'traslados_consumibles_fv');
