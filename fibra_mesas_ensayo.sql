-- Mapa de procesos FV: mesa física de cada pieza que va para Ensayo.
-- Las piezas en estado Ensayo pueden estar en Acabado (4 mesas), Ensamble 1 (2), Ensamble 2 (2) o Ensayo (2);
-- esos procesos no notifican, así que el supervisor ubica cada pieza arrastrándola a su mesa en el mapa.
-- Valores: 'acabado-1'..'acabado-4', 'ensamble1-1', 'ensamble1-2', 'ensamble2-1', 'ensamble2-2', 'ensayo-1', 'ensayo-2'; null = sin mesa.
-- Ejecutar una vez en el SQL Editor de Supabase.

alter table public.trazabilidad_fv add column if not exists mesa_fv text;

alter table public.trazabilidad_fv drop constraint if exists trazabilidad_fv_mesa_fv_check;
alter table public.trazabilidad_fv add constraint trazabilidad_fv_mesa_fv_check check (
    mesa_fv is null or mesa_fv in (
        'acabado-1', 'acabado-2', 'acabado-3', 'acabado-4',
        'ensamble1-1', 'ensamble1-2', 'ensamble2-1', 'ensamble2-2',
        'ensayo-1', 'ensayo-2'
    )
);

-- Sin índice único a propósito: si una pieza vuelve a Ensayo con una mesa vieja, un índice único haría fallar
-- el registro de Pulido/Reparación. El mapa no deja ocupar una mesa ocupada y, si hay repetidas, las muestra "sin mesa".
drop index if exists public.trazabilidad_fv_mesa_fv_unica;
