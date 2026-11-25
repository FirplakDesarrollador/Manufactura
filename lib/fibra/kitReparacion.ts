// Kits de reparación ("KIT REPARACION COMPLETO MS BLANCO", "KIT DE REPARACIÓN …"): se preparan desde Pintura y no
// pasan por ningún proceso de la planta, así que no usan molde. Al pintarlos pasan directo a Digitado y en el mapa
// se pueden llevar a cualquier proceso (menos CEDI, que solo registra Logística en su módulo).
export const esKitReparacion = (descripcion?: string | null) =>
    /^\s*KIT\s+(DE\s+)?REPARACI[OÓ]N/i.test(descripcion || '')
