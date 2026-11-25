-- Parámetros FV: resina y gelcoat por pieza (Bañera / Faldón) de cada producto de Fibra, calculados desde la lista de
-- materiales de SAP (botón "Actualizar desde SAP" en Control de Piso Fibra → Parámetros), y la reducción en % que
-- define la planta para cada material (como en Mármol). Kg app = Kg SAP × (1 − % / 100).
-- El cálculo desde SAP solo escribe las columnas de SAP; las reducciones las cambia el usuario con sesión.
-- Se puede ejecutar varias veces.
create table if not exists public.productos_fv_pesos (
    producto_sku text primary key,
    producto_descripcion text,
    resina_banera_kg numeric,
    resina_banera_tipo text,          -- Virgen | Cargada
    gelcoat_banera_kg numeric,
    resina_faldon_kg numeric,
    resina_faldon_tipo text,
    gelcoat_faldon_kg numeric,
    piezas jsonb not null default '[]'::jsonb,   -- todas las estructuras con fibra encontradas (por si hay más de 2)
    error text,                                  -- por qué no se pudo calcular (sin dato, nunca 0)
    calculado_at timestamptz,
    porcentaje_reduccion_resina numeric not null default 0 check (porcentaje_reduccion_resina >= 0 and porcentaje_reduccion_resina < 100),
    porcentaje_reduccion_gelcoat numeric not null default 0 check (porcentaje_reduccion_gelcoat >= 0 and porcentaje_reduccion_gelcoat < 100),
    modified_at timestamptz,
    modified_by text
);

alter table public.productos_fv_pesos enable row level security;
drop policy if exists "productos_fv_pesos lectura" on public.productos_fv_pesos;
create policy "productos_fv_pesos lectura" on public.productos_fv_pesos for select to anon, authenticated using (true);
-- El cálculo desde SAP corre en el servidor con la llave pública (igual que traslados_of_fv)
drop policy if exists "productos_fv_pesos guardar" on public.productos_fv_pesos;
create policy "productos_fv_pesos guardar" on public.productos_fv_pesos for insert to anon, authenticated with check (true);
drop policy if exists "productos_fv_pesos actualizar" on public.productos_fv_pesos;
create policy "productos_fv_pesos actualizar" on public.productos_fv_pesos for update to anon, authenticated using (true) with check (true);

notify pgrst, 'reload schema';

-- Verificación: debe devolver 1 fila
select table_name from information_schema.tables where table_schema = 'public' and table_name = 'productos_fv_pesos';
