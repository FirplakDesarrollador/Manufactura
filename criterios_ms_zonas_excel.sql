-- Máximo permitido por zona de los criterios MS, según el Excel
-- "CRITERIOS DE  ACEPTACION Y RECHAZO MS-FV-MBL-QRTZ.xlsx", hoja "CRITERIOS MARMOL SINTETICO" (columnas F-I).
-- Emparejado por NOMBRE del defecto (la numeración del Excel es distinta). Solo cambia rojo/naranja/amarillo/verde.
-- "NO SE ACEPTA" (celda combinada en el Excel) se guarda en las 4 zonas.
BEGIN;
-- Rayas en poceso  ←  Excel fila 3: RAYAS  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '1', verde = '3' WHERE id = 1 AND planta = 'Ms';
-- Gel Coat Rajado  ←  Excel fila 4: GELCOAT RAJADO
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 2 AND planta = 'Ms';
-- Rajada al Desmoldar  ←  Excel fila 5: RAJADA AL DESMOLDAR
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 3 AND planta = 'Ms';
-- Ojo de Pez  ←  Excel fila 6: OJO DE PEZ  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '1', verde = '4' WHERE id = 4 AND planta = 'Ms';
-- Rajado por materia prima Defectuosa  ←  Excel fila 7: RAJADA POR MATERIA PRIMA DEFECTUOSA
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 5 AND planta = 'Ms';
-- Rajado por no aflojar la Flauta  ←  Excel fila 8: RAJADA POR NO AFLOJAR FLAUTA
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 6 AND planta = 'Ms';
-- Masa en gelcoat  ←  Excel fila 9: MASA EN GEL COAT
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 7 AND planta = 'Ms';
-- Desagüe Rajado  ←  Excel fila 10: DESAGUE RAJADO
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 8 AND planta = 'Ms';
-- Pieza dañada al Perforar  ←  Excel fila 12: PIEZA DAÑADA AL PERFORAR
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 9 AND planta = 'Ms';
-- Acumulación de Cera  ←  Excel fila 13: ACUMULACIÓN DE CERA  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '0', verde = '2' WHERE id = 10 AND planta = 'Ms';
-- Despique por Ruteadora  ←  Excel fila 14: DESPIQUE POR RUTEADORA  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '0', verde = '2' WHERE id = 11 AND planta = 'Ms';
-- Despique por mala manipualción  ←  Excel fila 15: DESPIQUE POR MALA MANIPULACIÓN
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 12 AND planta = 'Ms';
-- Moldes con poros  ←  Excel fila 16: MOLDE CON POROS  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '1', naranja = '1', amarillo = '1', verde = '2' WHERE id = 13 AND planta = 'Ms';
-- Rajada por operario  ←  Excel fila 17: QUEBRADA POR OPERARIO
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 14 AND planta = 'Ms';
-- Pobre de pintura  ←  Excel fila 18: POBRE DE PINTURA  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '0', verde = '1' WHERE id = 15 AND planta = 'Ms';
-- Gotera de catalizador  ←  Excel fila 19: GOTERAS DE CATALIZADOR  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '0', verde = '2' WHERE id = 16 AND planta = 'Ms';
-- Pintura contaminada por otra pintura  ←  Excel fila 20: PINTURA CONTAMINADA POR OTRA PINTURA  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '0', verde = '1' WHERE id = 17 AND planta = 'Ms';
-- Pintura contaminada  ←  Excel fila 21: PINTURA CONTAMINADA  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '2', naranja = '3', amarillo = '4', verde = '4' WHERE id = 18 AND planta = 'Ms';
-- Masa gelada por partes  ←  Excel fila 22: MASA GELADA POR PARTES
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 19 AND planta = 'Ms';
-- Burbuja por cera  ←  Excel fila 23: BURBUJA POR CERA
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 20 AND planta = 'Ms';
-- Cera glass  ←  Excel fila 24: CERA GLASS EN LA PIEZA  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '0', verde = '2' WHERE id = 21 AND planta = 'Ms';
-- Vaciada con gelcoat fresco  ←  Excel fila 25: VACIADA CON GEL COAT FRESCO
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 22 AND planta = 'Ms';
-- Hendidura en el desagüe  ←  Excel fila 26: HENDIDURA EN EL DESAGUE
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 23 AND planta = 'Ms';
-- Pintura jaspeada  ←  Excel fila 27: PINTURA JASPEADADA  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '0', verde = '1' WHERE id = 24 AND planta = 'Ms';
-- Gelcoat desmoldado  ←  Excel fila 28: GEL COAT DESMOLDADO
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 25 AND planta = 'Ms';
-- Flauta obstruida  ←  Excel fila 29: FLAUTA OBSTRUIDA
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 26 AND planta = 'Ms';
-- Pintura chorreada  ←  Excel fila 30: PINTURA CHORREADA
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '0', verde = '1' WHERE id = 27 AND planta = 'Ms';
-- Pintura con exceso de catalizador  ←  Excel fila 31: PINTURA CON EXCESO DE CATALIZADOR
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 28 AND planta = 'Ms';
-- Pintura sin catalizador  ←  Excel fila 32: PINTURA SIN CATALIZADOR
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 29 AND planta = 'Ms';
-- Falta de mezcla por detrás  ←  Excel fila 33: FALTA DE MASA POR DETRÁS
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 30 AND planta = 'Ms';
-- Falta de mezcla por detrás  ←  Excel fila 33: FALTA DE MASA POR DETRÁS
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 224 AND planta = 'Ms';
-- Fuga en la flauta  ←  Excel fila 34: FUGA EN LA FLAUTA
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 31 AND planta = 'Ms';
-- Burbuja de aire en el acabado  ←  Excel fila 35: BURBUJA DE AIRE EN EL ACABADO
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 32 AND planta = 'Ms';
-- Molde Rayado  ←  Excel fila 36: MOLDE RAYADO
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '1', amarillo = '1', verde = '3' WHERE id = 33 AND planta = 'Ms';
-- Molde fisurado  ←  Excel fila 37: MOLDE FISURADO  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '0', verde = '2' WHERE id = 34 AND planta = 'Ms';
-- Tallada por manipulación  ←  Excel fila 38: TALLADA POR MANIPULACIÓN  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '0', verde = '2' WHERE id = 35 AND planta = 'Ms';
-- Corrugada  ←  Excel fila 39: CORRUGADA  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '0', verde = '1' WHERE id = 36 AND planta = 'Ms';
-- Poros en la pieza  ←  Excel fila 40: POROS EN LA PIEZA
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '2', amarillo = '3', verde = '4' WHERE id = 37 AND planta = 'Ms';
-- Piel naranja  ←  Excel fila 41: PIEL DE NARANJA  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '0', verde = '1' WHERE id = 38 AND planta = 'Ms';
-- Pieza pelada en acabado  ←  Excel fila 42: PELADA EN ACABADO
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 39 AND planta = 'Ms';
-- MAL ACABADO POR DETRÁS DE LA PIEZA  ←  Excel fila 43: MAL ACABADO POR DETRÁS DE LA PIEZA
UPDATE public.criterios_calidad_plantas SET rojo = 'n/a', naranja = '1', amarillo = 'n/a', verde = 'n/a' WHERE id = 40 AND planta = 'Ms';
-- PESTAÑA DELGADA  ←  Excel fila 44: PESTAÑA DELGADA
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 41 AND planta = 'Ms';
-- Molde despicado  ←  Excel fila 45: MOLDE DESPICADO  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '0', verde = '1' WHERE id = 42 AND planta = 'Ms';
-- ESCALA EN CORTE DE PESTAÑA POR CNC  ←  Excel fila 46: ESCALA EN CORTE DE PESTAÑA POR CNC
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '0', verde = '1' WHERE id = 43 AND planta = 'Ms';
-- PESTAÑA DESNIVELADA  ←  Excel fila 47: PESTAÑA DESNIVELADA  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '1', naranja = '1', amarillo = '1', verde = '1' WHERE id = 44 AND planta = 'Ms';
-- PANDEADA  ←  Excel fila 48: PANDEADA  (sin cambio)
UPDATE public.criterios_calidad_plantas SET rojo = '1', naranja = '1', amarillo = '1', verde = '1' WHERE id = 45 AND planta = 'Ms';
-- Desagüe deslaminado  ←  Excel fila 49: DESAGUE DESLAMINADO
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 46 AND planta = 'Ms';
-- Gelcoat rajado por falta de mezcla  ←  Excel fila 50: PIEZA RAJADA POR FALTA DE MEZCLA
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 47 AND planta = 'Ms';
-- Rajada por burbuja por detrás  ←  Excel fila 51: RAJADA POR BURBUJA
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 48 AND planta = 'Ms';
-- Corte de la pieza por disco de ruteadora  ←  Excel fila 52: CORTE DE PIEZA POR DISCO
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 49 AND planta = 'Ms';
-- Rajada por gel por partes  ←  Excel fila 53: RAJADA POR GEL POR PARTES
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 50 AND planta = 'Ms';
-- Gelcoat deslaminado al quitar rebaba  ←  Excel fila 54: GELCOAT DESLAMINADO
UPDATE public.criterios_calidad_plantas SET rojo = '0', naranja = '0', amarillo = '1', verde = '0' WHERE id = 51 AND planta = 'Ms';
-- Pieza rajada al pegarse al molde  ←  Excel fila 55: PEGADA AL MOLDE
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 52 AND planta = 'Ms';
-- Desagüe delgado  ←  Excel fila 56: DESAGUE DELGADO
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 53 AND planta = 'Ms';
-- Desagüe grueso  ←  Excel fila 57: DESAGUE GRUESO
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 54 AND planta = 'Ms';
-- Despicada en perforación  ←  Excel fila 58: DESPICADO POR BROCA COPA
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 55 AND planta = 'Ms';
-- Despicada por falta de mezcla  ←  Excel fila 59: DESPICADO POR FALTA DE MEZCLA
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 56 AND planta = 'Ms';
-- Despique en flauta  ←  Excel fila 60: DESPICADO EN FLAUTA POR BROCA
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 57 AND planta = 'Ms';
-- Rajada por geometría de molde  ←  Excel fila 61: REVENTADO POR GEOMETRÍA DEL MOLDE
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 58 AND planta = 'Ms';
-- Rajada al quitar el contramolde  ←  Excel fila 62: PIEZA REVENTADA AL QUITAR CONTRAMOLDE
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 59 AND planta = 'Ms';
-- Desagüe desnivelado  ←  Excel fila 63: DESAGUE DESNIVELADO
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 60 AND planta = 'Ms';
-- Rajada por golpe en el proceso  ←  Excel fila 64: PIEZA RAJADA POR GOLPE EN EL PROCESO
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 61 AND planta = 'Ms';
-- Rajada en el proceso  ←  Excel fila 65: PIEZA RAJADA EN EL PROCESO
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 62 AND planta = 'Ms';
-- Flauta torcida  ←  Excel fila 66: FLAUTA TORCIDA
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 63 AND planta = 'Ms';
-- Despique en la línea  ←  Excel fila 67: DESPIQUE EN LA LINEA
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 64 AND planta = 'Ms';
-- Despique al quitar rebaba  ←  Excel fila 68: DESPIQUE AL QUITAR REBABA
UPDATE public.criterios_calidad_plantas SET rojo = 'NO SE ACEPTA', naranja = 'NO SE ACEPTA', amarillo = 'NO SE ACEPTA', verde = 'NO SE ACEPTA' WHERE id = 65 AND planta = 'Ms';
COMMIT;
