// Base de conocimiento de la app Manufactura FIRPLAK: módulo → submódulo → pestaña, con qué hace cada uno y cómo se usa.
// Alimenta Asistencia → Glosario de Módulos, Jerarquía y el Asistente Virtual. Al crear o cambiar una pantalla,
// actualizar aquí su descripción para que la ayuda siga al día.

export type Pestana = { nombre: string; que: string; como?: string }
export type Submodulo = { nombre: string; ruta?: string; que: string; pestanas?: Pestana[]; estado?: 'construccion' | 'externo' }
export type Modulo = {
    id: string; nombre: string; ruta: string; grupo: string
    que: string                  // para qué sirve
    quien?: string               // quién lo usa
    submodulos?: Submodulo[]
    pestanas?: Pestana[]         // módulos sin submódulos, con pestañas directas
    consejos: string[]
    conecta?: string[]           // con qué otros módulos intercambia información
    estado?: 'construccion' | 'externo'
}

export const GRUPOS = ['Operación de planta', 'Calidad y mejora', 'Mantenimiento', 'Gestión e indicadores', 'Consultas y soporte', 'Administración'] as const

const PROCESOS_MS: Pestana[] = [
    { nombre: 'Pintura', que: 'Inicio de la pieza: se elige la orden (OF), la línea y el molde, y se registra la pieza pintada con gelcoat.', como: 'Seleccione la orden en la lista, elija línea y molde abajo y oprima "Pintar". El molde queda "En uso".' },
    { nombre: 'Contramoldes', que: 'Registro de las piezas que pasan por contramolde.' },
    { nombre: 'Vaciado', que: 'Registro del vaciado de la mezcla en el molde (kilos vaciados por pieza).' },
    { nombre: 'Desmolde', que: 'Registro de la pieza retirada del molde (se hace con aire).' },
    { nombre: 'Pulido', que: 'Registro de la pieza pulida.' },
    { nombre: 'Acabado', que: 'Registro del acabado final de la pieza.' },
    { nombre: 'Reparación', que: 'Piezas enviadas a reparación y su regreso al flujo.' },
    { nombre: 'Empaque', que: 'Registro de la pieza empacada, lista para digitar.' },
    { nombre: 'Digitado', que: 'Digitación de la pieza en SAP: la pasa a Tránsito.' },
    { nombre: 'CEDI', que: 'Recepción en el Centro de Distribución: Digitado / Tránsito / CEDI con reversión.' },
    { nombre: 'Dashboard', que: 'Monitoreo en tiempo real: gráficos y tabla detallada hora a hora (acabado, CEDI, kg CEDI, kg vaciados, líneas, pintura, vaciado), carga de moldes y productos, órdenes, BI y kilos de referencia.' },
    { nombre: 'Parámetros', que: 'Kilos por producto MS con reducción en % o en kg (Kg app = Kg SAP menos la reducción).', como: 'Seleccione productos, elija % o kg, escriba el valor y oprima "Modificar".' },
    { nombre: 'Administración', que: 'Corrección de registros de trazabilidad (fechas, estados, reversos) por usuarios autorizados.' },
    { nombre: 'TV Prensado', que: 'Vista para pantalla de planta del área de prensado.' },
]

