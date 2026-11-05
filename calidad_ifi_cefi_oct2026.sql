-- IFI general: calidad diaria de CEFI, octubre 2026 (transcrita de la tabla de CEFI enviada por Calidad).
-- Se toma el % de la última fila de cada día. Si el día ya tenía dato, se reemplaza.

INSERT INTO public.calidad_ifi_diaria (fecha, planta, calidad, fuente, registrado_por, updated_at) VALUES
    ('2026-10-01', 'CEFI', 0.9720, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-02', 'CEFI', 0.9150, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-03', 'CEFI', 0.9220, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-05', 'CEFI', 0.8630, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-06', 'CEFI', 0.9660, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-07', 'CEFI', 0.9520, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-08', 'CEFI', 0.9710, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-09', 'CEFI', 0.9370, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-10', 'CEFI', 0.9410, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-13', 'CEFI', 0.9380, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-14', 'CEFI', 0.9380, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-15', 'CEFI', 0.9740, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-16', 'CEFI', 1.0000, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-17', 'CEFI', 0.9610, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-19', 'CEFI', 0.8180, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-20', 'CEFI', 0.7870, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-21', 'CEFI', 0.6620, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-22', 'CEFI', 0.9170, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-23', 'CEFI', 0.7210, 'manual', 'Tabla CEFI oct-2026', now()),
    ('2026-10-24', 'CEFI', 0.8600, 'manual', 'Tabla CEFI oct-2026', now())
ON CONFLICT (fecha, planta) DO UPDATE
SET calidad = EXCLUDED.calidad, fuente = EXCLUDED.fuente, registrado_por = EXCLUDED.registrado_por, updated_at = now();

-- Revisión: deben quedar 20 días
SELECT fecha, calidad FROM public.calidad_ifi_diaria WHERE planta = 'CEFI' AND fecha BETWEEN '2026-10-01' AND '2026-10-31' ORDER BY fecha;
