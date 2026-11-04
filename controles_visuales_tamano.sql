-- =====================================================================
-- Controles Visuales: tamaño ajustable de cada control
-- Ejecutar UNA vez en el SQL Editor de Supabase, después de controles_visuales_rotulos.sql.
-- Solo agrega columnas: no borra ni modifica datos existentes.
-- Vacío = tamaño por defecto (hoja: carta 27.9 x 21.6 cm; rótulo: 11.8 x 3.1 cm).
-- =====================================================================

alter table public.controles_visuales
  add column if not exists ancho_cm numeric(5, 1) check (ancho_cm is null or ancho_cm between 2 and 30);

alter table public.controles_visuales
  add column if not exists alto_cm numeric(5, 1) check (alto_cm is null or alto_cm between 2 and 30);

notify pgrst, 'reload schema';
