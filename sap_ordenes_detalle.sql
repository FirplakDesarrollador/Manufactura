-- Copia del detalle de cada orden de fabricación consultada en SAP (ventana "Detalle de la orden · SAP").
-- La ventana abre al instante con esta copia y por detrás consulta SAP; si cambió algo, la actualiza.
-- Solo la leen y escriben usuarios con sesión iniciada en la app.

create table if not exists public.sap_ordenes_detalle (
    orden_fabricacion text primary key,
    datos jsonb not null,
    consultado_at timestamptz not null default now(),
    consultado_por text
);

alter table public.sap_ordenes_detalle enable row level security;

drop policy if exists "sap_ordenes_detalle lectura" on public.sap_ordenes_detalle;
create policy "sap_ordenes_detalle lectura" on public.sap_ordenes_detalle
    for select to authenticated using (true);

drop policy if exists "sap_ordenes_detalle guardar" on public.sap_ordenes_detalle;
create policy "sap_ordenes_detalle guardar" on public.sap_ordenes_detalle
    for insert to authenticated with check (true);

drop policy if exists "sap_ordenes_detalle actualizar" on public.sap_ordenes_detalle;
create policy "sap_ordenes_detalle actualizar" on public.sap_ordenes_detalle
    for update to authenticated using (true) with check (true);
