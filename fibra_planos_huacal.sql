-- =====================================================================
-- Planos FV: agrega el proceso Huacal.
-- Solo cambia la regla de procesos permitidos de la tabla: no borra ni
-- modifica ningún plano (se reemplaza la regla vieja por una que incluye huacal).
-- =====================================================================

alter table public.fibra_planos
  drop constraint if exists fibra_planos_proceso_check,
  add constraint fibra_planos_proceso_check
    check (proceso in ('cantoneras', 'soldadura', 'masilla', 'pulido', 'ensamble', 'huacal'));

notify pgrst, 'reload schema';
