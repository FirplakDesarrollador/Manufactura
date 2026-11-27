-- Copia en la nube del Hora a Hora en curso (27/11/2026): una fila por usuario con el borrador (evaluación, paso y
-- cronómetro). Si el celular (sobre todo Android) borra lo guardado al bloquearse, al volver a la evaluación se
-- recupera de aquí. Se borra sola cuando la evaluación se guarda o se descarta.
create table if not exists public.hora_hora_borradores (
  usuario_email text primary key,
  datos jsonb not null,
  actualizado_at timestamptz not null default now()
);

alter table public.hora_hora_borradores enable row level security;

-- Cada usuario solo ve y modifica su propio borrador
drop policy if exists "hora_hora_borradores propio" on public.hora_hora_borradores;
create policy "hora_hora_borradores propio" on public.hora_hora_borradores
  for all to authenticated
  using (lower(usuario_email) = lower(auth.jwt() ->> 'email'))
  with check (lower(usuario_email) = lower(auth.jwt() ->> 'email'));

select count(*) as borradores from public.hora_hora_borradores;
