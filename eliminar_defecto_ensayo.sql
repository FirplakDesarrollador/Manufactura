-- Elimina el defecto de prueba "73. Ensayo" del catálogo MS (ms_defectos) y su criterio vinculado.
-- 1) Revisión: el defecto y si algún registro lo usa (debe dar 0 registros)
SELECT id, "Defecto" FROM public.ms_defectos WHERE "Defecto" ILIKE '73.%Ensayo%';

SELECT count(*) AS registros_con_ensayo
FROM public.ms_reporte_defectos r
JOIN public.ms_defectos d ON d."Defecto" ILIKE '73.%Ensayo%'
WHERE r.defecto::text ILIKE '%"id": ' || d.id || ',%'
   OR r.defecto::text ILIKE '%"id":' || d.id || ',%'
   OR r.defecto::text ILIKE '%Ensayo%';

-- 2) Borrado (solo si el conteo anterior es 0)
BEGIN;
DELETE FROM public.criterios_calidad_plantas
WHERE planta = 'Ms'
  AND (id_defecto_ms IN (SELECT id FROM public.ms_defectos WHERE "Defecto" ILIKE '73.%Ensayo%')
       OR (codigo = '73' AND defecto ILIKE 'Ensayo'));

DELETE FROM public.ms_defectos WHERE "Defecto" ILIKE '73.%Ensayo%';
COMMIT;