const PROCESOS_FV: Pestana[] = [
    { nombre: 'Pintura', que: 'Inicio de la pieza de Fibra: cada orden trae su franja para elegir el molde y "Pintar". Muestra el gelcoat por pieza (bañera y faldón) desde SAP.', como: 'En la franja de la orden elija el molde (con buscador) y oprima "Pintar". El kit de reparación no lleva molde y pasa directo a Digitado. Arriba: "Moldes" (buscador de moldes) y "Registros" (historial).' },
    { nombre: 'Vaciado', que: 'Piezas pintadas pendientes de vaciar, con la resina por pieza (bañera / faldón). "Registrar vaciado" o "Desgelcar pieza". En computador también "Tabla Kilos".' },
    { nombre: 'Herrajes', que: 'Instalación de herrajes en la pieza vaciada (mesas de herrajes del mapa).' },
    { nombre: 'Pulido', que: 'Registro del pulido de la pieza.' },
    { nombre: 'Ensayo', que: 'Prueba de la pieza (hidromasajes) antes de empacar.' },
    { nombre: 'Reparación', que: 'Piezas en reparación (corta o larga) y su regreso al flujo.' },
    { nombre: 'Guacales', que: 'Registro de la pieza en guacal (empaque), queda pendiente de digitar.' },
    { nombre: 'Digitado', que: 'Piezas en guacal por digitar, por pieza o en lote por orden. Cada tarjeta revisa en segundo plano los "Componentes entrega": que la bodega MP-03 tenga todo lo que SAP descuenta al entregar la OF (todo menos mano de obra).', como: 'Toque "Componentes entrega" para ver el análisis completo y qué falta exactamente. "Registrar Digitado" pasa la pieza a Tránsito y vuelve a revisar.' },
    { nombre: 'CEDI', que: 'Piezas en Digitado, Tránsito y CEDI por orden; mover Tránsito a CEDI, reversar y reporte en Excel.' },
    { nombre: 'Dashboard', que: 'Indicadores FV: acumulado por proceso del día o mes, CEDI acumulado, kg vaciados (resina + gelcoat), tiempo de ciclo Pintura → CEDI, calidad (reparación, saldo, destrucción), inventario en proceso y tabla hora a hora. Pestañas: Indicadores, Carga moldes, Carga productos, Órdenes.', como: 'Elija Día o Mes y la fecha. El día de hoy se actualiza solo cada 2 minutos.' },
    { nombre: 'Parámetros', que: 'Resina y gelcoat por pieza (bañera / faldón) de los productos FV, calculados de la lista de materiales de SAP, con reducción en % por material.', como: '"Actualizar desde SAP" recalcula todo (primero los productos de las OF pendientes). Seleccione productos, elija Resina o Gelcoat, escriba el % y "Aplicar". Los productos sin dato quedan al final.' },
    { nombre: 'Administración', que: 'Corrección de la trazabilidad de piezas FV por usuarios autorizados.' },
    { nombre: 'Planos', que: 'Planos de los productos FV.' },
    { nombre: 'Moldes', que: 'Inventario de moldes por tipo con su estado (disponible, en uso, en reparación) y ubicación; liberar moldes en uso sin pieza.' },
    { nombre: 'Traslados', que: 'Revisa cada OF pendiente contra SAP: que lo trasladado cubra la lista de materiales (accesorios y equipos, sin consumibles). Automático lunes a viernes 5 a. m., 12 m. y 5 p. m.', como: '"Revisar ahora" revisa todas; la flecha de cada OF muestra artículo por artículo. "Parámetros a revisar" define qué artículos se exigen (Sí / No).' },
    { nombre: 'Mapa de procesos', que: 'Plano de la planta FV con las mesas de cada proceso y las piezas ubicadas en cada una; ubicar desde Excel, historial y arqueo descargable.' },
]

