-- Semielaborados · PASO 1 de 2 (ejecutar SOLO esto, en una pestaña de consulta aparte, y darle Run).
-- Agrega 'Semielaborados' a la lista fija de plantas (enum planta_muebles). Después ejecutar semielaborados.sql.
alter type public.planta_muebles add value if not exists 'Semielaborados';
