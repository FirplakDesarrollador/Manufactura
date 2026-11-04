-- =====================================================================
-- Controles Visuales: rótulos pequeños y subida de controles existentes
-- Ejecutar UNA vez en el SQL Editor de Supabase, después de controles_visuales.sql.
-- Solo agrega columnas y amplía el bucket: no borra ni modifica datos existentes.
-- =====================================================================

-- 1. Formato del control: hoja = carta horizontal, rotulo = etiqueta de 11.8 x 3.1 cm
alter table public.controles_visuales
  add column if not exists formato text not null default 'hoja'
    check (formato in ('hoja', 'rotulo'));

-- 2. Tipo de archivo de los controles subidos (PDF o imagen)
alter table public.controles_visuales
  add column if not exists archivo_mime text;

-- 3. El bucket acepta también imágenes y archivos de hasta 20 MB
update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
    file_size_limit = 20971520
where id = 'controles-visuales';

notify pgrst, 'reload schema';
