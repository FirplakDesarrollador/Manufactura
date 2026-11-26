-- % del turno de hoy que cada técnico pasa en producción (0 a 1), calculado por la tabla de Turnos y el horario de
-- las plantas (Gestor de Mantenimiento → Configuración). La asignación de preventivos lo usa para repartir la capacidad:
-- tareas NP (paro) solo caben en la parte del turno sin producción y las PR en la parte con producción.
-- Ej.: Jhan Carlos 93 % PR · 7 % NP con 7,2 h → 0,5 h para tareas NP y 6,7 h para PR.
alter table public.mantenimiento_tecnicos add column if not exists pct_produccion numeric;

select nombre, modalidad_operativa, pct_produccion from public.mantenimiento_tecnicos order by nombre;
