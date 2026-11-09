-- Mapa de procesos FV: mesas en todos los procesos (además de Ensayo).
-- Reemplaza la lista fija de mesas de fibra_mesas_ensayo.sql por un formato "<zona>-<número>",
-- p. ej. 'cedi-7', 'curadop-2', 'curadov-5', 'huacales-1'. Las zonas y cuántas mesas tiene cada una
-- las define el mapa (components/fibra/mapa/MapaProcesosFibraModule.tsx).
-- Ejecutar una vez en el SQL Editor de Supabase (después de fibra_mesas_ensayo.sql).

alter table public.trazabilidad_fv add column if not exists mesa_fv text;

alter table public.trazabilidad_fv drop constraint if exists trazabilidad_fv_mesa_fv_check;
alter table public.trazabilidad_fv add constraint trazabilidad_fv_mesa_fv_check
    check (mesa_fv is null or mesa_fv ~ '^[a-z0-9]+-[0-9]{1,2}$');
