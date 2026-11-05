-- Relaciona cada item de puesta a punto con una máquina del catálogo del Gestor de Mantenimiento.
-- equipo_herramienta se conserva como texto (nombre mostrado / equipos libres sin catálogo).
ALTER TABLE public.puestas_a_punto_detalle
  ADD COLUMN IF NOT EXISTS id_maquina bigint
  REFERENCES public.mantenimiento_maquinas_equipos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_puestas_a_punto_detalle_id_maquina
  ON public.puestas_a_punto_detalle (id_maquina);
