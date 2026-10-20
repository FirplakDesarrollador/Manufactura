# Contexto de la Aplicación de Manufactura (FIRPLAK S.A.)

Este archivo contiene la documentación sobre la estructura actual del proyecto de Manufactura, el orden de navegación y las reglas de diseño para que el asistente de IA comprenda el estado actual y mantenga la coherencia en futuras tareas.

---

## 1. Estructura y Navegación Principal

### Vista de Home (`/home`)
La página principal contiene los accesos a los distintos módulos operativos de la planta. El orden de los botones es el siguiente:
1. **Control de piso**
2. **Calidad**
3. **Sistema de Producción**
4. **Mantenimiento** (anteriormente *Mtto Autónomo*)
5. **Indicadores Productividad**
6. **Asistencia**
7. **Talento Humano**: Este botón cuenta con un atajo especial llamado `"Talento Humano Atajo"`, con la palabra *Atajo* de forma sutil en cursiva y de color gris.

---

## 2. Módulo: Sistema de Producción (`/sistema-produccion`)

En esta vista se eliminó el mensaje `"¿Qué deseas consultar hoy?"` y los botones están ordenados de la siguiente manera:
1. **HDT**: Renombrado como **HDT Hoja División de Trabajo Estandarización**, estructurado en tres líneas:
   * Línea 1: **HDT** (Negrita)
   * Línea 2: **Hoja División de Trabajo** (Texto estándar)
   * Línea 3: *Estandarización* (Texto cursiva y gris claro)
2. **Hora a Hora**
3. **OPT Operativa** (anteriormente *OPT*)
4. **OPT Sistémica** (incluye de forma interna la sub-aplicación de HDT)
5. **Estadísticas del Sistema** (Redirecciona a `/estadisticas-produccion`)
6. **Tarjetas Excelencia**

---

## 3. Módulo: Estadísticas de Producción (`/estadisticas-produccion`)

Este panel consolidado cuenta con **5 pestañas** con visualizaciones completas alimentadas desde Supabase:
1. **Unificada**: KPIs de todas las herramientas integradas, gráfico de distribución de registros por planta, tendencias de rendimiento/conducta/cumplimiento mensual, registros acumulados por supervisor y rendimiento/calidad promedio por planta.
2. **Hora Hora**: Indicadores semáforo (Verde, Amarillo, Rojo), gráfico de desperdicios recurrentes e histórico de rendimiento vs calidad.
3. **OPT Operativa**: Tasas de cumplimiento de seguridad (EPP) e indicadores 5S, gráfico de radar por parámetro evaluado y calificaciones por planta.
4. **OPT Sistémica**: Nivel de cumplimiento general y cantidad de auditorías distribuidas por tipo de módulo (5S, BE, AF, etc.).
5. **HDT**: Cantidad de estándares de trabajo registrados desglosados **por Planta** (para analizar la cantidad por sección) e historial de elaboración por autor.

---

## 4. Módulo: Indicadores de Productividad (`/indicadores-productividad`)

Este módulo centraliza el tablero operativo y los visores especializados:
* **Tablero de Control (Unificado)**: Panel interactivo híbrido que precarga valores automáticos (desde APIs/Power BI) y permite edición manual en tiempo real con recálculo dinámico para las 6 plantas: MS, FV, QZ, MBL, CEFI y RMOLD (Reparación de Moldes).
  * **Indicadores clave**: Nivel de Servicio (%), Productividad (%), Productividad (PZ), Productividad (KG/MBL/Mesones), Calidad (%), Presentismo (%) y Accidentes.
  * **Edición interactiva**: Al hacer clic en cualquier cifra (valor real o meta), se abre un input en línea para sobrescribir el valor.
  * **Sincronización**: Botón "Actualizar" para re-sincronizar los valores automáticos según la fecha seleccionada.
  * **Semáforo Dinámico Unificado**:
    * **Verde (`#59a96a`)**: > 90% (o Accidentes = 0).
    * **Amarillo (`#deb841`)**: 85% - 90% (>= 85% y <= 90%).
    * **Rojo (`#d14747`)**: < 85% (o Accidentes > 0).
* **Visores de Apoyo**: Control de Piso MS, Nivel de Servicio, Productividad, Calidad (homologado con `IndicadoresCalidadView`) y Ausentismo.

---

## 5. Manual de Identidad Corporativa (FIRPLAK)

### Paleta de Colores Oficiales (Valores Exactos)
* **Navy (Primario)**: `#324354` (Estructura y jerarquía - 30% de uso)
* **Sage (Secundario)**: `#7B8E90` (Acentos y detalles visuales - 10% de uso)
* **Crema (Fondo)**: `#F6F3EE` (Fondo dominante - 60% de uso)
* **Negro (Complementario)**: `#000000` (Texto y detalles técnicos)

