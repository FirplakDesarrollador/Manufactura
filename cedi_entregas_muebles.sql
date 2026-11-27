-- Entregas a CEDI de Muebles / CEFI (27/11/2026): el día se divide en entregas (Entrega 1, 2, 3…, se reinicia cada
-- día). Cada fila es el CIERRE de una entrega: todo lo registrado en Tránsito desde el cierre anterior (o desde las
-- 00:00) hasta cerrada_at es esa entrega; lo registrado después va a la siguiente (la "entrega en curso").
create table if not exists public.cedi_entregas_muebles (
  id bigserial primary key,
  planta text not null,
  fecha date not null,
  numero integer not null check (numero > 0),
  cerrada_at timestamptz not null default now(),
  cerrada_por text,
  unique (planta, fecha, numero)
);

alter table public.cedi_entregas_muebles enable row level security;

drop policy if exists "cedi_entregas_muebles leer" on public.cedi_entregas_muebles;
create policy "cedi_entregas_muebles leer" on public.cedi_entregas_muebles
  for select to authenticated using (true);
drop policy if exists "cedi_entregas_muebles cerrar" on public.cedi_entregas_muebles;
create policy "cedi_entregas_muebles cerrar" on public.cedi_entregas_muebles
  for insert to authenticated with check (true);
drop policy if exists "cedi_entregas_muebles borrar" on public.cedi_entregas_muebles;
create policy "cedi_entregas_muebles borrar" on public.cedi_entregas_muebles
  for delete to authenticated using (true);

select count(*) as cierres from public.cedi_entregas_muebles;
