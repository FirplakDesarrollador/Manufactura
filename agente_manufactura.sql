-- Agente Manufactura (bot Grok "Agente_App_Manufactura"): conexión y chat con validación.
-- 1) agente_estado: último contacto del bot (si fue hace menos de 5 min la app lo muestra "Conectado").
-- 2) agente_mensajes: preguntas de los usuarios. El bot las lee por /api/agente (con su llave AGENTE_API_KEY), deja su
--    respuesta y queda "en_validacion"; el usuario solo la ve cuando un administrador (permiso Configuración) la aprueba.
-- Estados: pendiente → en_validacion → aprobada | rechazada. Se puede ejecutar varias veces.

create table if not exists public.agente_estado (
    agente text primary key,
    nombre text,
    ultimo_contacto timestamptz,
    detalle text
);

create table if not exists public.agente_mensajes (
    id bigserial primary key,
    creado_at timestamptz not null default now(),
    usuario_email text,
    pregunta text not null check (length(pregunta) between 1 and 2000),
    estado text not null default 'pendiente' check (estado in ('pendiente', 'en_validacion', 'aprobada', 'rechazada')),
    respuesta_agente text,          -- lo que propuso el bot
    respondido_at timestamptz,
    respuesta_final text,           -- lo que ve el usuario (la del bot o la corregida por quien valida)
    validado_por text,
    validado_at timestamptz,
    nota_validacion text
);
create index if not exists agente_mensajes_estado on public.agente_mensajes (estado, creado_at);

alter table public.agente_estado enable row level security;
drop policy if exists "agente_estado lectura" on public.agente_estado;
create policy "agente_estado lectura" on public.agente_estado for select to anon, authenticated using (true);
-- El latido lo escribe /api/agente en el servidor (llave pública, protegido por AGENTE_API_KEY)
drop policy if exists "agente_estado guardar" on public.agente_estado;
create policy "agente_estado guardar" on public.agente_estado for insert to anon with check (true);
drop policy if exists "agente_estado actualizar" on public.agente_estado;
create policy "agente_estado actualizar" on public.agente_estado for update to anon using (true) with check (true);

alter table public.agente_mensajes enable row level security;
drop policy if exists "agente_mensajes lectura" on public.agente_mensajes;
create policy "agente_mensajes lectura" on public.agente_mensajes for select to anon, authenticated using (true);
drop policy if exists "agente_mensajes preguntar" on public.agente_mensajes;
create policy "agente_mensajes preguntar" on public.agente_mensajes for insert to authenticated with check (estado = 'pendiente');
-- El bot (servidor) solo puede dejar su respuesta en preguntas pendientes y pasarlas a validación; nunca aprobar
drop policy if exists "agente_mensajes responder" on public.agente_mensajes;
create policy "agente_mensajes responder" on public.agente_mensajes for update to anon
    using (estado = 'pendiente') with check (estado = 'en_validacion');
-- Quien valida (usuario con sesión) aprueba, corrige o rechaza
drop policy if exists "agente_mensajes validar" on public.agente_mensajes;
create policy "agente_mensajes validar" on public.agente_mensajes for update to authenticated using (true) with check (true);

notify pgrst, 'reload schema';

-- Verificación: debe devolver 2 filas
select table_name from information_schema.tables where table_schema = 'public' and table_name in ('agente_estado', 'agente_mensajes');
