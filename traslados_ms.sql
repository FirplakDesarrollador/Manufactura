-- Traslados en el Control de Piso Mármol (MS) (26/11/2026): resultado de la revisión de componentes por OF,
-- igual que traslados_of_fv / _rtm / _mbl / _cefi. Ejecutar una vez en Supabase (es seguro repetirlo).
create table if not exists public.traslados_of_ms (like public.traslados_of_fv including defaults);
do $$
declare t text := 'traslados_of_ms';
begin
  if not exists (select 1 from pg_constraint where conrelid = ('public.' || t)::regclass and contype in ('p', 'u')) then
    execute format('alter table public.%I add constraint %I unique (orden_fabricacion)', t, t || '_of_key');
  end if;
  execute format('alter table public.%I enable row level security', t);
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
end $$;

select count(*) as traslados_ms from public.traslados_of_ms;
