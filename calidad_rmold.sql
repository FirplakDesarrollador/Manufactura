-- =====================================================================
-- Calidad Reparación de Moldes (RMOLD)
-- Mismo módulo de Calidad MS (registro en línea, reportes del día, histórico, hora a hora, indicadores,
-- configuración y criterios), sin Saldos y destrucciones. La app usa las mismas pantallas con estas tablas
-- (lib/calidad/plantasCalidadConfig.ts):
--   rmold_defectos                    catálogo de defectos (copia de la estructura de ms_defectos)
--   rmold_reporte_defectos            un registro por pieza revisada (copia de ms_reporte_defectos + molde_id, origen)
--   rmold_referencias                 vista: tipos de molde (MS y FV) con moldes vigentes = "referencias" a escoger
--   query_rmold_reporte_defectos_dia  vista del día (misma definición de query_ms_reporte_defectos_dia)
-- Los criterios de aceptación y rechazo usan la planta 'R moldes' de criterios_calidad_plantas (ya existía).
-- Ejecutar UNA vez en el SQL Editor de Supabase. Se puede volver a ejecutar sin perder datos.
-- Después: el histórico de octubre y noviembre (datos-locales/calidad_rmold_historico.sql).
-- =====================================================================

-- 1) Tablas con la misma estructura de las de MS (columnas, tipos y valores por defecto)
create table if not exists public.rmold_defectos (like public.ms_defectos including defaults including identity);
create table if not exists public.rmold_reporte_defectos (like public.ms_reporte_defectos including defaults including identity);
alter table public.rmold_reporte_defectos add column if not exists molde_id bigint;   -- serial del molde revisado (moldes.id)
alter table public.rmold_reporte_defectos add column if not exists origen text not null default 'app';  -- app | excel_historico

-- Llave primaria en id (la copia no trae las restricciones)
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.rmold_defectos'::regclass and contype = 'p') then
    alter table public.rmold_defectos add primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.rmold_reporte_defectos'::regclass and contype = 'p') then
    alter table public.rmold_reporte_defectos add primary key (id);
  end if;
end $$;

-- Secuencias propias: si una columna de MS usa nextval(secuencia de MS), RMOLD no debe compartirla.
-- Y ninguna columna obligatoria salvo id (los registros del histórico no traen usuario ni foto).
do $$
declare t text; c record; seq text;
begin
  foreach t in array array['rmold_defectos', 'rmold_reporte_defectos'] loop
    for c in select column_name, column_default, is_nullable from information_schema.columns
              where table_schema = 'public' and table_name = t loop
      if c.column_default like 'nextval(%' and c.column_default not like '%' || t || '%' then
        seq := t || '_' || c.column_name || '_seq';
        execute format('create sequence if not exists public.%I', seq);
        execute format('alter table public.%I alter column %I set default nextval(%L)', t, c.column_name, 'public.' || seq);
        execute format('alter sequence public.%I owned by public.%I.%I', seq, t, c.column_name);
      end if;
      if c.is_nullable = 'NO' and c.column_name <> 'id' then
        execute format('alter table public.%I alter column %I drop not null', t, c.column_name);
      end if;
    end loop;
  end loop;
end $$;

create index if not exists rmold_reporte_defectos_fecha_idx on public.rmold_reporte_defectos (created_at desc);

-- 2) Referencias: tipos de molde que tienen moldes vigentes (MS y FV). Vista, para que un tipo nuevo aparezca solo.
create or replace view public.rmold_referencias as
select tm.id, coalesce(nullif(trim(tm.molde_descripcion), ''), tm.molde_sku) as "Referencia", tm.molde_sku
  from public.tipos_moldes tm
 where exists (select 1 from public.moldes m where m.tipo_molde_id = tm.id and m.estado is distinct from 'Destruido');

-- Relación del registro con su tipo de molde (la app muestra la referencia con producto:rmold_referencias)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rmold_reporte_defectos_producto_fk') then
    alter table public.rmold_reporte_defectos
      add constraint rmold_reporte_defectos_producto_fk foreign key (producto_id) references public.tipos_moldes (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rmold_reporte_defectos_molde_fk') then
    alter table public.rmold_reporte_defectos
      add constraint rmold_reporte_defectos_molde_fk foreign key (molde_id) references public.moldes (id);
  end if;
end $$;

-- 3) Vista del día: la misma de MS, cambiando las tablas por las de RMOLD
do $$
declare def text;
begin
  def := pg_get_viewdef('public.query_ms_reporte_defectos_dia'::regclass, true);
  def := regexp_replace(def, '\mms_reporte_defectos\M', 'rmold_reporte_defectos', 'g');
  def := regexp_replace(def, '\mproductos_defectos_ms\M', 'rmold_referencias', 'g');
  def := regexp_replace(def, '\mms_defectos\M', 'rmold_defectos', 'g');
  execute 'create or replace view public.query_rmold_reporte_defectos_dia as ' || def;
end $$;

-- 4) Los 12 defectos de Reparación de Moldes (hoja MOLDES del Excel de no conformes)
insert into public.rmold_defectos (id, "Defecto") overriding system value values
  (1, '1. Despiques'), (2, '2. Rayas'), (3, '3. Tallones'), (4, '4. Acumulación de cera'),
  (5, '5. Poros'), (6, '6. Deformación'), (7, '7. Rayas de lija'), (8, '8. Molde fisurado'),
  (9, '9. Sin brillo'), (10, '10. Burbuja'), (11, '11. Masilla'), (12, '12. Piel de naranja')
on conflict (id) do nothing;
-- Si id usa secuencia, que siga después del 12
do $$
declare seq text;
begin
  seq := pg_get_serial_sequence('public.rmold_defectos', 'id');
  if seq is not null then perform setval(seq, greatest((select max(id) from public.rmold_defectos), 1)); end if;
end $$;

-- 5) Permisos: lectura y registro para usuarios con sesión (el detalle por botón lo controla la app)
do $$
declare t text;
begin
  foreach t in array array['rmold_defectos', 'rmold_reporte_defectos'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_select') then
      execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select', t);
    end if;
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_insert') then
      execute format('create policy %I on public.%I for insert to authenticated with check (true)', t || '_insert', t);
    end if;
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_update') then
      execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', t || '_update', t);
    end if;
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_delete') then
      execute format('create policy %I on public.%I for delete to authenticated using (true)', t || '_delete', t);
    end if;
  end loop;
end $$;
grant select on public.rmold_referencias, public.query_rmold_reporte_defectos_dia to authenticated;

notify pgrst, 'reload schema';

-- Verificación
select count(*) as defectos from public.rmold_defectos;
select count(*) as tipos_de_molde from public.rmold_referencias;