export const MODULOS: Modulo[] = [
    {
        id: 'inicio', nombre: 'Inicio', ruta: '/home', grupo: 'Operación de planta',
        que: 'Panel de entrada con las tarjetas de los módulos a los que el usuario tiene acceso. Si el usuario solo tiene una aplicación, entra directo a ella.',
        consejos: ['Si no ve un módulo, pida el permiso en Configuración → Usuarios.', 'El menú ≡ de la izquierda del banner lleva a cualquier módulo desde cualquier pantalla.'],
    },
    {
        id: 'control-piso', nombre: 'Control de Piso', ruta: '/home/selection', grupo: 'Operación de planta',
        que: 'Registro de la producción pieza por pieza en cada proceso de planta. Cada pieza tiene trazabilidad completa (quién y cuándo pasó por cada proceso) desde que se pinta hasta que llega al CEDI.',
        quien: 'Operarios y supervisores de planta, analistas de producción.',
        submodulos: [
            { nombre: 'Control de Piso Mármol (MS)', ruta: '/marmol', que: 'Planta de Mármol Sintético. Menú lateral "Módulos MS" recogible a barra de íconos.', pestanas: PROCESOS_MS },
            { nombre: 'Control de Piso Fibra (FV)', ruta: '/fibra', que: 'Planta de Fibra de Vidrio (bañeras, hidromasajes, tinas). Encabezado con los indicadores del día (Cantidad, Programado, procesos, Tránsito, CEDI hoy, KG HOY = resina + gelcoat de lo vaciado hoy), búsqueda global, fecha y "Actualizar SAP". Menú lateral "Módulos FV".', pestanas: PROCESOS_FV },
            {
                nombre: 'Control de Piso Muebles (MBL)', ruta: '/muebles', que: 'Planta de Muebles (madera): registro por proceso y seguimiento de defectos.',
                pestanas: [
                    { nombre: 'Corte', que: 'Registro de piezas cortadas.' },
                    { nombre: 'Enchape', que: 'Registro del enchape de las piezas.' },
                    { nombre: 'Inspección', que: 'Inspección de calidad de las piezas.' },
                    { nombre: 'Empaque', que: 'Registro del empaque.' },
                    { nombre: 'Digitado / Tránsito / CEDI', que: 'Digitación en SAP, tránsito y recepción en CEDI.' },
                    { nombre: 'Defectos y Panel Defectos', que: 'Registro y tablero de defectos por proceso.' },
                    { nombre: 'Dashboard y Seguimiento', que: 'Indicadores de la planta y seguimiento de órdenes.' },
                    { nombre: 'Turnos y Supervisores', que: 'Configuración de turnos y supervisores.' },
                    { nombre: 'Administración', que: 'Corrección de registros.' },
                ],
            },
        ],
        consejos: ['Registre cada pieza al terminar el proceso: los indicadores y el Tablero de Control se alimentan de estos registros.', 'Las fechas de las órdenes (Liberación, Prometida cliente en rojo si está atrasada, Nivel de servicio) vienen del Semáforo.', 'El ícono de documento junto a la descripción abre el Detalle de la orden en SAP (materiales por grupos, comentarios, trazabilidad, traslados, vista SAP).'],
        conecta: ['Consulta SAP (órdenes liberadas, listas de materiales)', 'Calidad (saldos, destrucciones, reparaciones)', 'Tablero de Control (nivel de servicio, productividad)'],
    },
    {
        id: 'tablero-control', nombre: 'Tablero de Control', ruta: '/indicadores-productividad', grupo: 'Gestión e indicadores',
        que: 'Indicadores clave de toda la operación en un solo lugar, con gráficas estilo Power BI (filtros Año → Mes → Semana → Día, clic en un día lo refleja en los filtros) y semáforo contra la meta.',
        quien: 'Jefes, coordinadores y analistas.',
        pestanas: [
            { nombre: 'Tiempo Real', que: 'Producción del día en curso por planta.' },
            { nombre: 'Tablero de Control', que: 'Resumen de los KPI de todas las plantas con semáforo (verde sobre meta, amarillo hasta 5 puntos abajo, rojo más abajo).' },
            { nombre: 'Control de Piso', que: 'Indicadores de producción por planta y proceso.' },
            { nombre: 'Nivel de Servicio', que: 'Cumplimiento de entregas contra la fecha comprometida.' },
            { nombre: 'Productividad', que: 'Piezas y kilos por persona / hora por planta.' },
            { nombre: 'Calidad', que: 'Calidad General Plantas (IFI) y calidad por planta, con meta y semáforo.' },
            { nombre: 'Sistema de Producción', que: 'Cumplimiento de las herramientas del sistema (ejecutadas ÷ programadas, meta 90 %).' },
            { nombre: 'Mantenimiento', que: 'Indicadores de mantenimiento.' },
            { nombre: 'RMOLD', que: 'Reparación de Moldes: moldes reparados por día (total y % de cumplimiento), nivel de servicio, contramoldes y paros. Botón "Ver gráficas" desde el Informe de Turno.' },
            { nombre: 'Variación', que: 'Variación de los indicadores frente al periodo anterior.' },
            { nombre: 'Ausentismo', que: 'Ausentismo del personal por planta.' },
        ],
        consejos: ['Al abrir, los filtros quedan en el año y mes actual.', 'Haga clic en una columna de día para resaltarla y filtrar Semana y Día; vuelva a hacer clic para quitarlo.'],
        conecta: ['Control de Piso', 'Informe de Turno', 'Calidad', 'Sistema de Producción'],
    },
    {
        id: 'informe-turno', nombre: 'Informe de Turno', ruta: '/informe-turno', grupo: 'Gestión e indicadores',
        que: 'Cierre diario de cada planta: lo producido, el personal, el tiempo del turno y los paros. Reemplaza los Excel de productividad.',
        submodulos: [
            {
                nombre: 'RMOLD · Reparación de Moldes', que: 'Cierre del día de la planta de reparación de moldes.',
                pestanas: [
                    { nombre: '1-2. Moldes reparados', que: 'MS, FV, Brillados y Desmanchados. Total = MS + FV + Brillados ÷ 2 + Desmanchados ÷ 3. Contramoldes reparados aparte (no suman, solo estadística).' },
                    { nombre: '3. Tiempo laborado total turno', que: 'Hora inicio y fin, "5 min y cierre turno" y alimentaciones. Lunes a viernes 484 min, sábado 400 min; todo editable.' },
                    { nombre: '4. Personal y meta', que: 'Personas programadas (6), ausentismo, presentes y % presentismo; la meta sigue a los presentes (24 por defecto).' },
                    { nombre: '5. Paros', que: 'Paros del día con causa, familia y minutos; chips de "Paros frecuentes" para agregarlos rápido.' },
                    { nombre: '6. Observaciones', que: 'Novedades del turno.' },
                    { nombre: 'Columna derecha', que: 'Resultado del día (total, cumplimiento, paros reflejados, presentismo, tiempo disponible) y Últimos cierres.' },
                ],
            },
            { nombre: 'Mármol Sintético, Fibra de Vidrio, Muebles, CEFI, Cuarzo', que: 'Plantas siguientes del informe (en preparación, con RMOLD como plantilla).', estado: 'construccion' },
        ],
        consejos: ['Guarde el cierre al final del turno; los datos van a la pestaña RMOLD del Tablero de Control.'],
        conecta: ['Tablero de Control → RMOLD'],
    },
    {
        id: 'esquema-personal', nombre: 'Esquema de Personal', ruta: '/esquema-personal', grupo: 'Gestión e indicadores',
        que: 'Distribución del personal por planta y celda: quién está sin ubicar, quién ya está ubicado y el personal prestado de otras plantas.',
        consejos: ['Arrastre o asigne a cada persona a su celda al inicio del turno.'],
    },
    {
        id: 'tarjetas-tpm', nombre: 'Tarjetas de Anomalías TPM', ruta: '/mantenimiento/tarjetas-falla', grupo: 'Mantenimiento',
        que: 'Reporte de anomalías (condiciones anormales o fallas) en máquinas para que mantenimiento las atienda.',
        pestanas: [
            { nombre: 'Historial Tarjetas', que: 'Todas las tarjetas con su estado.' },
            { nombre: 'Nueva Tarjeta', que: 'Crear una tarjeta con máquina, descripción y fotos.' },
            { nombre: 'Indicadores', que: 'Tarjetas abiertas, cerradas y tiempos de atención.' },
            { nombre: '¿Cómo funcionan las tarjetas?', que: 'Guía de uso.' },
        ],
        consejos: ['Reporte la anomalía apenas la vea, con foto.'],
        conecta: ['Gestor de Mantenimiento'],
    },
    {
        id: 'calidad', nombre: 'Calidad', ruta: '/calidad', grupo: 'Calidad y mejora',
        que: 'Inspección, defectos, saldos y respuesta rápida ante problemas de calidad.',
        submodulos: [
            { nombre: 'Indicadores Calidad', ruta: '/calidad', que: 'Menú de Calidad y tablero de indicadores (el mismo del Tablero de Control).' },
            {
                nombre: 'Calidad MS', ruta: '/calidad/ms', que: 'Inspección de piezas de Mármol Sintético. Botones en grupo arriba:',
                pestanas: [
                    { nombre: 'Registro / inspección', que: 'Registrar la inspección de la pieza con sus defectos.' },
                    { nombre: 'Reportes del día', que: 'Lo inspeccionado en el día.' },
                    { nombre: 'Histórico', que: 'Inspecciones anteriores con filtros.' },
                    { nombre: 'Saldos y destrucciones', que: 'Piezas en saldo o destruidas con sus defectos (editables por los garantes).' },
                    { nombre: 'Hora a hora', que: 'Calidad hora a hora.' },
                    { nombre: 'Indicadores', que: 'Indicadores de calidad MS.' },
                    { nombre: 'Configuración', que: 'Defectos y parámetros del registro en línea.' },
                    { nombre: 'Criterios', que: 'Criterios de aceptación y rechazo.' },
                ],
            },
            { nombre: 'Calidad FV (Atajo)', que: 'Abre la aplicación Registro de Calidad FV (Power Apps).', estado: 'externo' },
            {
                nombre: 'Respuesta Rápida Calidad (RRC)', ruta: '/ficha-rcc', que: 'Fichas de respuesta rápida ante incidentes de calidad.',
                pestanas: [
                    { nombre: 'Historial de Fichas', que: 'Fichas creadas y su estado.' },
                    { nombre: 'Nueva Ficha', que: 'Crear ficha con el problema, responsable y acciones.' },
                    { nombre: 'Contingencias', que: 'Acciones de contención abiertas.' },
                    { nombre: 'Asistencia Diaria', que: 'Asistencia a la reunión diaria de calidad.' },
                    { nombre: 'Indicadores', que: '% de asistencia por persona.' },
                    { nombre: 'Administrador', que: 'Catálogos (procesos, responsables).' },
                ],
            },
            { nombre: 'Criterios de Aceptación y Rechazo', ruta: '/calidad/criterios', que: 'Catálogo por planta (MS, FV, MBL, Cuarzo) de defectos permitidos y no permitidos por zona, con fotos y láminas de zonas críticas.' },
            { nombre: 'Plan de Vigilancia', ruta: '/calidad/vigilancia', que: 'Chequeos en puntos críticos del proceso.', estado: 'construccion' },
            { nombre: 'QRQC', ruta: '/calidad/qrqc', que: 'Quick Response Quality Control.', estado: 'construccion' },
        ],
        consejos: ['Ante una duda de defecto, consulte Criterios antes de rechazar.', 'Un defecto que supera el % máximo del día escala a QRR.'],
        conecta: ['Control de Piso (saldos, destrucciones)', 'Tablero de Control → Calidad'],
    },
    {
        id: 'sistema-produccion', nombre: 'Sistema de Producción', ruta: '/sistema-produccion', grupo: 'Calidad y mejora',
        que: 'Herramientas de estandarización y mejora del sistema de producción y su cumplimiento.',
        submodulos: [
            { nombre: 'Estadísticas del Sistema', ruta: '/estadisticas-produccion', que: 'Cumplimiento del Sistema de Producción (ejecutadas ÷ programadas, meta 90 %) por herramienta y planta.' },
            { nombre: 'Bitácora', ruta: '/sistema-produccion/bitacora', que: 'Bitácora de turno: novedades, incidencias y actividades por turno (6 turnos configurados).' },
            {
                nombre: 'HDT · Hoja División de Trabajo', ruta: '/hdt', que: 'Estandarización del trabajo por operación.',
                pestanas: [{ nombre: 'Ver HDTs', que: 'Consultar por planta.' }, { nombre: 'Editar HDT', que: 'Modificar una HDT.' }, { nombre: 'Crear HDT', que: 'Nueva hoja.' }, { nombre: 'Estadísticas', que: 'Avance de HDT.' }, { nombre: 'Papelera', que: 'HDT eliminadas.' }],
            },
            {
                nombre: 'Hora a Hora', ruta: '/hora-a-hora', que: 'Evaluación hora a hora del cumplimiento contra la meta.',
                pestanas: [{ nombre: 'Historial', que: 'Evaluaciones guardadas.' }, { nombre: 'Nuevo', que: 'Nueva evaluación.' }, { nombre: 'Indicadores', que: 'Estadísticas.' }, { nombre: 'Guía', que: 'Cómo se hace.' }, { nombre: 'Criterios de Calificación', que: 'Cómo se califica.' }],
            },
            {
                nombre: 'OPT Operativa', ruta: '/opt', que: 'Observación Preventiva del Trabajo a los operarios.',
                pestanas: [{ nombre: 'Historial', que: 'Observaciones realizadas.' }, { nombre: 'Nuevo', que: 'Nueva observación.' }, { nombre: 'Indicadores', que: 'Estadísticas.' }, { nombre: 'Guía', que: 'Cómo se hace.' }, { nombre: 'Criterios de Calificación', que: 'Cómo se califica.' }],
            },
            {
                nombre: 'OPT Sistémica', ruta: '/opt-sistemica', que: 'Verificación de las herramientas del sistema: 5\'S, Bajas estadísticas (BE), Acompañamiento frecuente (A/F), Bitácora, Entrenamiento estandarizado (EE), Gestión de indicadores (GI), OPT, Trabajo estandarizado (TE) y Mantenimiento Autónomo (MA).',
                pestanas: [{ nombre: 'Historial', que: 'Verificaciones realizadas.' }, { nombre: 'Nuevo', que: 'Elegir la herramienta y registrar.' }, { nombre: 'Indicadores', que: 'Cumplimiento.' }, { nombre: 'Agendamiento', que: 'Programación semanal.' }, { nombre: 'Guía', que: 'Cómo se hace.' }, { nombre: 'Criterios de Calificación', que: 'Cómo se califica.' }, { nombre: 'Administración', que: 'Configuración.' }],
            },
            { nombre: "5'S", ruta: '/sistema-produccion/5s', que: 'Orden, aseo e inspección de puestos.', estado: 'construccion' },
            { nombre: 'Tarjetas Excelencia', ruta: '/tarjetas-excelencia', que: 'Ideas de mejora del personal, por categoría, con buscador.' },
            { nombre: 'Auditorías', ruta: '/sistema-produccion/auditorias', que: 'Auditorías del sistema.', estado: 'construccion' },
            { nombre: 'Reglas de Medición', ruta: '/sistema-produccion/reglas', que: 'A quién aplica cada herramienta, metas y cómo se calcula.' },
        ],
        consejos: ['Lo agendado en OPT Sistémica es lo "programado" del cumplimiento.'],
        conecta: ['Tablero de Control → Sistema de Producción'],
    },
    {
        id: 'mantenimiento', nombre: 'Mantenimiento', ruta: '/mantenimiento', grupo: 'Mantenimiento',
        que: 'Gestión del mantenimiento correctivo, preventivo y autónomo de las máquinas.',
        submodulos: [
            {
                nombre: 'Gestor de Mantenimiento', ruta: '/mantenimiento/gestion-mantenimiento', que: 'Órdenes de trabajo, preventivos y técnicos.',
                pestanas: [
                    { nombre: 'Planificador', que: 'Calendario de trabajos con buscador, "+ Correctivo", "+ TPM" e indicadores.' },
                    { nombre: 'Mis Tareas', que: 'Tablero de tareas del técnico con sesión (correctivos, TPM y preventivos asignados).' },
                    { nombre: 'Preventivo (PMP)', que: 'Plan de mantenimiento preventivo; genera las órdenes por calendario.' },
                    { nombre: 'Órdenes de Trabajo', que: 'Todas las OT (correctivas, TPM, preventivas).' },
                    { nombre: 'Indicadores', que: 'Disponibilidad, tiempos y cumplimiento.' },
                    { nombre: 'Máquinas y Equipos', que: 'Activos de la planta.' },
                    { nombre: 'Configuración', que: 'Catálogos del módulo.' },
                ],
            },
            { nombre: 'Indicadores Mantenimiento', ruta: '/mantenimiento', que: 'Menú del módulo e indicadores.' },
            { nombre: 'Almacén', ruta: '/mantenimiento/almacen', que: 'Inventario de repuestos y materiales.' },
            { nombre: 'Máquinas', ruta: '/mantenimiento/maquinas', que: 'Ficha de cada máquina, con depuración de duplicados.' },
            { nombre: 'Mantenimiento Autónomo LILAC', ruta: '/mantenimiento/lilac', que: 'Limpieza, Inspección, Lubricación, Ajuste y Control diario por el operario.' },
            { nombre: 'Puestas a Punto', ruta: '/mantenimiento/puestas-a-punto', que: 'Parámetros estándar de arranque por planta.', pestanas: [{ nombre: 'Ver / Editar', que: 'Consultar y editar.' }, { nombre: 'Crear', que: 'Nueva puesta a punto.' }, { nombre: 'Realizar', que: 'Ejecutar en máquina.' }, { nombre: 'Auditoría', que: 'Auditar.' }] },
            { nombre: 'Controles Visuales', ruta: '/mantenimiento/controles-visuales', que: 'Ayudas visuales por planta; editor e impresión en pliego.' },
            { nombre: 'Lecciones LUP / Gestión del Conocimiento', ruta: '/mantenimiento/gestion-conocimiento', que: 'Lecciones de un punto y artículos técnicos.' },
            { nombre: 'Principio de Máquina', ruta: '/mantenimiento/principio-maquina', que: 'Funcionamiento básico de cada equipo.', estado: 'construccion' },
        ],
        consejos: ['Un mismo correctivo se abre en la misma ventana desde el Planificador o las Órdenes de Trabajo.'],
        conecta: ['Tarjetas de Anomalías TPM', 'Tablero de Control → Mantenimiento'],
    },
    { id: 'notificaciones', nombre: 'Notificaciones', ruta: '/notificaciones', grupo: 'Consultas y soporte', que: 'Avisos para cada usuario: novedades, asignación de tareas, problemas y mantenimiento.', consejos: ['Módulo en desarrollo.'], estado: 'construccion' },
    { id: 'inventarios', nombre: 'Inventarios', ruta: '/inventarios', grupo: 'Consultas y soporte', que: 'Existencias de materias primas y producto.', consejos: ['Módulo en desarrollo.'], estado: 'construccion' },
    {
        id: 'consulta-sap', nombre: 'Consulta SAP', ruta: '/consulta-sap', grupo: 'Consultas y soporte',
        que: 'Consultas directas a SAP sin salir de la app.',
        pestanas: [
            { nombre: 'Consulta Órdenes', que: 'Una OF como en SAP: encabezado, componentes (requerido, consumido, bodega, método de emisión), resumen y anexos.' },
            { nombre: 'Consulta por Producto', que: 'Datos de inventario y lista de materiales de un producto.' },
            { nombre: 'Query - Semáforo', que: 'Consulta del Semáforo (fechas de las órdenes).' },
            { nombre: 'Query - Órdenes Liberadas', que: 'Órdenes liberadas pendientes.' },
            { nombre: 'Query - Entregas Producción', que: 'Entregas de producción.' },
            { nombre: 'Liberación Muebles', que: 'Liberación de órdenes de Muebles.' },
        ],
        consejos: ['Las órdenes de Fibra y Mármol se sincronizan solas de lunes a viernes a las 12 m. y 4 p. m., o con "Actualizar SAP".'],
    },
    { id: 'talento-humano', nombre: 'Talento Humano (Atajo)', ruta: 'https://talentohumano.vercel.app', grupo: 'Consultas y soporte', que: 'Portal externo de autogestión del colaborador.', consejos: ['Se abre en otra pestaña.'], estado: 'externo' },
    { id: 'moldes-atajo', nombre: 'Moldes (Atajo)', ruta: 'https://app-moldes-theta.vercel.app', grupo: 'Consultas y soporte', que: 'Aplicación externa de moldes.', consejos: ['Se abre en otra pestaña.'], estado: 'externo' },
    { id: 'firplak-com', nombre: 'Firplak.com (Atajo)', ruta: 'https://www.firplak.com', grupo: 'Consultas y soporte', que: 'Página pública con el catálogo de productos.', consejos: ['Se abre en otra pestaña.'], estado: 'externo' },
    { id: 'cultura', nombre: 'Cultura', ruta: '/cultura', grupo: 'Consultas y soporte', que: 'Propósito y comportamientos de la cultura FIRPLAK.', consejos: [] },
    { id: 'asistencia', nombre: 'Asistencia', ruta: '/asistencia', grupo: 'Consultas y soporte', que: 'Esta sección: Asistente Virtual, Glosario de Módulos y Jerarquía de la app.', consejos: ['Pregunte al asistente por cualquier módulo o pestaña, por ejemplo "¿qué hace Traslados?".'] },
    {
        id: 'agente', nombre: 'Agente Manufactura', ruta: '/agente-manufactura', grupo: 'Consultas y soporte',
        que: 'Conexión con el bot Grok "Agente_App_Manufactura": muestra si está Conectado (llamó en los últimos 5 min) y tiene un chat para preguntarle. Cada respuesta del bot queda en validación y el usuario la ve solo cuando un administrador la aprueba o la corrige.',
        pestanas: [
            { nombre: 'Conexión', que: 'Logo del bot, estado Conectado / Desconectado y último contacto.' },
            { nombre: 'Pregúntale al agente', que: 'Chat: la pregunta queda pendiente, luego "en validación" y al aprobarse aparece la respuesta con quién la validó.', como: 'Escriba la pregunta y oprima Enter.' },
            { nombre: 'Validación de respuestas', que: 'Solo administradores (permiso Configuración): aprobar, corregir o rechazar cada respuesta del bot.' },
            { nombre: 'Capacidades del agente', que: 'Análisis en tiempo real, informes automáticos, alertas y alertas proactivas: en construcción.' },
        ],
        consejos: ['El bot se conecta por /api/agente con su llave (AGENTE_API_KEY).'],
    },
    {
        id: 'configuracion', nombre: 'Configuración', ruta: '/configuracion', grupo: 'Administración',
        que: 'Usuarios, permisos y nomenclatura de plantas.',
        submodulos: [
            { nombre: 'Usuarios', ruta: '/configuracion/usuarios', que: 'Crear usuarios, cambiar contraseña y asignar permisos por módulo, submódulo y botón (Calidad MS con nivel Ver / Editar).' },
            { nombre: 'Nomenclatura de Plantas', ruta: '/configuracion/nomenclatura-plantas', que: 'Siglas y nombres oficiales de las plantas que usa toda la app.' },
        ],
        consejos: ['Solo administradores.'],
    },
]

