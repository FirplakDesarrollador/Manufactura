import { supabase } from '@/lib/supabase';

/**
 * Genera el siguiente código consecutivo único y ascendente para la categoría especificada:
 * - PREV-1, PREV-2, PREV-3... (Preventivos de PMP)
 * - CORR-1, CORR-2, CORR-3... (Correctivos directos)
 * - TPM-1, TPM-2, TPM-3... (Tarjetas de anomalía TPM)
 */
export const getNextConsecutiveCode = async (prefix: 'PREV' | 'CORR' | 'TPM'): Promise<string> => {
  try {
    // 1. Consultar mantenimiento_ordenes
    const { data, error } = await supabase
      .from('mantenimiento_ordenes')
      .select('codigo')
      .filter('codigo', 'ilike', `${prefix}-%`);

    let maxNum = 0;

    if (!error && data) {
      data.forEach(row => {
        if (row.codigo) {
          const clean = String(row.codigo).trim();
          const parts = clean.split('-');
          if (parts.length >= 2) {
            const num = parseInt(parts[1], 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        }
      });
    }

    // 2. Si la categoría es TPM, consultar también tarjetas_falla_anomalia por seguridad
    if (prefix === 'TPM') {
      try {
        const { data: tpmData } = await supabase
          .from('tarjetas_falla_anomalia')
          .select('codigo_tarjeta')
          .filter('codigo_tarjeta', 'ilike', 'TPM-%');

        if (tpmData) {
          tpmData.forEach(row => {
            if (row.codigo_tarjeta) {
              const clean = String(row.codigo_tarjeta).trim();
              const parts = clean.split('-');
              if (parts.length >= 2) {
                const num = parseInt(parts[1], 10);
                if (!isNaN(num) && num > maxNum) {
                  maxNum = num;
                }
              }
            }
          });
        }
      } catch (e) {
        console.warn('Aviso consultando código máximo en tarjetas_falla_anomalia:', e);
      }
    }

    return `${prefix}-${maxNum + 1}`;
  } catch (err) {
    console.warn(`Error generando siguiente código ${prefix}:`, err);
    return `${prefix}-1`;
  }
};
