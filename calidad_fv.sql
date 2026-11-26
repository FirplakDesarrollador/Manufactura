-- =====================================================================
-- Calidad Fibra de Vidrio (FV) — reemplaza la app "Registro de Calidad FV" de Power Apps.
-- Mismo módulo de Calidad MS (registro en línea, reportes del día, histórico, hora a hora, indicadores,
-- configuración y criterios) con lo propio de FV: línea (L1 / L2), número de la orden y entrega a CEDI.
--   fv_defectos                    catálogo de defectos: el MISMO número y nombre de Criterios FV (planta 'Fv')
--   fv_reporte_defectos            un registro por pieza revisada (copia de ms_reporte_defectos + linea, OF, entrega CEDI)
--   fv_referencias                 productos FV (de las órdenes de fabricación FV; se agregan solos los nuevos)
--   query_fv_reporte_defectos_dia  vista del día (misma definición de query_ms_reporte_defectos_dia)
-- Ejecutar en el SQL Editor de Supabase. Se puede volver a ejecutar sin perder datos.
-- =====================================================================

-- 1) Criterios FV unificados con la app de Power Apps (decisiones del 24/11/2026):
--    · 15 queda "PINTURA JASPEADA" y "SEPARACIÓN DE PIGMENTOS" pasa a ser un defecto aparte (74)
--    · Montacarga y operario siguen juntos en el 26
--    · Nuevos al final: 75 a 79 (estaban solo en Power Apps)
--    · Corrección de nombres mal escritos (50, 63, 40)
update public.criterios_calidad_plantas set defecto = 'PINTURA JASPEADA'
 where planta = 'Fv' and codigo = '15';
update public.criterios_calidad_plantas set defecto = 'FUGA EN HIDROJECT' where planta = 'Fv' and codigo = '50' and defecto ilike 'FIGA%';
update public.criterios_calidad_plantas set defecto = 'DECK DESPICADO'    where planta = 'Fv' and codigo = '63' and defecto ilike 'DESCK%';
update public.criterios_calidad_plantas set defecto = 'DESMOLDADA POR EXCESO DE MASILLA' where planta = 'Fv' and codigo = '40';

insert into public.criterios_calidad_plantas (planta, codigo, defecto, fotos)
select 'Fv', n.codigo, n.defecto, '{}'
  from (values ('74', 'SEPARACIÓN DE PIGMENTOS'), ('75', 'REVENTADA AL PERFORAR PASAMANOS'), ('76', 'PESTAÑA DELGADA'),
               ('77', 'RAYAS POR MASILLA'), ('78', 'MASILLA GELADA POR PARTES'), ('79', 'EXCESO DE CATALIZADOR')) as n(codigo, defecto)
 where not exists (select 1 from public.criterios_calidad_plantas c where c.planta = 'Fv' and c.codigo = n.codigo);

-- 2) Tablas con la misma estructura de las de MS
create table if not exists public.fv_defectos (like public.ms_defectos including defaults including identity);
create table if not exists public.fv_reporte_defectos (like public.ms_reporte_defectos including defaults including identity);
alter table public.fv_reporte_defectos add column if not exists linea text;                       -- 'L1' | 'L2'
alter table public.fv_reporte_defectos add column if not exists orden_fabricacion text;           -- número de la orden
alter table public.fv_reporte_defectos add column if not exists entrega_cedi boolean not null default false;
alter table public.fv_reporte_defectos add column if not exists origen text not null default 'app';
alter table public.fv_reporte_defectos add column if not exists fotos text[];                     -- hasta 5 fotos (la 1.ª también en fotoUrl)

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.fv_defectos'::regclass and contype = 'p') then
    alter table public.fv_defectos add primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.fv_reporte_defectos'::regclass and contype = 'p') then
    alter table public.fv_reporte_defectos add primary key (id);
  end if;
end $$;

-- Secuencias propias (no compartir las de MS) y sin columnas obligatorias salvo id
do $$
declare t text; c record; seq text;
begin
  foreach t in array array['fv_defectos', 'fv_reporte_defectos'] loop
    for c in select column_name, column_default, is_nullable from information_schema.columns
              where table_schema = 'public' and table_name = t loop
      if c.column_default like 'nextval(%' and c.column_default not like '%' || t || '%' then
        seq := t || '_' || c.column_name || '_seq';
        execute format('create sequence if not exists public.%I', seq);
        execute format('alter table public.%I alter column %I set default nextval(%L)', t, c.column_name, 'public.' || seq);
        execute format('alter sequence public.%I owned by public.%I.%I', seq, t, c.column_name);
      end if;
      if c.is_nullable = 'NO' and c.column_name not in ('id', 'entrega_cedi', 'origen') then
        execute format('alter table public.%I alter column %I drop not null', t, c.column_name);
      end if;
    end loop;
  end loop;
