-- Defectos de Saldos y Destrucciones (Calidad MS):
-- solo los garantes pueden AGREGAR defectos o CAMBIAR su nombre:
--   Hector José Chinchilla Trigos   hector.chinchilla@firplak.com
--   Maria Isabel Escobar Laurens    supervisorcalidad3@firplak.com
--   Ederson Estiven Londoño Alvarez coordinacioncalidad@firplak.com / estiven.londono@firplak.com
-- Las casillas "Requiere foto" y "Referencia molde" siguen como estaban (las cambia quien tiene permiso de configuración).
-- No borra ni modifica defectos existentes.

-- 1) Columnas de configuración (si aún no existen)
alter table public.ms_lista_saldos_destrucciones add column if not exists "Requiere_Foto" boolean default true;
alter table public.ms_lista_saldos_destrucciones add column if not exists "Requiere_Referencia_Molde" boolean default false;

-- 2) El id se genera solo al agregar un defecto (si la columna no tiene valor por defecto)
do $$
declare seq text;
begin
    if (select column_default from information_schema.columns
        where table_schema = 'public' and table_name = 'ms_lista_saldos_destrucciones' and column_name = 'id') is null
       and not exists (select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'ms_lista_saldos_destrucciones' and column_name = 'id' and is_identity = 'YES') then
        create sequence if not exists public.ms_lista_saldos_destrucciones_id_seq owned by public.ms_lista_saldos_destrucciones.id;
        perform setval('public.ms_lista_saldos_destrucciones_id_seq', coalesce((select max(id) from public.ms_lista_saldos_destrucciones), 0) + 1, false);
        alter table public.ms_lista_saldos_destrucciones alter column id set default nextval('public.ms_lista_saldos_destrucciones_id_seq');
    end if;
end $$;

-- 3) Quién es garante
create or replace function public.es_garante_saldos() returns boolean
language sql stable as $$
    select lower(coalesce(auth.jwt() ->> 'email', '')) in (
        'hector.chinchilla@firplak.com',
        'supervisorcalidad3@firplak.com',
        'coordinacioncalidad@firplak.com',
        'estiven.londono@firplak.com')
$$;

-- 4) Cambiar el nombre o el tipo de un defecto: solo garantes
create or replace function public.ms_saldos_solo_garantes_renombran() returns trigger
language plpgsql as $$
begin
    if (new.defecto is distinct from old.defecto or new.saldo_o_destruccion is distinct from old.saldo_o_destruccion)
       and not public.es_garante_saldos() then
        raise exception 'Solo los garantes pueden cambiar el nombre de un defecto (row-level security)';
    end if;
    return new;
end $$;

drop trigger if exists trg_ms_saldos_solo_garantes_renombran on public.ms_lista_saldos_destrucciones;
create trigger trg_ms_saldos_solo_garantes_renombran
    before update on public.ms_lista_saldos_destrucciones
    for each row execute function public.ms_saldos_solo_garantes_renombran();

-- 5) Agregar defectos: solo garantes
create or replace function public.ms_saldos_solo_garantes_agregan() returns trigger
language plpgsql as $$
begin
    if not public.es_garante_saldos() then
        raise exception 'Solo los garantes pueden agregar defectos (row-level security)';
    end if;
    return new;
end $$;

drop trigger if exists trg_ms_saldos_solo_garantes_agregan on public.ms_lista_saldos_destrucciones;
create trigger trg_ms_saldos_solo_garantes_agregan
    before insert on public.ms_lista_saldos_destrucciones
    for each row execute function public.ms_saldos_solo_garantes_agregan();

-- 6) Si la tabla tiene RLS activo, permitir a los usuarios con sesión leer y actualizar, y a los garantes insertar
do $$
begin
    if (select relrowsecurity from pg_class where oid = 'public.ms_lista_saldos_destrucciones'::regclass) then
        drop policy if exists saldos_lectura on public.ms_lista_saldos_destrucciones;
        create policy saldos_lectura on public.ms_lista_saldos_destrucciones for select to authenticated using (true);
        drop policy if exists saldos_actualizar on public.ms_lista_saldos_destrucciones;
        create policy saldos_actualizar on public.ms_lista_saldos_destrucciones for update to authenticated using (true) with check (true);
        drop policy if exists saldos_agregar_garantes on public.ms_lista_saldos_destrucciones;
        create policy saldos_agregar_garantes on public.ms_lista_saldos_destrucciones for insert to authenticated with check (public.es_garante_saldos());
    end if;
end $$;

-- 7) Permisos de tabla para usuarios con sesión
grant select, insert, update on public.ms_lista_saldos_destrucciones to authenticated;
do $$
begin
    if exists (select 1 from pg_class where relname = 'ms_lista_saldos_destrucciones_id_seq') then
        grant usage on sequence public.ms_lista_saldos_destrucciones_id_seq to authenticated;
    end if;
end $$;