### Tipografía y Jerarquía
* **Montserrat**: Fuente primaria oficial para títulos, cuerpos de texto e interfaces.
* **Jost**: Utilizada para titulares principales H1 (espesor 300 / ligero).
* **Orborn**: Usada ocasionalmente para títulos especiales o logotipos decorativos.
* **Proporciones de fuente**:
  * H1: Jost (56-78px, 300)
  * H2 (Subtítulo): Montserrat (36px, 400)
  * H3 (Apartado): Montserrat (22px, 600)
  * Cuerpo: Montserrat (18px, 400)
  * Apoyo (Etiquetas/Pie): Montserrat (13px, 500)


---

## 6. Integraciones SQL y SAP Service Layer

### Habilidad (`skills/sql-sap-identifier`)
Cualquier consulta T-SQL de SAP B1 compartida por el usuario (tablas `OWOR`, `OITM`, `ORDR`, `@FIR_FAM_SYMPH`, `@FIR_AMORTIGUADORES`, `@FIR_FECHAS_PROD`, etc.) se identifica automáticamente y se mapea con:
- **API Backend Local (Next.js):** `app/api/sap/ordenes-liberadas/route.ts` (`http://localhost:3000/api/sap/ordenes-liberadas`).
- **Endpoint SAP Service Layer (OData):** `https://200.7.96.194:50000/b1s/v1/SQLQueries('ordenes_marmol_sl136')/List` (Header: `Prefer: odata.maxpagesize=500`).

---

## 7. Módulo: Gestión de Mantenimiento (`/mantenimiento/gestion-mantenimiento`)

### Regla Obligatoria de Botones de Acción Rápida:
En las siguientes **tres vistas/pestañas principales**, siempre deben estar presentes de forma consistente los dos botones de creación rápida:
1. **Planificador**: Botones `+ Correctivo` y `+ TPM`.
2. **Portal Técnicos**: Botones `+ Correctivo` y `+ TPM`.
3. **Órdenes de Trabajo (Historial)**: Botones `+ Correctivo` y `+ TPM`.

> **Importante**: Cada vez que se solicite un cambio o ajuste sobre cualquiera de estos botones, sus modales o sus formularios, dicho cambio **debe replicarse y mantenerse sincronizado en las tres pestañas**.

### Reglas de Evidencia Fotográfica en Formularios:
- **Formulario de Correctivo y TPM**: Ambos formularios deben permitir hasta **máximo 4 fotos de evidencia** (para cubrir hasta 2 fotos del "antes" y 2 del "después").
- **Acciones fotográficas**: Deben incluir tanto el botón de **Tomar Foto** (cámara en vivo / `LiveCameraModal`) como el botón de **Adjuntar Archivo** (galería / explorador de archivos).
- **Herramientas**: Cada miniatura debe permitir eliminar (`X`) y señalar en rojo con el editor de dibujo (`PhotoAnnotationEditor` / `Señalar en Rojo`).

---

## 8. Estándar de Pantalla y Visualización de Gráficas (Laptops FIRPLAK)

### Habilidad Asociada: `skills/visualizacion-graficas`
* **Hardware Estándar:** Dell Pro 14 (FIRPLAK060 / PC14250).
* **Resolución Nativa:** `1920 × 1200` (16:10).
* **Escala de Pantalla Windows:** `150%` (DPI Factor = 1.5).
* **Viewport CSS Efectivo en Navegador:**
  * **Ancho Útil:** `1280 px` (Límite exacto del breakpoint `xl` de Tailwind).
  * **Alto Útil Real (restando navegador y barra de tareas):** `~640 px a 700 px`.

### Reglas Críticas para Gráficas (Recharts) y Dashboards:
1. **Alturas de Gráficos:** Los contenedores en cuadrículas de 2 columnas deben medir entre **`h-[280px]` y `h-[340px]`** (máximo 380px para full-width) para evitar obligar al usuario a hacer scroll para ver 2 gráficas.
2. **Distribución Responsiva:** Usar `grid-cols-1 xl:grid-cols-2` o `grid-cols-1 lg:grid-cols-2`.
3. **Tipografía en SVGs de Recharts:** Mantener `fontSize={11}` o `fontSize={12}` en ejes X/Y, Tooltips y Legends para evitar empastamiento visual provocado por la escala del 150%.
4. **Paleta de Colores Oficial:** Primario Navy (`#324354`), Sage (`#7B8E90`), Verde Semáforo (`#59a96a`), Amarillo (`#deb841`), Rojo (`#d14747`).


