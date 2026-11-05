-- Criterios de Aceptación y Rechazo de Muebles y CEFI (planta 'Mbles/Cefi').
-- Fuente: Excel "CRITERIOS DE  ACEPTACION Y RECHAZO MS-FV-MBL-QRTZ", hoja "CRITERIOS MUEBLES".
-- 1) Fotos del Excel (copiadas en la app: public/calidad/criterios/mbl-cefi/<código>.jpg)
-- 2) "NO SE ACEPTA" en las 4 zonas (en el Excel es una celda combinada), igual que en Mármol Sintético

BEGIN;
-- 1. DESPIQUE EN CORTE
UPDATE public.criterios_calidad_plantas SET fotos = ARRAY['/calidad/criterios/mbl-cefi/1.jpg']::text[], foto = '/calidad/criterios/mbl-cefi/1.jpg' WHERE planta = 'Mbles/Cefi' AND codigo = '1';
-- 2. RAYAS
UPDATE public.criterios_calidad_plantas SET fotos = ARRAY['/calidad/criterios/mbl-cefi/2.jpg']::text[], foto = '/calidad/criterios/mbl-cefi/2.jpg' WHERE planta = 'Mbles/Cefi' AND codigo = '2';
-- 3. TALLONES
UPDATE public.criterios_calidad_plantas SET fotos = ARRAY['/calidad/criterios/mbl-cefi/3.jpg']::text[], foto = '/calidad/criterios/mbl-cefi/3.jpg' WHERE planta = 'Mbles/Cefi' AND codigo = '3';
-- 4. CANTO DESPEGADO
UPDATE public.criterios_calidad_plantas SET fotos = ARRAY['/calidad/criterios/mbl-cefi/4.jpg']::text[], foto = '/calidad/criterios/mbl-cefi/4.jpg' WHERE planta = 'Mbles/Cefi' AND codigo = '4';
-- 8. PERFORACIÓN DESFASADA
UPDATE public.criterios_calidad_plantas SET fotos = ARRAY['/calidad/criterios/mbl-cefi/8.jpg']::text[], foto = '/calidad/criterios/mbl-cefi/8.jpg' WHERE planta = 'Mbles/Cefi' AND codigo = '8';
-- 9. PERFORACIÓN DESPICADA
UPDATE public.criterios_calidad_plantas SET fotos = ARRAY['/calidad/criterios/mbl-cefi/9.jpg']::text[], foto = '/calidad/criterios/mbl-cefi/9.jpg' WHERE planta = 'Mbles/Cefi' AND codigo = '9';
-- 10. SIN PERFORACIÓN
UPDATE public.criterios_calidad_plantas SET fotos = ARRAY['/calidad/criterios/mbl-cefi/10.jpg']::text[], foto = '/calidad/criterios/mbl-cefi/10.jpg' WHERE planta = 'Mbles/Cefi' AND codigo = '10';
-- 11. ESCALA EN CORTE
UPDATE public.criterios_calidad_plantas SET fotos = ARRAY['/calidad/criterios/mbl-cefi/11.jpg']::text[], foto = '/calidad/criterios/mbl-cefi/11.jpg' WHERE planta = 'Mbles/Cefi' AND codigo = '11';
-- 12. ESCALA AL ENSAMBLAR
UPDATE public.criterios_calidad_plantas SET fotos = ARRAY['/calidad/criterios/mbl-cefi/12.jpg']::text[], foto = '/calidad/criterios/mbl-cefi/12.jpg' WHERE planta = 'Mbles/Cefi' AND codigo = '12';
-- 13. DESPIQUE POR  MANIPULACION
UPDATE public.criterios_calidad_plantas SET fotos = ARRAY['/calidad/criterios/mbl-cefi/13.jpg']::text[], foto = '/calidad/criterios/mbl-cefi/13.jpg' WHERE planta = 'Mbles/Cefi' AND codigo = '13';
-- 24. PERFORACION DESPICADA POR TORNILLO
UPDATE public.criterios_calidad_plantas SET fotos = ARRAY['/calidad/criterios/mbl-cefi/24.jpg']::text[], foto = '/calidad/criterios/mbl-cefi/24.jpg' WHERE planta = 'Mbles/Cefi' AND codigo = '24';
-- 25. RISADO
UPDATE public.criterios_calidad_plantas SET fotos = ARRAY['/calidad/criterios/mbl-cefi/25.jpg']::text[], foto = '/calidad/criterios/mbl-cefi/25.jpg' WHERE planta = 'Mbles/Cefi' AND codigo = '25';
-- 30. CANTO DESPICADO
UPDATE public.criterios_calidad_plantas SET fotos = ARRAY['/calidad/criterios/mbl-cefi/30.jpg']::text[], foto = '/calidad/criterios/mbl-cefi/30.jpg' WHERE planta = 'Mbles/Cefi' AND codigo = '30';
-- 36. MELAMINA PELADA
UPDATE public.criterios_calidad_plantas SET fotos = ARRAY['/calidad/criterios/mbl-cefi/36.jpg']::text[], foto = '/calidad/criterios/mbl-cefi/36.jpg' WHERE planta = 'Mbles/Cefi' AND codigo = '36';

-- No se acepta en ninguna zona (13 defectos)
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA'
WHERE planta = 'Mbles/Cefi' AND codigo IN ('4', '7', '10', '11', '15', '16', '18', '19', '22', '27', '28', '30', '33');
COMMIT;

-- Revisión: 14 con foto y 13 "NO SE ACEPTA"
SELECT count(*) FILTER (WHERE foto IS NOT NULL) AS con_foto, count(*) FILTER (WHERE verde = 'NO SE ACEPTA') AS no_se_acepta, count(*) AS total
FROM public.criterios_calidad_plantas WHERE planta = 'Mbles/Cefi';
