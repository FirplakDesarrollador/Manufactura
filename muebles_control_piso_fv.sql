-- Control de Piso Muebles (MBL) y CEFI con la configuración de Fibra (26/11/2026).
-- Ejecutar una vez en Supabase. Es seguro volver a ejecutarlo.

-- 1) Las 4 fechas del Semáforo en cada OF (igual que ordenes_fabricacion_fibra): las llena la sincronización de SAP
alter table public.ordenes_fabricacion_muebles add column if not exists fecha_entrega_lote date;
alter table public.ordenes_fabricacion_muebles add column if not exists fecha_real_liberacion date;
alter table public.ordenes_fabricacion_muebles add column if not exists fecha_ideal_entrega_produccion date;
alter table public.ordenes_fabricacion_muebles add column if not exists fecha_prometida_entrega date;
alter table public.ordenes_fabricacion_muebles add column if not exists fechas_semaforo_actualizadas timestamptz;

-- 2) Traslados: resultado de la revisión de componentes por OF, una tabla por planta (como traslados_of_rtm)
create table if not exists public.traslados_of_mbl (like public.traslados_of_fv including defaults);
create table if not exists public.traslados_of_cefi (like public.traslados_of_fv including defaults);
do $$
declare t text;
begin
  foreach t in array array['traslados_of_mbl', 'traslados_of_cefi'] loop
    if not exists (select 1 from pg_constraint where conrelid = ('public.' || t)::regclass and contype in ('p', 'u')) then
      execute format('alter table public.%I add constraint %I unique (orden_fabricacion)', t, t || '_of_key');
    end if;
    execute format('alter table public.%I enable row level security', t);
    -- La revisión corre en el servidor sin sesión (anon) y la pantalla la lee con sesión (authenticated)
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_select') then
      execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_select', t);
    end if;
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_insert') then
      execute format('create policy %I on public.%I for insert to anon, authenticated with check (true)', t || '_insert', t);
    end if;
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_update') then
      execute format('create policy %I on public.%I for update to anon, authenticated using (true) with check (true)', t || '_update', t);
    end if;
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_delete') then
      execute format('create policy %I on public.%I for delete to anon, authenticated using (true)', t || '_delete', t);
    end if;
  end loop;
end $$;

-- Verificación
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'ordenes_fabricacion_muebles' and column_name like 'fecha%' order by 1;
select count(*) as traslados_mbl from public.traslados_of_mbl;
select count(*) as traslados_cefi from public.traslados_of_cefi;
