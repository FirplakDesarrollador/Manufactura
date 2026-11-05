-- Imagen de referencia por paso de HDT (URL pública en el bucket fichas-media, carpeta hdt/)
ALTER TABLE public.hdt_steps ADD COLUMN IF NOT EXISTS imagen_referencia text;

NOTIFY pgrst, 'reload schema';
