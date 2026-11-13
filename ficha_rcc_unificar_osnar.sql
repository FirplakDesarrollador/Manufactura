-- Respuesta Rápida Calidad: unificar a "Osnar Mejias Torrealba" (nombre correcto).
-- Antes también se guardó como "Osnar Mejias Mejias", "Osnar Mejia", etc., y su asistencia histórica salía en 0 %.
-- Toca: registro_asistencia, fichas_alerta (responsable) y cat_responsables.
-- Si un mismo día quedó con los dos nombres, se deja un solo registro y gana "Presente".
-- Variante = cualquier nombre que empiece por "Osnar" y tenga "Mej", distinto del correcto.
-- Sin tablas temporales (el editor de Supabase no las conserva); se puede ejecutar varias veces.
BEGIN;

-- 1) Asistencia: si el mismo día está con los dos nombres y la variante dice Presente, el correcto queda Presente
UPDATE public.registro_asistencia c
   SET estado = 'Presente'
 WHERE c.responsable = 'Osnar Mejias Torrealba'
   AND c.estado <> 'Presente'
   AND EXISTS (SELECT 1 FROM public.registro_asistencia v
                WHERE v.fecha = c.fecha AND v.estado = 'Presente'
                  AND v.responsable ILIKE 'osnar%mej%' AND v.responsable <> 'Osnar Mejias Torrealba');

-- 2) Asistencia: borrar la variante en los días que ya tienen el nombre correcto
DELETE FROM public.registro_asistencia v
 WHERE v.responsable ILIKE 'osnar%mej%' AND v.responsable <> 'Osnar Mejias Torrealba'
   AND EXISTS (SELECT 1 FROM public.registro_asistencia c
                WHERE c.fecha = v.fecha AND c.responsable = 'Osnar Mejias Torrealba');

-- 3) Asistencia: si quedaron dos variantes el mismo día, dejar una (Presente primero)
DELETE FROM public.registro_asistencia v
 USING public.registro_asistencia w
 WHERE v.responsable ILIKE 'osnar%mej%' AND v.responsable <> 'Osnar Mejias Torrealba'
   AND w.responsable ILIKE 'osnar%mej%' AND w.responsable <> 'Osnar Mejias Torrealba'
   AND v.fecha = w.fecha
   AND v.ctid <> w.ctid
   AND ((v.estado <> 'Presente' AND w.estado = 'Presente')
        OR ((v.estado = 'Presente') = (w.estado = 'Presente') AND v.ctid > w.ctid));

-- 4) Asistencia: renombrar lo que queda
UPDATE public.registro_asistencia SET responsable = 'Osnar Mejias Torrealba'
 WHERE responsable ILIKE 'osnar%mej%' AND responsable <> 'Osnar Mejias Torrealba';

-- 5) Fichas: responsable
UPDATE public.fichas_alerta SET responsable = 'Osnar Mejias Torrealba'
 WHERE responsable ILIKE 'osnar%mej%' AND responsable <> 'Osnar Mejias Torrealba';

-- 6) Catálogo: borrar la variante si en ese proceso ya está el nombre correcto; si no, renombrarla
DELETE FROM public.cat_responsables v
 WHERE v.nombre ILIKE 'osnar%mej%' AND v.nombre <> 'Osnar Mejias Torrealba'
   AND EXISTS (SELECT 1 FROM public.cat_responsables c
                WHERE c.nombre = 'Osnar Mejias Torrealba' AND c.proceso_id IS NOT DISTINCT FROM v.proceso_id);
UPDATE public.cat_responsables SET nombre = 'Osnar Mejias Torrealba'
 WHERE nombre ILIKE 'osnar%mej%' AND nombre <> 'Osnar Mejias Torrealba';

COMMIT;

-- Resultado: asistencia de Osnar ya unificada (debe salir una sola fila)
SELECT responsable, COUNT(*) AS dias,
       COUNT(*) FILTER (WHERE estado = 'Presente') AS presente,
       ROUND(100.0 * COUNT(*) FILTER (WHERE estado = 'Presente') / COUNT(*)) AS pct,
       MIN(fecha) AS desde, MAX(fecha) AS hasta
  FROM public.registro_asistencia
 WHERE responsable ILIKE 'osnar%'
 GROUP BY responsable;
