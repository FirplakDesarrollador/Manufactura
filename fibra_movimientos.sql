-- Historial de movimientos manuales del Control de piso FV (Mapa de procesos, Ubicar desde Excel, módulo Moldes,
-- Administración). Cada arrastre, cambio de mesa, registro desde Programado, devolución a Programado, liberación
-- de molde, edición o borrado de una pieza deja una fila con usuario, hora, antes y después.
-- Es de solo agregar: nadie puede editar ni borrar filas desde la app.

create table if not exists public.movimientos_fv (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    usuario_email text not null,
    origen text not null,              -- mapa | importar_excel | moldes | administracion | pintura
    accion text not null,              -- mover | cambiar_mesa | quitar_mesa | registrar_desde_programado | devolver_programado | liberar_molde | editar_registro | eliminar_registro
    registrer text,                    -- pieza (trazabilidad_fv.registrer)
    orden_fabricacion text,
    estado_antes text,
    estado_despues text,
    mesa_antes text,
    mesa_despues text,
    molde_id bigint,
    molde_serial text,
    detalle jsonb
);

create index if not exists movimientos_fv_of_idx on public.movimientos_fv (orden_fabricacion, created_at desc);
create index if not exists movimientos_fv_fecha_idx on public.movimientos_fv (created_at desc);

alter table public.movimientos_fv enable row level security;

drop policy if exists "movimientos_fv lectura" on public.movimientos_fv;
create policy "movimientos_fv lectura" on public.movimientos_fv
    for select to authenticated using (true);

drop policy if exists "movimientos_fv registrar" on public.movimientos_fv;
create policy "movimientos_fv registrar" on public.movimientos_fv
    for insert to authenticated with check (true);
-- Sin políticas de update/delete: el historial no se puede modificar.
