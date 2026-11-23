-- Historial de movimientos manuales del Control de piso MS (igual a movimientos_fv de Fibra).
-- Lo usa "Mover OF" de Administración MS: cada cambio de proceso, cambio de molde, registro desde Programado o
-- devolución a Programado deja una fila con usuario, hora, antes y después (y la fecha anterior del proceso si se
-- sobrescribió). Es de solo agregar: nadie puede editar ni borrar filas desde la app.
-- Ejecutar una vez en Supabase. Se puede ejecutar varias veces.

create table if not exists public.movimientos_ms (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    usuario_email text not null,
    origen text not null,              -- administracion
    accion text not null,              -- mover | registrar_desde_programado | devolver_programado | editar_registro
    registro_id bigint,                -- trazabilidad_ms.id
    registrer text,
    orden_fabricacion text,
    estado_antes text,
    estado_despues text,
    molde_id bigint,
    molde_serial text,
    detalle jsonb
);

create index if not exists movimientos_ms_of_idx on public.movimientos_ms (orden_fabricacion, created_at desc);
create index if not exists movimientos_ms_fecha_idx on public.movimientos_ms (created_at desc);

alter table public.movimientos_ms enable row level security;

drop policy if exists "movimientos_ms lectura" on public.movimientos_ms;
create policy "movimientos_ms lectura" on public.movimientos_ms
    for select to authenticated using (true);

drop policy if exists "movimientos_ms registrar" on public.movimientos_ms;
create policy "movimientos_ms registrar" on public.movimientos_ms
    for insert to authenticated with check (true);

notify pgrst, 'reload schema';
