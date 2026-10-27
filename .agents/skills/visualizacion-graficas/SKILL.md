---
name: visualizacion-graficas
description: Estándares de visualización, diseño de dashboards y configuración de gráficas en Recharts optimizados para los computadores Dell Pro 14 (1920x1200 al 150% de escala) de FIRPLAK S.A.
---

# Skill: Visualización de Gráficas y Dashboards (FIRPLAK S.A.)

Esta habilidad define los estándares técnicos, ergonómicos y de diseño para la creación, ajuste y visualización de gráficos interactivos con **Recharts** dentro de la aplicación de Manufactura FIRPLAK.

---

## 1. Perfil de Pantalla Estándar (Hardware FIRPLAK)

La gran mayoría de los usuarios de planta y administrativos en Firplak visualizan la aplicación en equipos corporativos con la siguiente configuración:

* **Equipo Típico:** Dell Pro 14 (ej. FIRPLAK060 / PC14250).
* **Resolución Nativa del Panel:** `1920 × 1200` píxeles (Aspect Ratio 16:10).
* **Escala de Windows (DPI):** `150%` (Factor 1.5).

### Dimensiones Efectivas en Navegador (CSS Viewport):
$$\text{Ancho Viewport} = \frac{1920}{1.5} = \mathbf{1280\,\text{px}}$$
$$\text{Alto Viewport Total} = \frac{1200}{1.5} = \mathbf{800\,\text{px}}$$
$$\text{Alto Útil Web (descontando barra de tareas y navegador)} \approx \mathbf{640\,\text{px} - 700\,\text{px}}$$

> [!IMPORTANT]
> Un viewport de **1280 × 680 px** significa que la pantalla cae exactamente en el breakpoint `xl` de Tailwind (1280px) y tiene una altura vertical limitada. Cualquier diseño debe evitar sobrecargar la altura vertical y priorizar información sin scroll excesivo.

---

## 2. Reglas de Dimensionamiento para Recharts

### Altura de Contenedores (`ResponsiveContainer` / tarjetas):
* **Dashboards de 2 columnas (`grid-cols-1 xl:grid-cols-2`):**
  * Altura ideal: `h-[280px]` a `h-[340px]`.
  * Esto permite ver el encabezado, filtros y dos tarjetas de gráficos completos simultáneamente sin scroll.
* **Gráficos de ancho completo (`col-span-full`):**
  * Altura ideal: `h-[320px]` a `h-[380px]`.
* **Gráficos compactos / Mini-KPIs (`grid-cols-3` o `grid-cols-4`):**
  * Altura ideal: `h-[200px]` a `h-[240px]`.
* **Prohibido:** Alturas fijas de `450px`, `500px` o superiores en gráficos individuales, ya que consumen más del 75% del alto de la pantalla del usuario.

### Grids Responsivos:
```tsx
// Estándar recomendado para layouts de gráficas en Firplak:
<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
  <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e2ded5] shadow-xs">
    {/* Gráfico 1 */}
  </div>
  <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e2ded5] shadow-xs">
    {/* Gráfico 2 */}
  </div>
</div>
```

---

## 3. Tipografía y Legibilidad de Ejes (SVG Recharts)

Debido a la escala de 150%, los textos en SVG se agrandan visiblemente. Se deben usar los siguientes tamaños:

* **Etiquetas de Eje X e Y (`tick`):**
  * `fontSize: 11` o `fontSize: 12` (nunca 14px o 16px).
  * Color: `#7B8E90` o `#64748b`.
* **Inclinación de Eje X:**
  * Si hay más de 6 categorías o nombres de plantas/máquinas, aplicar ángulo:
  * `<XAxis dataKey="nombre" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={50} />`
* **Tooltips personalizados:**
  * Fondo blanco `#FFFFFF` o `#324354` con borde redondeado `rounded-xl`, sombra suave `shadow-md` y padding compacto `p-2.5`.
* **Leyendas (`Legend`):**
  * `wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}`.

---

## 4. Paleta de Colores Oficial para Gráficos

Utilizar estrictamente los tokens del Manual de Identidad de Firplak:

| Uso | Nombre | Código Hex |
| :--- | :--- | :--- |
| **Serie Principal 1** | Navy Firplak | `#324354` |
| **Serie Principal 2** | Sage Firplak | `#7B8E90` |
| **Cumplimiento / Meta (>90%)** | Verde Éxito | `#59a96a` |
| **Alerta / Precaución (85%-90%)** | Amarillo Semáforo | `#deb841` |
| **Bajo Rendimiento (<85%)** | Rojo Crítico | `#d14747` |
| **Mármol Sintético (MS)** | Azul Cobalto | `#2563eb` |
| **Fibra de Vidrio (FV)** | Púrpura | `#7c3aed` |
| **Quarzstone (QZ)** | Ámbar / Naranja | `#d97706` |
| **Muebles (MBL)** | Teal / Esmeralda | `#0d9488` |
| **CEFI** | Índigo | `#4f46e5` |
| **Reparación Moldes (RMOLD)** | Rosa / Frambuesa | `#db2777` |

---

## 5. Tablero dinámico estilo Power BI (estándar FIRPLAK)

Referencia: `components/calidad/CalidadGeneralIFI.tsx`. Detalle completo en `.claude/skills/firplak-ui/SKILL.md` §7.1.

- Filtros Año → Mes → Semana → Día de selección múltiple, con borrador encima de cada uno; al abrir, año y mes en curso; sin año marcado = una columna por año.
- Columnas por día, mes o año según los filtros; valor encima de cada columna (1 decimal); línea de meta punteada azul.
- Semáforo: verde ≥ meta, amarillo hasta 10 puntos por debajo, rojo.
- Tarjetas KPI encima: promedio de lo filtrado, mismo semáforo; clic en una tarjeta de componente filtra la gráfica a ese componente.
- Clic en una columna la resalta (resto al 30 %) y actualiza las tarjetas; otro clic en ella o por fuera la quita.
- Gráfica principal de 380 px de alto.
