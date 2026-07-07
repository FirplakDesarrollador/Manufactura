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

Este módulo cuenta con dos secciones accesibles mediante botones de alternancia superiores:
* **Tablero BI**: Visor que embebe el reporte de Power BI mediante un iframe.
* **Tablero Manual**: Panel de control interactivo con 7 indicadores clave:
  1. **Nivel Servicio (%)** (Meta: 90%)
  2. **Productividad (%)** (Meta: 90%)
  3. **Productividad (PZ)** (Meta: 630)
  4. **Productividad (KG)** (Meta: 6300)
  5. **Calidad** (Meta: 90%)
  6. **Presentismo** (Meta: 100%)
  7. **Accidentes** (Meta: 0)

#### Comportamiento del Tablero Manual:
* **Edición al clic**: Cada número es interactivo. Al hacer clic, se transforma en un input para actualizar el valor. Al salir, se guarda y formatea automáticamente.
* **Semáforo Dinámico**: El fondo de la tarjeta cambia de color automáticamente en tiempo real usando los siguientes códigos de color:
  * **Verde (`#59a96a`)**: Meta cumplida.
  * **Amarillo (`#deb841`)**: Nivel aceptable de alerta.
  * **Rojo (`#d14747`)**: Por debajo del umbral de alerta o accidentes > 0.

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
