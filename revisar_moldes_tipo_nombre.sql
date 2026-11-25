-- Moldes asignados a un tipo de molde que no es el suyo (su nombre no coincide con el del tipo).
-- Caso: el tipo 474 (MOLDE LAVARROPAS AQUA 80X60 BRILLANTE, PMOL02-0087) tiene moldes de Santorini Plus, Versa 40x50,
-- Oslo 44X32 y Doha 45x35: Pintura MS ofrece esos moldes para la Aqua 80x60.
-- Ejecutar el archivo COMPLETO. La parte 2 (corrección) está comentada: revisar primero la vista previa.

-- Nombre normalizado: mayúsculas, sin tildes ni Ñ, × → X, sin "MOLDE"/"MODELO"/acabado, espacios simples
create or replace function pg_temp.norm(t text) returns text language sql immutable as $$
  select trim(regexp_replace(regexp_replace(regexp_replace(
           translate(upper(coalesce(t, '')), 'ÁÉÍÓÚÜÑ×*', 'AEIOUUNXX'),
         '\m(MOLDE|MODELO|BRILLANTE|MATE|SOFT)\M', '', 'g'),
         '\s*X\s*', 'X', 'g'),
         '\s+', ' ', 'g'))
$$;

-- 1) VISTA PREVIA: moldes (no destruidos) cuyo nombre no es el de su tipo, y el tipo que les corresponde por nombre
--    candidatos = 1 → se corrige solo; 0 = no hay tipo con ese nombre; "Molde Nuevo" = sin nombre, se revisa a mano
with tipos as (
  select tm.id, tm.molde_sku, tm.molde_descripcion, pg_temp.norm(tm.molde_descripcion) as n from public.tipos_moldes tm
)
select m.id, m.serial, m.estado, m.nombre_articulo, m.tipo_molde_id as tipo_actual, ta.molde_descripcion as nombre_tipo_actual,
       x.candidatos, x.tipo_nuevo, x.sku_nuevo, x.nombre_nuevo
  from public.moldes m
  join tipos ta on ta.id = m.tipo_molde_id
  cross join lateral (
      select count(*) as candidatos, min(t.id) as tipo_nuevo, min(t.molde_sku) as sku_nuevo, min(t.molde_descripcion) as nombre_nuevo
        from tipos t where t.n = pg_temp.norm(m.nombre_articulo)
  ) x
 where m.estado is distinct from 'Destruido'
   and pg_temp.norm(m.nombre_articulo) <> ta.n
 order by m.tipo_molde_id, m.nombre_articulo, m.serial;

-- 2) CORRECCIÓN (solo los que tienen exactamente 1 tipo con su mismo nombre). Quitar los comentarios después de revisar 1.
-- with tipos as (
--   select tm.id, pg_temp.norm(tm.molde_descripcion) as n from public.tipos_moldes tm
-- ), mapa as (
--   select m.id as molde_id, min(t.id) as tipo_nuevo, count(*) as candidatos
--     from public.moldes m
--     join tipos ta on ta.id = m.tipo_molde_id
--     join tipos t on t.n = pg_temp.norm(m.nombre_articulo)
--    where m.estado is distinct from 'Destruido' and pg_temp.norm(m.nombre_articulo) <> ta.n
--    group by m.id
-- )
-- update public.moldes m
--    set tipo_molde_id = mapa.tipo_nuevo, modificado_por = 'Corrección tipo de molde por nombre (app)', modified_at = now()
--   from mapa
--  where m.id = mapa.molde_id and mapa.candidatos = 1
-- returning m.id, m.serial, m.nombre_articulo, m.tipo_molde_id;