end $$;

create index if not exists fv_reporte_defectos_fecha_idx on public.fv_reporte_defectos (created_at desc);

-- 3) Referencias: productos de las órdenes de fabricación FV. Tabla (id fijo) que se llena sola con cada OF nueva.
create table if not exists public.fv_referencias (
    id bigint generated always as identity primary key,
    sku text unique not null,
    "Referencia" text not null
);
insert into public.fv_referencias (sku, "Referencia")
select distinct on (o.producto_sku) o.producto_sku, coalesce(nullif(trim(o.producto_descripcion), ''), o.producto_sku)
  from public.ordenes_fabricacion_fv o
 where o.producto_sku is not null and o.producto_sku <> ''
 order by o.producto_sku, o.id desc
on conflict (sku) do nothing;

-- ordenes_fabricacion_fv es una vista (no admite disparadores): la app llama esta función al abrir el registro y
-- agrega los productos de las OF nuevas. Devuelve cuántos agregó.
create or replace function public.fv_referencias_sincronizar() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into public.fv_referencias (sku, "Referencia")
  select distinct on (o.producto_sku) o.producto_sku, coalesce(nullif(trim(o.producto_descripcion), ''), o.producto_sku)
    from public.ordenes_fabricacion_fv o
   where o.producto_sku is not null and o.producto_sku <> ''
     and not exists (select 1 from public.fv_referencias r where r.sku = o.producto_sku)
   order by o.producto_sku, o.id desc
  on conflict (sku) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.fv_referencias_sincronizar() from public;
grant execute on function public.fv_referencias_sincronizar() to authenticated;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fv_reporte_defectos_producto_fk') then
    alter table public.fv_reporte_defectos
      add constraint fv_reporte_defectos_producto_fk foreign key (producto_id) references public.fv_referencias (id);
  end if;
end $$;

-- 4) Vista del día: la misma de MS, cambiando las tablas por las de FV
do $$
declare def text;
begin
  def := pg_get_viewdef('public.query_ms_reporte_defectos_dia'::regclass, true);
  def := regexp_replace(def, '\mms_reporte_defectos\M', 'fv_reporte_defectos', 'g');
  def := regexp_replace(def, '\mproductos_defectos_ms\M', 'fv_referencias', 'g');
  def := regexp_replace(def, '\mms_defectos\M', 'fv_defectos', 'g');
  execute 'create or replace view public.query_fv_reporte_defectos_dia as ' || def;
end $$;

-- 5) Defectos del registro = Criterios FV (mismo número y nombre). "Molde" en el nombre pide la referencia del molde,
--    como en Power Apps. Todos piden foto: en Power Apps una pieza con defectos no se guarda sin evidencia
--    (se puede quitar por defecto en Configuración). Se actualiza el nombre si cambia en Criterios.
insert into public.fv_defectos (id, "Defecto", "Requiere_Referencia_Molde", "Requiere_Foto") overriding system value
select c.codigo::int,
       c.codigo || '. ' || upper(left(lower(c.defecto), 1)) || substr(lower(c.defecto), 2),
       c.defecto ilike '%molde%',
       true
  from public.criterios_calidad_plantas c
 where c.planta = 'Fv' and c.codigo ~ '^\d+$'
on conflict (id) do update set "Defecto" = excluded."Defecto";
do $$
declare seq text;
begin
  seq := pg_get_serial_sequence('public.fv_defectos', 'id');
  if seq is not null then perform setval(seq, greatest((select max(id) from public.fv_defectos), 1)); end if;
end $$;

-- 6) Permisos: lectura y registro para usuarios con sesión (el detalle por botón lo controla la app)
do $$
declare t text;
begin
  foreach t in array array['fv_defectos', 'fv_reporte_defectos', 'fv_referencias'] loop
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
grant select on public.query_fv_reporte_defectos_dia to authenticated;

notify pgrst, 'reload schema';

-- Verificación
select count(*) as defectos_fv from public.fv_defectos;
select count(*) as criterios_fv from public.criterios_calidad_plantas where planta = 'Fv';
select count(*) as referencias_fv from public.fv_referencias;
