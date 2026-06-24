// Archivo de datos simulados actualizado con todas las Tarjetas de Excelencia

export const categorias = [
    { id: 1, nombre: "Entrenamiento de personal", icon: "GraduationCap" },
    { id: 2, nombre: "Cómo instruir (basado en método TWI)", icon: "BookOpen" },
    { id: 3, nombre: "Reuniones de inicio de turno (Animación)", icon: "Users" },
    { id: 4, nombre: "Gestión de indicadores", icon: "TrendingUp" },
    { id: 5, nombre: "Seguimiento hora a hora", icon: "Clock" },
    { id: 6, nombre: "OPT (Observaciones)", icon: "Eye" },
    { id: 7, nombre: "5S y Estándares", icon: "LayoutGrid" },
    { id: 8, nombre: "Seguridad industrial", icon: "ShieldAlert" },
    { id: 9, nombre: "Mejora continua y Solución de Problemas", icon: "RefreshCw" },
    { id: 10, nombre: "Liderazgo", icon: "Award" }
];

export const tarjetas = [
    {
        id: 1,
        titulo: "Cómo Instruir",
        categoria_id: 2,
        descripcion: "Estructura principal del método TWI para instruir al personal efectivamente asegurando comprensión.",
        pasos: [
            {
                titulo: "Paso 1 - PREPARAR AL EMPLEADO",
                items: [
                    "Ponerle cómodo al aprendiz.",
                    "Mencione el trabajo.",
                    "Averigüe cuánto sabe del trabajo.",
                    "Interésele en aprender el trabajo.",
                    "Póngale en el lugar correcto."
                ]
            },
            {
                titulo: "Paso 2 - PRESENTAR EL TRABAJO",
                items: [
                    "Enuncie, muestre e ilustre PASOS IMPORTANTES, uno por uno.",
                    "Hágalo de nuevo, acentuando PUNTOS CLAVE.",
                    "Hágalo de nuevo, diciendo razones para los Puntos Clave.",
                    "Nota: Enseñe claramente, completamente y con paciencia, pero no dé más información de que pueda digerir."
                ]
            },
            {
                titulo: "Paso 3 - INTENTAR EL TRABAJO",
                items: [
                    "Póngale a trabajar - corrija sus errores.",
                    "Haga que explique cada PASO IMPORTANTE mientras efectúa el trabajo de nuevo.",
                    "Pídale que explique cada PUNTO CLAVE mientras efectúa el trabajo de nuevo.",
                    "Pídale que explique cada razón para los puntos clave mientras efectúa el trabajo de nuevo.",
                    "Nota: Asegúrese de que comprenda. Continúe hasta que UD. esté seguro de que él/ella sabe."
                ]
            },
            {
                titulo: "Paso 4 - SEGUIMIENTO",
                items: [
                    "Enuncie los PROHIBIDOS y PORQUÉ, y el tratamiento de anomalías.",
                    "Déjelo solo con el trabajo.",
                    "Designe a quien le va a prestar ayuda.",
                    "Revísele frecuentemente.",
                    "Motívele a que haga preguntas.",
                    "Empiece a disminuir la ayuda."
                ]
            }
        ],
        puntos_clave: ["Señalar claramente los puntos clave del proceso."],
        errores_comunes: ["Dar demasiada información a la vez."],
        buenas_practicas: ["Usar lenguaje sencillo, operativo y directo."],
        ejemplo: "Si el trabajador no ha aprendido, el instructor no ha enseñado."
    },
    {
        id: 2,
        titulo: "Desglose de Proceso",
        categoria_id: 1,
        descripcion: "Metodología para identificar, detallar y estandarizar las actividades operativas asegurando la identificación de puntos clave.",
        pasos: [
            {
                titulo: "Paso 1: Planee la operación a estandarizar",
                items: [
                    "Seleccione el proceso y el operario experto.",
                    "Informe al colaborador experto de que se trata la actividad.",
                    "Prepare el formato Hoja de división.",
                    "Observe al colaborador realizar la actividad varias veces para entender el proceso."
                ]
            },
            {
                titulo: "Paso 2: Identifique los pasos importantes",
                items: [
                    "Avanza lentamente hasta que te diga detente.",
                    "Detente.",
                    "¿Que hiciste? / ¿Crees que ha avanzo el trabajo?",
                    "¿Crees que es un paso importante? / ¿Como lo llamarías? (utilice verbos)",
                    "DEFINA LOS PUNTOS CLAVE: Avanza lentamente hasta que yo te diga detente.",
                    "¿como lo hiciste? (cuestione todo, posición de cuerpo, brazos, manos, dedos...).",
                    "¿Eso determina (el éxito o fracaso, facilidad, evitar herir)? si no sabe dígale 'hágalo diferente'.",
                    "Nota: si le mencionó la razón del punto clave, tome nota.",
                    "DEFINA LA RAZÓN: Avanza al punto clave. ¿Cual es la razón? Describa lo más claro posible."
                ]
            },
            {
                titulo: "Paso 3: Verifique el aprendizaje",
                items: [
                    "Prepara el entrenamiento (puesto de trabajo).",
                    "Entrene una persona que no conozca el proceso.",
                    "Valide si aprende."
                ]
            },
            {
                titulo: "Paso 4: Entrene al equipo",
                items: [
                    "Si obtuvo resultados entrene el equipo de trabajo.",
                    "Si encuentra mejoras realícelas y corrija el desglose.",
                    "Valide que se entrene todos con las mejoras."
                ]
            }
        ],
        puntos_clave: [
            "PASO IMPORTANTE ES: Un segmento lógico de la operación cuando algo pasa que hace avanzar el trabajo.",
            "PUNTO CLAVE ES: Cualquier cosa en un paso que pueda: 1. Hacer o destruir el trabajo 2. Herir al empleado 3. Hacer el trabajo más fácil."
        ],
        errores_comunes: ["No observar múltiples veces antes de dividir."],
        buenas_practicas: ["Cuestionar posiciones físicas (manos, ojos, cuerpo) en el desglose."],
        ejemplo: ""
    },
    {
        id: 3,
        titulo: "Como Prepararse para Instruir",
        categoria_id: 2,
        descripcion: "Lo que debes hacer antes de iniciar una sesión de entrenamiento operativo.",
        pasos: [
            {
                titulo: "1. TENER UN HORARIO DE ENTRENAMIENTO",
                items: [
                    "Quien debe ser entrenado...",
                    "Para qué trabajo...",
                    "En qué fecha..."
                ]
            },
            {
                titulo: "2. DIVIDIR EL TRABAJO",
                items: [
                    "Haga una lista de Pasos importantes.",
                    "Seleccione Puntos clave.",
                    "Los aspectos de seguridad son siempre Puntos Clave."
                ]
            },
            {
                titulo: "3. TENER TODO LISTO",
                items: [
                    "Equipo adecuado, materiales, herramientas y otras cosas que ayuden a la instrucción."
                ]
            },
            {
                titulo: "4. ARREGLAR EL LUGAR DE TRABAJO",
                items: [
                    "Tal como está en las actuales condiciones de trabajo."
                ]
            }
        ],
        puntos_clave: ["La seguridad es innegociable y debe ser punto clave."],
        errores_comunes: ["Llegar al entrenamiento sin materiales."],
        buenas_practicas: ["Documentar todo previamente."],
        ejemplo: ""
    },
    {
        id: 4,
        titulo: "Guía Hora Hora",
        categoria_id: 5,
        descripcion: "Metodología de seguimiento horario para el control de piso en planta.",
        pasos: [
            {
                titulo: "Paso 1: Preparese para observar",
                items: [
                    "1. Encuentre los resultados del desempeño (rendimiento y calidad).",
                    "2. Prepare el formato HORA HORA.",
                    "3. Observe al colaborador, para definir desviaciones (6M Y 8 Desperdicios)."
                ]
            },
            {
                titulo: "Paso 2: Obtenga hechos",
                items: [
                    "4. Haga que el colaborador se sienta comodo (digale los resultados rendimiento y calidad).",
                    "5. Reconozca el trabajo cuando este lo amerite; felicitelo si va mejor del minimo esperado. De lo contrario no le diga nada."
                ]
            },
            {
                titulo: "Paso 3: Ayudelo a mejorar",
                items: [
                    "6. Ponga en causa a el colaborador.",
                    "7. Hagale caer en cuenta los puntos a mejorar. Preguntele hasta que el colaborador se de cuenta.",
                    "8. Ayudele hasta que haga la labor correctamente."
                ]
            },
            {
                titulo: "Paso 4: Comprobar resultados",
                items: [
                    "9. Animelo a realizar la labor teniendo en cuenta los puntos corregidos.",
                    "10. Pongalo a producir.",
                    "Asegúrese de haber ayudado al colaborador."
                ]
            }
        ],
        puntos_clave: ["Centrarse en los 8 desperdicios y las 6M durante la observación."],
        errores_comunes: ["Llamar la atención sin conocer los hechos reales del rendimiento."],
        buenas_practicas: ["Hacer que el propio operario descubra su desviación mediante preguntas."],
        ejemplo: ""
    },
    {
        id: 5,
        titulo: "Guía Observación de Puesto de Trabajo (OPT)",
        categoria_id: 6,
        descripcion: "Auditorías de puesto de trabajo para garantizar cumplimiento de estándares y seguridad.",
        pasos: [
            {
                titulo: "Prepárese para observar",
                items: [
                    "1. De acuerdo al plan de OPT encuentre resultados de desempeño (rendimiento y calidad) del colaborador.",
                    "2. Prepare el FORMATO OPT con sus documentos requeridos.",
                    "3. Diríjase a un lugar donde pueda observarlo de manera cómoda sin que este se de cuenta, en estado indisponible."
                ]
            },
            {
                titulo: "Haga observación lejana y cercana",
                items: [
                    "4. Observe al colaborador de manera lejana, para definir desviaciones (6 M´s), tiempos de operación, actividades que agregan valor y las que no lo hacen.",
                    "5. Tome los tiempos de cada actividad y analícelos.",
                    "6. Observe al colaborador de manera cercana, identificando las 6 M´s y 8 desperdicios."
                ]
            },
            {
                titulo: "Obtenga hechos",
                items: [
                    "7. Obtenga opiniones sentimientos y hechos del colaborador.",
                    "8. Siempre reconozca el trabajo cuando lo amerite."
                ]
            },
            {
                titulo: "Actué sobre los hallazgos",
                items: [
                    "9. Redacte los hallazgos, analizando causas, estableciendo acciones e identificando responsables.",
                    "10. Los planes de acción expóngalos en su tablero de comunicación y asegúrese que se ejecuten."
                ]
            }
        ],
        puntos_clave: ["Analizar causas en el sitio y generar compromisos visibles."],
        errores_comunes: ["Dejar hallazgos sin un plan de acción concreto asignado a un responsable."],
        buenas_practicas: ["*Ayudar: Hacer algo de manera desinteresada para otra persona por aliviarle el trabajo."],
        ejemplo: ""
    },
    {
        id: 6,
        titulo: "Guía Gestión de Bajos Indicadores",
        categoria_id: 4,
        descripcion: "Cómo reaccionar ante desviaciones negativas en indicadores clave.",
        pasos: [
            {
                titulo: "Obtenga hechos",
                items: [
                    "1. Encuentre los resultados de desempaño del colaborador y los hallazgos de observaciones.",
                    "2. Asegúrese que esta a solas con el colaborador."
                ]
            },
            {
                titulo: "Póngalo en causa",
                items: [
                    "3. Haga que el colaborador reconozca sus resultados y encuentre las causas de ellos.",
                    "4. Haga que el colaborador le diga las acciones que tomara con respecto a sus hallazgos. (Hechos)"
                ]
            },
            {
                titulo: "Obtenga en Plan de acción",
                items: [
                    "5. Haga que el colaborador escriba su compromiso con una fecha a partir del hecho y que lo firme."
                ]
            },
            {
                titulo: "Felicítelo",
                items: [
                    "6. Anímelo a cumplir el plan de acción, ya que así mejorará su estadística."
                ]
            }
        ],
        puntos_clave: ["De atención a las altas estadísticas."],
        errores_comunes: ["Tratar los bajos indicadores en público afectando el clima laboral."],
        buenas_practicas: ["Firmar un compromiso con fechas exactas."],
        ejemplo: ""
    },
    {
        id: 7,
        titulo: "Guía Gestión de Estadísticas",
        categoria_id: 4,
        descripcion: "Gestión global de rendimientos, tableros informativos y socialización.",
        pasos: [
            {
                titulo: "Prepárese para la reunión",
                items: [
                    "1. Para cualquier desviación realice una observación de puesto de trabajo, encuentre causas y redacte los planes de acción.",
                    "2. Revise que los datos del tablero de indicadores estén completos, sin ninguna desviación."
                ]
            },
            {
                titulo: "Comparta los resultados",
                items: [
                    "3. Verifique la asistencia de su equipo y póngalo cómodo.",
                    "4. Exponga los resultados, de acuerdo a: Planear, hacer, verificar y actuar de cada uno de los indicadores."
                ]
            },
            {
                titulo: "Felicite los altas estadísticas",
                items: [
                    "5. Resalte a los colaboradores cuyas estadísticas son altas; con nombre propio y dándoles atención. (No se deje desviar)."
                ]
            },
            {
                titulo: "Disponga el trabajo",
                items: [
                    "6. Informe el plan del día y/o su cumplimiento.",
                    "7. Anímelos a realizar la labor."
                ]
            }
        ],
        puntos_clave: ["Llevar tableros actualizados 100%."],
        errores_comunes: ["Olvidar mencionar los buenos resultados."],
        buenas_practicas: ["Relacionar los resultados expuestos usando ciclo PHVA."],
        ejemplo: ""
    },
    {
        id: 8,
        titulo: "Liderazgo - Acompañamiento",
        categoria_id: 10,
        descripcion: "Esquema estructurado de acompañamiento al equipo de supervisores.",
        pasos: [
            {
                titulo: "Paso 1 - PLANEE EL ACOMPAÑAMIENTO",
                items: [
                    "Haga un plan mensual para acompañar a sus supervisores.",
                    "Según el plan defina a quien acompañar.",
                    "Estudie los conceptos Ya, Comunicación, Supresión, Botones, No ser víctima, dar atención, Ordenes, Sugerencias y comentarios, comunicación en dos direcciones."
                ]
            },
            {
                titulo: "Paso 2: HAGA EL ACOMPAÑAMIENTO",
                items: [
                    "Pídale un caso reciente al supervisor y cuestione todo detalle.",
                    "Pregunte como lo manejo.",
                    "¿Que concepto de liderazgo debe Reforzar?",
                    "Refuerce el concepto explicándole y simulando."
                ]
            },
            {
                titulo: "Paso 3: VERIFIQUE EL APRENDIZAJE",
                items: [
                    "Haga que el supervisor simule el caso con usted, actué como colaborador."
                ]
            },
            {
                titulo: "Paso 4 - ACTUE",
                items: [
                    "Felicite cuando lo hace bien.",
                    "Con preguntas haga que se dé cuenta puntos a mejorar.",
                    "Haga seguimiento."
                ]
            }
        ],
        puntos_clave: ["Dominar la comunicación de dos direcciones y botones."],
        errores_comunes: ["No simular la situación (Role-play)."],
        buenas_practicas: ["Reforzar mediante simulación invirtiendo roles."],
        ejemplo: ""
    },
    {
        id: 9,
        titulo: "Reglas Solución de Problemas",
        categoria_id: 9,
        descripcion: "Estandarización de las mesas de repuesta rápida o reuniones de resolución de problemas QC Story.",
        pasos: [
            {
                titulo: "PASO 1: PLANEACIÓN DE LA REUNIÓN",
                items: [
                    "1. Piloto y administrador de problemas se reúnen a analizar el problema a designar.",
                    "2. Revisa carga de problemas por líder.",
                    "3. Asigna el líder para el problema."
                ]
            },
            {
                titulo: "PASO 2: EJECUCION DE LA REUNIÓN",
                items: [
                    "1. Presenta resultados de la semana (5min).",
                    "2. Se designan tareas puntuales (5min).",
                    "3. Revisión de tareas de la semana anterior (5min).",
                    "4. Abrir problemas según pirámide de priorización.",
                    "5. Se abre 1 solo problema.(validar si se puede más).",
                    "6. Presenta el análisis del problema de la semana anterior (5min).",
                    "7. Se orienta el método QC story o Ficha de Alerta.",
                    "8. Presenta el Avance de acciones del problema de dos semanas atrás (5min).",
                    "9. Presenta cierre del problema tres semanas atrás con verificación."
                ]
            },
            {
                titulo: "PASO 3: VERIFICAR",
                items: [
                    "1. Se confirman resultados del cierre de problemas.",
                    "2. Gestionar con los responsables problemas atrasados."
                ]
            },
            {
                titulo: "PASO 4: ACTUAR",
                items: [
                    "1. Ajustar la solución del problema.",
                    "2. Felicitar cuando esté conforme.",
                    "3. Ajustar método de la mesa de respuesta rápida con los responsables."
                ]
            }
        ],
        puntos_clave: ["Manejo estricto de tiempos de 5 min por sección en la ejecución."],
        errores_comunes: ["Asignar demasiados problemas a un solo líder a la vez sin validar carga."],
        buenas_practicas: ["Verificar los cierres reales midiendo la ausencia de recurrencia."],
        ejemplo: ""
    },
    {
        id: 10,
        titulo: "Seguimiento Semanal: Rol Administrador",
        categoria_id: 9,
        descripcion: "Acciones puntuales para el Administrador de la mesa de repuesta rápida.",
        pasos: [
            {
                titulo: "PASO 1: PLANEAR",
                items: [
                    "1. Revisar en el archivo RESPUESTA RÁPIDA BASSIS en la hoja QRR los problemas abiertos o que tengan acciones pendientes por cerrar y su fecha se encuentre atrasada.",
                    "2. Revisar con el piloto de la reunión y definir los nuevos problemas para abrir en la mesa de respuesta rápida.",
                    "3. Validar con el piloto de la reunión los indicadores de la mesa de respuesta rápida."
                ]
            },
            {
                titulo: "PASO 2: HACER",
                items: [
                    "1. Informa al responsable del problema acerca de la programación de la alerta programada para la reunión semanal de respuesta rápida, con un mínimo de anticipación de 5 días para que el responsable pueda analizar bien las acciones y ejecutarlas.",
                    "2. Dar apoyo en la metodología aplicando robustez del análisis."
                ]
            },
            {
                titulo: "PASO 3: VERIFICAR",
                items: [
                    "1. Separar el espacio en la agenda, dentro del mismo espacio de la reunión, de cada responsable programado para que le genera una alerta y tenga en cuenta el problema y la fecha a presentar.",
                    "2. Validar las evidencias de las acciones de los problemas que se van a dar cierre.",
                    "3. Verificar gráficamente la efectividad del problema."
                ]
            },
            {
                titulo: "PASO 4: ACTUAR",
                items: [
                    "1. Apoyar en la metodología de solución de problemas cuando existan desviaciones.",
                    "2. Actualizar todos los campos del tablero de respuesta rápida a la calidad."
                ]
            }
        ],
        puntos_clave: ["Se debe informar al responsable siempre con 5 días de anticipación mínima."],
        errores_comunes: ["Presentar en la reunión semanal sin alerta previa al equipo."],
        buenas_practicas: ["Actualizar el dashboard QRR y los planes en tiempo real para el equipo."],
        ejemplo: ""
    },
    {
        id: 11,
        titulo: "Solución de Problemas (PDCA)",
        categoria_id: 9,
        descripcion: "Análisis y contención inmediata de incidentes.",
        pasos: [
            {
                titulo: "Planear",
                items: [
                    "1. Analice los datos del problema asignado, detalle mediante paretos, haciendo embudo al problema hasta localiza el o los lugares de observacion.",
                    "2. Alimente el documento standard de solucion de problemas hasta fase DEFINICIÓN DEL PROBLEMA.",
                    "3. Determine las acciones contingentes lo antes posible para evitar que el problema llegue al siguiente proceso. Haga un diagrama de flujo y defina el equipo con el que va a resolver el problema.",
                    "4. Observen los procesos que ha focalizado para encontrar primeros hallazgos, diligencie el documento hasta SITUACIÓN ACTUAL.",
                    "5. De acuerdo a lo observado defina las acciones CONTINGENTES, detener rápidamente el problema, evitando pase al siguiente."
                ]
            },
            {
                titulo: "Hacer",
                items: [
                    "4 (Continuación). Definir la meta.",
                    "5. Observe el detalle de las causas y haga analisis 5 porques.",
                    "6. Establezca plan de acción.",
                    "7. Grafique el indicador clave aislando el problema."
                ]
            },
            {
                titulo: "Verificar",
                items: [
                    "1. Se confirman resultados del cierre de problemas.",
                    "2. Gestionar con los responsables problemas atrasados."
                ]
            },
            {
                titulo: "Actuar",
                items: [
                    "1. Apoyar en la metodología de solución de problemas cuando existan desviaciones y ajustar el problema.",
                    "2. Felicitar cuando esté conforme.",
                    "3. En caso de no tener los resultados esperados, el problema se debe escalonar al siguiente nivel."
                ]
            }
        ],
        puntos_clave: ["Implantar contenciones robustas inmediatamente de ocurrir."],
        errores_comunes: ["Dejar fluir la pieza defectuosa al cliente mientras se investiga."],
        buenas_practicas: ["Hacer el embudo mediante paretos reales y en la gema (lugar del problema)."],
        ejemplo: ""
    },
    {
        id: 12,
        titulo: "Presentación de los Problemas Líder del Problema",
        categoria_id: 9,
        descripcion: "Protocolo para líderes al presentar su proyecto / QC Story en las mesas directivas.",
        pasos: [
            {
                titulo: "PASO 1: Planeación de la presentación (Antes)",
                items: [
                    "1. Asegúrese de tener todo el documento estandar diligenciado (Ficha de alerta o QC Story).",
                    "2. Estudie los pasos para presentar el problema correspondiente a (Salida 1, 2 o 3).",
                    "3. Para la Salida 3 reúnase antes con el administrador para validar las evidencias de estandarización para el cierre.",
                    "4. Bajo ninguna circunstancia el espacio planeado puede quedar en blanco, busque quien lo reemplace u otro problema."
                ]
            },
            {
                titulo: "PASO 2: Presentación de los problemas (5min por salida)",
                items: [
                    "1. Salida 1: Presente definición del problema, impacto o razones de la selección, analisis de situación actual (6Ms) y acciones contingentes.",
                    "2. Salida 2: Presente la definición del problema, impacto, meta, Análisis de 5xQ, robustez del análisis y Plan de acción (sea estricto en el orden).",
                    "3. Salida 3: Presente la definición del problema, impacto, Cierre de los planes de acción, gráfica de verificación de las acciones y Estandarización."
                ]
            },
            {
                titulo: "PASO 3: Atienda la verificación del equipo",
                items: [
                    "1. Preste alta atención a los comentarios del equipo en cuanto a: a. Posibles causas u observaciones b. Metodología."
                ]
            },
            {
                titulo: "PASO 4: Actúe",
                items: [
                    "1. Pase a la siguiente etapa o cierre si obtuvo resultados.",
                    "2. En caso de tener observaciones en causas o metodología, tome acción, reúna de nuevo al equipo a la etapa que requiera volver."
                ]
            }
        ],
        puntos_clave: ["Asegúrese de ser robusto en su solución de problemas evitará mucho trabajo a todos y a usted en el futuro."],
        errores_comunes: ["Presentar sin haber validado previamente con el administrador (Especialmente en Salida 3)."],
        buenas_practicas: ["Respetar escrupulosamente los 5 minutos y no dilatar con anécdotas."],
        ejemplo: ""
    },
    {
        id: 13,
        titulo: "Planeación Espacio de Animación",
        categoria_id: 3,
        descripcion: "Pre-requisitos y estructura a nivel organizacional para reuniones efectivas operacionales (RIT / Animación).",
        pasos: [
            {
                titulo: "Planear",
                items: [
                    "1. Asegurar tiempos de entrega de informacion KPIS para respectivo analisis e informacion de parametros y flexibilizaciones para ajustes en proceso.",
                    "2. Analizar previamente KPIS, priorizar posibles problemas para calificar por gravedad, frecuencia y costo, validar parametros nuevos o flexibilizaciones en proceso.",
                    "3. Revisa los problemas abiertos previamente y jalona su solución: analiza los entregables, robustez de análisis y los solicita a el responsable."
                ]
            },
            {
                titulo: "Ejecucion",
                items: [
                    "1. Registrar los problemas a calificar en hoja MATRIZ Y PROGRAMACION en el seguimiento a reuniones de animacion."
                ]
            },
            {
                titulo: "Verificar",
                items: [
                    "1. Calificar problemas junto con el piloto de la animacion.",
                    "2. Revisar si existe algun otro problema a tener en cuenta para la asignacion."
                ]
            },
            {
                titulo: "Actuar",
                items: [
                    "1. De acuerdo a la calificacion obtenida tomar el de calificacion mas alta para la respectiva asignacion."
                ]
            }
        ],
        puntos_clave: ["Se debe hacer el filtro previo con nivel de afectación (Severidad * Frecuencia).", "El objetivo es que en la reunión de animación los puntos sean los de mayor incidencia."],
        errores_comunes: ["Entrar a la animación sin analizar previamente qué causa o KPIs tratar."],
        buenas_practicas: ["Calificación objetiva usando matriz GFC (Gravedad, Frecuencia, Costo)."],
        ejemplo: ""
    },
    {
        id: 14,
        titulo: "Espacios de Animación",
        categoria_id: 3,
        descripcion: "Dinámica operativa directa y guión de la rutina tipo RIT o revisión de KPIs.",
        pasos: [
            {
                titulo: "Planear animacion",
                items: [
                    "1. Coordinador de calidad y piloto de animacion se reúnen previamente a analizar KPIS, priorizar problemas a calificar, validan parametros nuevos o flexibilizaciones.",
                    "2. Coordinador de calidad y Piloto de animacion, califica cada problema por gravedad, frecuencia y costo; revisa carga y asignación del problema.",
                    "3. Coordinador de calidad y Piloto de animacion realiza el plan a ejecutar durante el espacio de animacion, incluyendo tiempos (parametros, flexibilizaciones)."
                ]
            },
            {
                titulo: "Ejecucion de la animacion",
                items: [
                    "1. Informa de nuevos parametros (5min), flexibilizaciones (5min), desviaciones (5min).",
                    "2. Revision de indicadores y Abrir problemas según pirámide (10min).",
                    "3. Se abre 1 solo problema y se asigna.",
                    "4. Primera salida entender el problema de semana anterior (10min).",
                    "5. Segunda salida avance del problema 2 semanas atras (10min).",
                    "6. Tercera salida avance del problema 3 semanas atras y cierre (10min).",
                    "7. Coordinador de calidad asegura actualizar el seguimiento."
                ]
            },
            {
                titulo: "Verificar",
                items: [
                    "1. Se confirman resultados del cierre de problemas.",
                    "2. Gestionar con los responsables problemas atrasados."
                ]
            },
            {
                titulo: "Actuar",
                items: [
                    "1. Apoyar en la metodología de solucion de problemas cuando existan desviaciones.",
                    "2. Felicitar cuando esté conforme.",
                    "3. Escalonar al siguiente nivel en caso de desvío general."
                ]
            }
        ],
        puntos_clave: ["Control estricto de los tiempos (Time-boxing) para cada tema."],
        errores_comunes: ["Asignar tareas en la reunión que no tengan doliente directo."],
        buenas_practicas: ["Acompañar a líderes in-situ si presentan desviaciones crónicas."],
        ejemplo: ""
    }
];
