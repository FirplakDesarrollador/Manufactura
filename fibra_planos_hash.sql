-- =====================================================================
-- Planos FV: huella (hash SHA-256) de cada PDF para no cargar planos repetidos.
-- Solo agrega una columna y un índice: no borra ni modifica datos.
-- Los planos que ya están cargados quedan sin huella; para ellos la app
-- compara el nombre del archivo.
-- =====================================================================

alter table public.fibra_planos add column if not exists hash text;

create index if not exists fibra_planos_hash_idx on public.fibra_planos (hash) where activo;

notify pgrst, 'reload schema';
