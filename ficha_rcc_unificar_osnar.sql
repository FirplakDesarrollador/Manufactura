-- Respuesta Rápida Calidad: unificar a "Osnar Mejias Torrealba" (nombre correcto).
-- Antes también se guardó como "Osnar Mejias Mejias", "Osnar Mejia", etc., y su asistencia histórica salía en 0 %.
-- Toca: registro_asistencia, fichas_alerta (responsable) y cat_responsables.
-- Si un mismo día quedó con los dos nombres, se deja un solo registro y gana "Presente".
BEGIN;

-- Variantes: cualquier "Osnar Mejia..." distinto del nombre correcto
CREATE TEMP TABLE osnar_variantes ON COMMIT DROP AS
SELECT DISTINCT responsable AS nombre FROM public.registro_asistencia
 WHERE responsable ILIKE 'osnar%mej%' AND responsable <> 'Osnar Mejias Torrealba'
UNION
SELECT DISTINCT responsable FROM public.fichas_alerta
 WHERE responsable ILIKE 'osnar%mej%' AND responsable <> 'Osnar Mejias Torrealba'
UNION
SELECT DISTINCT nombre FROM public.cat_responsables
 WHERE nombre ILIKE 'osnar%mej%' AND nombre <> 'Osnar Mejias Torrealba';

SELECT 'Variantes encontradas' AS paso, nombre FROM osnar_variantes;

-- 1) Asistencia: si el mismo día está con los dos nombres y la variante dice Presente, el correcto queda Presente
UPDATE public.registro_asistencia c
   SET estado = 'Presente'
 WHERE c.responsable = 'Osnar Mejias Torrealba'
   AND c.estado <> 'Presente'
   AND EXISTS (SELECT 1 FROM public.registro_asistencia v
                WHERE v.fecha = c.fecha AND v.estado = 'Presente'
                  AND v.responsable IN (SELECT nombre FROM osnar_variantes));

-- 2) Asistencia: borrar la variante en los días que ya tienen el nombre correcto
DELETE FROM public.registro_asistencia v
 WHERE v.responsable IN (SELECT nombre FROM osnar_variantes)
   AND EXISTS (SELECT 1 FROM public.registro_asistencia c
                WHERE c.fecha = v.fecha AND c.responsable = 'Osnar Mejias Torrealba');

-- 3) Asistencia: si quedaron dos variantes el mismo día, dejar una (Presente primero)
DELETE FROM public.registro_asistencia v
 USING public.registro_asistencia w
 WHERE v.responsable IN (SELECT nombre FROM osnar_variantes)
   AND w.responsable IN (SELECT nombre FROM osnar_variantes)
   AND v.fecha = w.fecha
   AND v.ctid <> w.ctid
   AND ((v.estado <> 'Presente' AND w.estado = 'Presente')
        OR ((v.estado = 'Presente') = (w.estado = 'Presente') AND v.ctid > w.ctid));

-- 4) Asistencia: renombrar lo que queda
UPDATE public.registro_asistencia SET responsable = 'Osnar Mejias Torrealba'
 WHERE responsable IN (SELECT nombre FROM osnar_variantes);

-- 5) Fichas: responsable
UPDATE public.fichas_alerta SET responsable = 'Osnar Mejias Torrealba'
 WHERE responsable IN (SELECT nombre FROM osnar_variantes);

-- 6) Catálogo: borrar la variante si en ese proceso ya está el nombre correcto; si no, renombrarla
DELETE FROM public.cat_responsables v
 WHERE v.nombre IN (SELECT nombre FROM osnar_variantes)
   AND EXISTS (SELECT 1 FROM public.cat_responsables c
                WHERE c.nombre = 'Osnar Mejias Torrealba' AND c.proceso_id IS NOT DISTINCT FROM v.proceso_id);
UPDATE public.cat_responsables SET nombre = 'Osnar Mejias Torrealba'
 WHERE nombre IN (SELECT nombre FROM osnar_variantes);

-- Resultado: asistencia de Osnar ya unificada
SELECT 'Resultado' AS paso, responsable, COUNT(*) AS dias,
       COUNT(*) FILTER (WHERE estado = 'Presente') AS presente,
       ROUND(100.0 * COUNT(*) FILTER (WHERE estado = 'Presente') / COUNT(*)) AS pct,
       MIN(fecha) AS desde, MAX(fecha) AS hasta
  FROM public.registro_asistencia
 WHERE responsable ILIKE 'osnar%'
 GROUP BY responsable;

COMMIT;
