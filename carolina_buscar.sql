-- PASO 1 (solo lectura): busca "carolina" en TODAS las columnas de texto y JSON de las tablas de la app.
-- No cambia nada. Devuelve tabla, columna, valor encontrado y cuántas filas lo tienen.

create temp table if not exists _coincidencias (tabla text, columna text, tipo text, valor text, filas bigint);
truncate _coincidencias;

do $$
declare r record;
begin
    for r in
        select c.table_name, c.column_name, c.data_type
        from information_schema.columns c
        join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
        where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
          and c.data_type in ('text', 'character varying', 'jsonb', 'json', 'ARRAY')
    loop
        execute format(
            'insert into _coincidencias select %L, %L, %L, left(%I::text, 120), count(*) from public.%I where %I::text ilike %L group by 1, 2, 3, 4',
            r.table_name, r.column_name, r.data_type, r.column_name, r.table_name, r.column_name, '%carolina%');
    end loop;
end $$;

select tabla, columna, tipo, valor, filas from _coincidencias order by tabla, columna, filas desc;
