-- Revisión de componentes para la entrega, guardada en el servidor (una sola para todos los equipos).
-- La escribe el servidor (botón "Actualizar componentes", ↻ de cada OF y el cron de cada hora) y la leen las pantallas
-- de Digitado (MS, FV, Muebles, CEFI). Cron: faltantes / sin dato / error cada hora; OK cada 3 horas.

create table if not exists public.revision_entrega_of (
    orden_fabricacion text primary key,
    planta        text,                       -- MS, FV, MBL, CEFI (la pantalla que la registró)
    estado        text not null,              -- completo | faltante | sin_dato | error
    exigidos      integer not null default 0,
    cubiertos     integer not null default 0,
    faltantes     integer not null default 0,
    sin_dato      integer not null default 0,
    detalle       jsonb   not null default '[]'::jsonb,
    error         text,
    calculado_at  timestamptz not null default now(),   -- última consulta a SAP
    visto_at      timestamptz not null default now()    -- última vez que una pantalla la mostró (el cron solo revisa las vistas en los últimos 2 días)
);

create index if not exists revision_entrega_of_visto_idx on public.revision_entrega_of (visto_at);
create index if not exists revision_entrega_of_estado_idx on public.revision_entrega_of (estado, calculado_at);

alter table public.revision_entrega_of enable row level security;
drop policy if exists "revision_entrega_of lectura" on public.revision_entrega_of;
create policy "revision_entrega_of lectura" on public.revision_entrega_of for select to anon, authenticated using (true);
drop policy if exists "revision_entrega_of guardar" on public.revision_entrega_of;
create policy "revision_entrega_of guardar" on public.revision_entrega_of for insert to anon, authenticated with check (true);
drop policy if exists "revision_entrega_of actualizar" on public.revision_entrega_of;
create policy "revision_entrega_of actualizar" on public.revision_entrega_of for update to anon, authenticated using (true) with check (true);

notify pgrst, 'reload schema';

-- Verificación
select estado, count(*) as ordenes, max(calculado_at) as ultima_revision
from public.revision_entrega_of group by estado order by estado;
