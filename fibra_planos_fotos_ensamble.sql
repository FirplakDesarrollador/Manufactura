-- =====================================================================
-- Planos FV: agrega la columna "Fotos ensamble" (proceso fotos_ensamble).
-- 1. Cambia la regla de procesos permitidos para incluir fotos_ensamble.
-- 2. Deja que el bucket fibra-planos reciba fotos (JPG, PNG, WEBP) además de PDF.
-- No borra ni modifica ningún plano ni archivo.
-- =====================================================================

alter table public.fibra_planos
  drop constraint if exists fibra_planos_proceso_check,
  add constraint fibra_planos_proceso_check
    check (proceso in ('cantoneras', 'soldadura', 'masilla', 'pulido', 'ensamble', 'huacal', 'fotos_ensamble'));

update storage.buckets
   set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
 where id = 'fibra-planos';

notify pgrst, 'reload schema';
