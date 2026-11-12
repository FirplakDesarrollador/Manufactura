-- PASO 2 (cambia datos): "Carolina Escobar" es Estiven Londoño (cambio de puesto sin cambio de correo).
-- Reemplaza el nombre por el nombre completo de la base de personal: Ederson Estiven Londoño Alvarez.
-- Ejecutar SOLO después de revisar el resultado de carolina_buscar.sql.
--
-- Qué cambia:
--   a) Columnas de texto cuyo valor completo es una variante del nombre (Carolina Escobar, Carolina Escobar M., Carolina Escobar Madrid,
--      sin importar mayúsculas, tildes ni espacios): se reemplaza el valor completo.
--   b) Columnas de texto y JSON que contienen el nombre dentro de un texto más largo: se reemplaza solo el nombre.
-- Qué NO cambia: correos (no se tocan columnas cuyo valor tenga "@") y otras personas llamadas Carolina (solo "Carolina Escobar...").
-- Al final muestra cuántas filas cambió en cada tabla y columna.

create temp table if not exists _cambios (tabla text, columna text, filas bigint);
truncate _cambios;

do $$
declare r record; n bigint;
begin
    for r in
        select c.table_name, c.column_name, c.data_type
        from information_schema.columns c
        join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
        where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
          and c.data_type in ('text', 'character varying', 'jsonb')
    loop
        if r.data_type = 'jsonb' then
            execute format(
                'update public.%I set %I = replace(replace(replace(%I::text, %L, %L), %L, %L), %L, %L)::jsonb
                 where %I::text ilike %L',
                r.table_name, r.column_name, r.column_name,
                'Carolina Escobar Madrid', 'Ederson Estiven Londoño Alvarez',
                'Carolina Escobar M.', 'Ederson Estiven Londoño Alvarez',
                'Carolina Escobar', 'Ederson Estiven Londoño Alvarez',
                r.column_name, '%carolina escobar%');
        else
            execute format(
                'update public.%I set %I = case
                     when lower(regexp_replace(trim(%I), ''\s+'', '' '', ''g'')) in (''carolina escobar'', ''carolina escobar m.'', ''carolina escobar m'', ''carolina escobar madrid'')
                         then %L
                     else regexp_replace(%I, ''Carolina\s+Escobar(\s+Madrid|\s+M\.?)?'', %L, ''gi'')
                 end
                 where %I ilike %L and %I not like ''%%@%%''',
                r.table_name, r.column_name, r.column_name, 'Ederson Estiven Londoño Alvarez',
                r.column_name, 'Ederson Estiven Londoño Alvarez',
                r.column_name, '%carolina escobar%', r.column_name);
        end if;
        get diagnostics n = row_count;
        if n > 0 then insert into _cambios values (r.table_name, r.column_name, n); end if;
    end loop;
end $$;

select tabla, columna, filas as filas_cambiadas from _cambios order by tabla, columna;