// Flujo de la información entre módulos (para la pestaña Jerarquía)
export const FLUJO: { paso: string; detalle: string }[] = [
    { paso: 'SAP', detalle: 'Órdenes de fabricación liberadas, listas de materiales, traslados, existencias y pedidos.' },
    { paso: 'Sincronización de órdenes', detalle: '"Actualizar SAP" o automático (L-V 12 m. y 4 p. m.) carga las OF de Fibra y Mármol con las fechas del Semáforo y el pedido vinculado.' },
    { paso: 'Control de Piso', detalle: 'Cada pieza se registra proceso por proceso (Pintura → … → Digitado → Tránsito → CEDI); queda la trazabilidad con fecha, hora y usuario.' },
    { paso: 'Calidad', detalle: 'Inspección, reparaciones, saldos y destrucciones salen del mismo flujo; los criterios definen qué se acepta.' },
    { paso: 'Indicadores', detalle: 'Dashboard de cada planta, Informe de Turno y Tablero de Control consolidan producción, calidad, nivel de servicio y productividad.' },
    { paso: 'Mejora', detalle: 'Sistema de Producción (OPT, Hora a Hora, HDT…) y Mantenimiento (TPM, preventivos) atacan lo que muestran los indicadores.' },
]

const quitar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ')

// Respuesta del asistente: busca el módulo, submódulo o pestaña mencionados en la pregunta. Gana el nombre más largo;
// a igual nombre gana el módulo, luego el submódulo y luego la pestaña (salvo que también se nombre el submódulo).
export function responder(pregunta: string): string | null {
    const q = ` ${quitar(pregunta)} `
    type Cand = { largo: number; texto: string }
    const cands: Cand[] = []
    const nombreEn = (n: string) => { const k = quitar(n).split(/\s+/).filter(w => w.length > 1).join(' '); return k && q.includes(` ${k}`) ? k.length : 0 }
    for (const m of MODULOS) {
        const l = nombreEn(m.nombre.replace(/\(.*\)/, ''))
        if (l) {
            const subs = m.submodulos?.map(s => `* **${s.nombre}:** ${s.que}`).join('\n') || ''
            const tabs = m.pestanas?.map(p => `* **${p.nombre}:** ${p.que}`).join('\n') || ''
            cands.push({ largo: l + 3, texto: `**${m.nombre}**${m.estado === 'construccion' ? ' (en construcción)' : ''}\n${m.que}${m.quien ? `\n*Lo usan:* ${m.quien}` : ''}${subs ? `\n\n**Submódulos:**\n${subs}` : ''}${tabs ? `\n\n**Pestañas:**\n${tabs}` : ''}${m.consejos.length ? `\n\n*Consejo:* ${m.consejos[0]}` : ''}` })
        }
        for (const s of m.submodulos || []) {
            const ls = nombreEn(s.nombre.replace(/\(.*\)|·.*$/g, ''))
            if (ls) cands.push({ largo: ls + 1, texto: `**${s.nombre}** (${m.nombre})\n${s.que}${s.pestanas ? `\n\n**Pestañas:**\n${s.pestanas.map(p => `* **${p.nombre}:** ${p.que}`).join('\n')}` : ''}` })
            for (const p of s.pestanas || []) {
                const lp = nombreEn(p.nombre)
                // Si la pregunta nombra también el submódulo (p. ej. "Digitado en Fibra"), esa pestaña gana
                const palabras = quitar(s.nombre).split(/\s+/).filter(w => w.length > 2 && !['control', 'piso', 'de', 'del'].includes(w))
                const extra = palabras.some(w => q.includes(` ${w}`)) ? 5 : 0
                if (lp) cands.push({ largo: lp + extra, texto: `**${p.nombre}** · ${s.nombre} (${m.nombre})\n${p.que}${p.como ? `\n\n*Cómo se usa:* ${p.como}` : ''}` })
            }
        }
        for (const p of m.pestanas || []) {
            const lp = nombreEn(p.nombre)
            if (lp) cands.push({ largo: lp, texto: `**${p.nombre}** · ${m.nombre}\n${p.que}${p.como ? `\n\n*Cómo se usa:* ${p.como}` : ''}` })
        }
    }
    if (!cands.length) return null
    cands.sort((a, b) => b.largo - a.largo)
    return cands[0].texto
}
