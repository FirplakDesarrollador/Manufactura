-- CEDI Muebles / CEFI (27/11/2026): el operario de CEDI marca "Verificado" mientras revisa físicamente la entrega de
-- cada OF y confirma la cantidad verificada. Cada confirmación es una fila (queda quién y cuándo); el total por OF y
-- el total del día salen de sumar estas filas.
create table if not exists public.cedi_verificaciones_muebles (
  id bigserial primary key,
  orden_fabricacion text not null,
  planta text,
  cantidad integer not null check (cantidad > 0),
  verificado_por text,
  created_at timestamptz not null default now()
);

create index if not exists cedi_verificaciones_muebles_of on public.cedi_verificaciones_muebles (orden_fabricacion);
create index if not exists cedi_verificaciones_muebles_fecha on public.cedi_verificaciones_muebles (created_at);

alter table public.cedi_verificaciones_muebles enable row level security;

-- Usuarios con sesión: ver y registrar verificaciones (no se editan; un error se corrige borrando la fila)
drop policy if exists "cedi_verificaciones_muebles leer" on public.cedi_verificaciones_muebles;
create policy "cedi_verificaciones_muebles leer" on public.cedi_verificaciones_muebles
  for select to authenticated using (true);
drop policy if exists "cedi_verificaciones_muebles registrar" on public.cedi_verificaciones_muebles;
create policy "cedi_verificaciones_muebles registrar" on public.cedi_verificaciones_muebles
  for insert to authenticated with check (true);
drop policy if exists "cedi_verificaciones_muebles borrar" on public.cedi_verificaciones_muebles;
create policy "cedi_verificaciones_muebles borrar" on public.cedi_verificaciones_muebles
  for delete to authenticated using (true);

select count(*) as verificaciones from public.cedi_verificaciones_muebles;
