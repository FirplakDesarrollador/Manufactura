---
name: firplak-ui
description: Estándar de interfaz gráfica de la app Manufactura FIRPLAK (Next.js + Tailwind). Úsalo SIEMPRE antes de crear o modificar pantallas, banners/encabezados, barras de navegación, tarjetas, ventanas emergentes (pop-ups/modales), formularios, fotos, KPIs o semáforos, para que toda la aplicación se vea igual. Es un documento vivo: cuando el usuario apruebe un patrón nuevo, agrégalo aquí.
---

# Estándar de Interfaz Gráfica · Manufactura FIRPLAK

Este skill concentra las reglas visuales de la aplicación. Complementa:
- `.agents/AGENTS.md` (sección 5: manual de identidad corporativa).
- `.agents/skills/visualizacion-graficas/SKILL.md` (alturas y tipografía de gráficas Recharts).

> **Cómo mantenerlo:** cada vez que el usuario apruebe un ajuste visual que deba repetirse en otras pantallas, agrega la regla en la sección que corresponda (o crea una nueva) con: la regla, las clases Tailwind exactas y el archivo de referencia. Registra el cambio en el **Historial** al final.

---

## 1. Identidad visual

| Uso | Color | Notas |
|---|---|---|
| Navy (primario) | `#324354` | Banners, botones primarios, títulos, estado activo |
| Navy oscuro | `#254153` / `#25323f` | Hover de primario, pie de página |
| Sage (secundario) | `#7B8E90` | Acentos, barras de gráficas neutras |
| Crema (fondo) | `#F6F3EE` | Fondo dominante, pies de ventanas, fondos de inputs |
| Borde cálido | `#e2ded5` | Bordes de tarjetas y secciones |
| Semáforo verde | `#59a96a` | Cumple |
| Semáforo amarillo | `#deb841` | Alerta |
| Semáforo rojo | `#d14747` | No cumple |

- **Tipografía:** Montserrat en toda la interfaz. Títulos de banner en mayúsculas, `font-light`, `tracking-widest`.
- **Pantalla de referencia:** laptops Dell a 150% → **1280 × ~680 px** útiles (breakpoint `xl`). Todo diseño debe verse completo en ese tamaño sin superposiciones; probar también 360 px (celular), 768 px (tablet vertical), 1024 px y 1536 px o más.
- **Tablets de planta:** Galaxy Tab A9+ en horizontal ≈ **1280 px** de ancho (mismo breakpoint `xl`).

---

## 2. Banners y barras

### 2.0 Encabezados por niveles (estándar de toda la app)
Aplica a todas las pantallas **excepto Control de Piso MS (`/marmol`), FV (`/fibra`) y Muebles (`/muebles`)**, que tienen su propio encabezado de planta.

| Nivel | Qué es | Alto | Componente / clases |
|---|---|---|---|
| 1 | Banner | 56 px (`h-14`) | `Header` (siempre estilo compacto) |
| 2 | Pestañas del módulo | 44 px (`xl:h-11`) | barra de pestañas (§2.3) |
| 3 | Pestañas de una sección (opcional) | 44 px (`xl:h-11`) | misma barra que el nivel 2, **pegada** a él |

- Los niveles 2 y 3 son **más bajos que el banner**; nunca de su misma altura.
- Sin espacio entre niveles: cada barra solo lleva `border-b border-[#e2ded5]`.
- El nivel 3 se despliega/oculta con la flecha (`ChevronDown` / `ChevronUp`, 15 px) dentro del botón del nivel 2 que lo abre (ej. **Calidad** en el Tablero de Control).
- Fijos al desplazarse (solo en `xl`, cuando cada barra tiene alto fijo): nivel 2 `xl:sticky xl:top-14 z-40`, nivel 3 `xl:sticky xl:top-[100px] z-30`. Barras con `fixed`: nivel 2 `top-14`, nivel 3 `top-[100px]`.
- Referencia: `app/indicadores-productividad/page.tsx` (3 niveles) y los `components/*/SubHeader*.tsx`.

### 2.1 Banner principal (nivel 1)
Componente único: `components/opt-sistemica/Header.tsx`. **No crear encabezados propios** (incluye el menú lateral, que así es igual en toda la app).

```tsx
<Header title="Calidad MS" subtitle="" compact={true} userEmail={email} showLogout={true}
        onLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} />
```
- Fondo `bg-[#324354]`, alto `h-14`, capa `z-[100]`.
- Izquierda: menú hamburguesa (`w-6 h-6`) + título en mayúsculas `text-lg sm:text-xl font-light tracking-widest`. **Sin subtítulo** (el prop existe por compatibilidad, no se muestra).
- Centro: logo FIRPLAK `h-11` (blanco, `/logo-firplak-clean.png`).
- Derecha: solo el primer nombre del usuario `text-base sm:text-lg font-semibold` (sin el texto "Usuario") y, si aplica, cerrar sesión.
- El estilo es siempre el compacto; `compact` solo decide la posición: `true` → `sticky top-0`; `false` → `fixed` con espaciador `h-14`.
- Menú lateral: panel oscuro con "FIRPLAK · MANUFACTURA", módulos con submenús (›), sesión activa y "Cerrar sesión". Vive dentro de `Header`; no se duplica en otras pantallas.

### 2.2 Barra de controles (debajo del banner)
Patrón de las pestañas de Calidad MS (`app/calidad/ms/page.tsx`): filtros a la izquierda, botones de navegación al centro, indicadores a la derecha.

```tsx
<div className="bg-gray-50 border-b border-gray-200 py-2 xl:py-0 xl:h-14 sticky top-[56px] z-40 flex items-center shadow-xs">
  <div className="max-w-[1800px] w-full mx-auto px-3 sm:px-4 flex flex-wrap items-center justify-between gap-2
                  xl:grid xl:grid-cols-[minmax(min-content,1fr)_auto_minmax(max-content,1fr)] xl:gap-4 relative xl:h-full">
    {/* Izquierda: filtros */}
    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto sm:flex-1 min-w-0 sm:min-w-min xl:max-w-[440px] 2xl:max-w-[520px]">…</div>
    {/* Centro: navegación */}
    <div className="order-3 xl:order-none w-full xl:w-auto flex justify-center z-20">…</div>
    {/* Derecha: indicadores */}
    <div className="order-2 xl:order-none flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-1 w-full sm:w-auto sm:ml-auto xl:ml-0 xl:justify-self-end min-w-0">…</div>
  </div>
</div>
```
Reglas aprendidas (no repetir los errores):
- **Nunca** centrar la navegación con `absolute left-1/2 -translate-x-1/2`: se monta sobre los botones vecinos. Usar las 3 columnas reales del grid.
- Una sola línea solo desde el ancho donde todo cabe (normalmente `xl`); por debajo, filas con `flex-wrap`.
- Las listas desplegables (`SearchableSelect`) llevan `flex-1 min-w-[160px] [contain:inline-size]` para que el texto largo no fije el ancho mínimo; el texto se corta con "…".
- Si una barra tiene muchos filtros o un título largo (ej. Histórico, Criterios MS), pasar a una línea en `2xl`.
- Reutilizar exactamente la plantilla `grid-cols-[minmax(min-content,1fr)_auto_minmax(max-content,1fr)]`; no inventar variantes (`1.4fr`, etc.). Una barra con alto fijo (`h-14`) cuyo grid no aplica se apila y se monta sobre el contenido.
- Títulos de hoja en la barra: `text-sm font-black text-[#324354] truncate` con `title` para ver el nombre completo.
- Validar cada barra con una réplica en Edge sin interfaz a 360, 420, 1280, 1440, 1600 y 1880 px antes de entregar.

### 2.2.1 Selector de planta en la barra
Cuando una misma vista sirve para varias plantas, no se crean pantallas distintas: una **lista desplegable "Planta"** compacta (solo la sigla, sin cantidades; nombre completo en `title`) a la derecha de la barra, antes del contador, cambia el contenido, y la planta queda en la dirección (`?planta=Fv`). Los botones de navegación propios de una planta (ej. los 7 de Calidad MS) solo se muestran cuando esa planta está seleccionada **y** el usuario entró desde el módulo de esa planta; si entró por el módulo general (ej. Criterios de Aceptación y Rechazo desde Calidad), no se muestran. Referencia: `components/calidad/CriteriosCalidadView.tsx`.
```tsx
<div className="flex items-center gap-1 h-10 bg-white border border-gray-300 rounded px-2 shrink-0">
  <span className="text-[11px] font-bold text-gray-400 uppercase">Planta</span>
  <select className="bg-transparent font-black text-[#254153] text-xs md:text-sm outline-none cursor-pointer">…</select>
</div>
```

### 2.3 Barra de pestañas (niveles 2 y 3)
Pastillas centradas debajo del banner (ej. `components/hdt/SubHeader.tsx`, `components/mantenimiento/SubHeaderPuestaAPunto.tsx`, Tablero de Control):
```tsx
<div className="bg-white border-b border-[#e2ded5] px-3 shadow-2xs relative z-30 w-full font-sans py-1.5 xl:py-0 xl:h-11 flex items-center">
  <div className="max-w-7xl w-full mx-auto flex flex-row flex-nowrap gap-2 justify-start md:justify-center overflow-x-auto scrollbar-hide">
    <button className={`flex items-center gap-1.5 h-8 px-3.5 rounded-lg font-bold text-xs sm:text-[13px] whitespace-nowrap ${activa ? 'bg-[#324354] text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
      <Icono size={15} /> <span>Etiqueta</span>
    </button>
  </div>
</div>
```
- Botones `h-8`, `rounded-lg`, íconos de 15 px, `whitespace-nowrap shrink-0`.
- **Siempre una sola fila** (nunca `flex-wrap`: una segunda fila queda tapada por el banner). Si no caben, carrusel con `components/ui/CarruselPestanas.tsx`: centra las pestañas cuando caben y, si no, desplaza en horizontal con flechas ‹ › a los lados. Con una sola fila la barra mide `h-11` en todos los tamaños y puede ir `sticky` (nivel 2 `top-14`, nivel 3 `top-[100px]`).
- Si un `Suspense` muestra un hueco mientras carga, debe medir `h-11`.

### 2.4 Botones de navegación con ícono (grupo pegado)
`components/calidad/CalidadMsNavButtons.tsx`: botones `h-10 w-10` unidos (`-space-x-px`), activo `bg-blue-600 text-white`, inactivo `bg-white text-[#254153] border-gray-300`, primer botón `rounded-l`, último `rounded-r`. Cada botón con `title` descriptivo.

Orden en Calidad MS: Registro / inspección (`Search`, lupa sola, mismo `w-5 h-5` que los demás) · Reportes del día (`ClipboardList`) · Histórico (`History`) · Saldos y destrucciones (`BrokenSinkIcon`) · Hora a hora (`Timer`) · Indicadores (`PieChart`) · Configuración (`Settings`) · Criterios (`BookOpenCheck`). No repetir íconos de gráfica entre botones.

Vistas que replican el tablero de control (p. ej. `/calidad/ms/indicadores`) **reutilizan el mismo componente** con una prop de filtro (`IndicadoresCalidadView soloMs`), nunca una copia, para que cualquier cambio en el tablero se vea en ambos lados.

---

## 3. Ventanas emergentes (pop-ups / modales)

```tsx
<div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-y-auto"
     onMouseDown={e => { if (e.target === e.currentTarget && !editando) onClose(); }}>
  <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#324354] shadow-2xl w-full max-w-6xl min-h-[80vh] max-h-[94vh] overflow-y-auto">…</div>
</div>
```
- **Fondo siempre oscurecido y difuminado** (`bg-black/60 backdrop-blur-sm`).
- Detalles con mucha información: `max-w-6xl`, alto mínimo `80vh`, máximo `94vh` (en 1280×680 se ve casi completo). Formularios simples: `max-w-md` a `max-w-2xl`.
- Cerrar con: botón "Cerrar" (X), clic en el fondo y tecla **Escape**. En **modo edición** el clic en el fondo y Escape NO cierran (para no perder cambios).
- Encabezado: etiqueta tipo chip (`text-xs font-black uppercase bg-[#324354]/10 px-2.5 py-1 rounded-md`) + título `text-xl font-black text-[#324354]`; acciones a la derecha.
- Pie de formulario: `bg-[#F6F3EE] border-t border-[#e2ded5]` con "Cancelar" (blanco) y acción principal (navy).
- Referencia: `components/calidad/CriterioDetallePanel.tsx`; detalle de correctivos/TPM en `app/mantenimiento/gestion-mantenimiento/page.tsx` (`handleOpenCorrectivoDetail`).

### 3.1 Consulta y edición con el mismo diseño
La edición **no** abre otra ventana con otro diseño: el mismo panel cambia a modo edición.
- Borde `border-amber-500 ring-4 ring-amber-100` y chip **"MODO EDICIÓN"** (`text-amber-800 bg-amber-100 border-amber-300`).
- Cada valor se reemplaza por su campo en la misma caja: inputs `bg-white border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-200`.
- Botones: "Editar" (navy) / "Cerrar" en consulta → "Cancelar" (gris) / "Guardar" (ámbar) en edición.
- Solo usuarios con permiso (`lib/calidad/permisos.ts` → `puedeEditarCalidad`).

- Si el detalle mezcla datos con permisos distintos (ej. criterio de calidad + configuración del registro en línea), un solo botón "Editar" abre el modo edición y **cada bloque solo se vuelve editable con su propio permiso**; el botón dice "Editar Configuración" si el usuario solo puede editar esa parte.

### 3.2 Un mismo registro, una misma ventana
Si un registro se puede abrir desde varias pantallas (ej. un correctivo desde Planificador y Órdenes de Trabajo), todas abren **la misma ventana** (pasar un callback, no duplicar el formulario).

---

## 4. Fotos y evidencia

- Máximo **5 fotos** por registro de criterios; **4** en Correctivo/TPM (ver AGENTS.md §7).
- Dos botones: **Adjuntar** (`bg-[#324354]`, `accept="image/*" multiple`) y **Tomar foto** (`bg-amber-600`, abre `LiveCameraModal`, que ya ofrece la cámara nativa del dispositivo; no agregar un tercer botón).
- Por foto: ampliar, **anotar** (`PhotoAnnotationEditor`: lápiz, círculo, rectángulo, flecha y texto), marcar como principal (estrella) y eliminar.
- Texto sobre la foto: recuadro blanco con borde rojo y letra roja en negrita; se escribe tocando la foto, **Enter** lo fija, **Shift+Enter** salta de línea, **Escape** cancela. Fino / Med / Gru define el tamaño de la letra.
- La primera foto es la **principal** (chip con estrella).
- Subida a Supabase Storage bucket `fichas-media`; si falla, conservar base64.
- Láminas de referencia fijas (p. ej. zonas críticas de acabado MS en `/public/calidad/zonas-criticas/`): miniaturas recortadas solo con la pieza (`*-mini.jpg`, `h-28 object-contain bg-[#eceeed]`) y franja `bg-[#254153]` debajo (nombre + ícono ampliar), sin tapar la imagen; al tocarlas abren la lámina completa; van junto al bloque al que explican (debajo de "Máximo permitido por zona"), a todo el ancho; son iguales para todos los defectos.
- Ayuda contextual: ícono `Info` (`text-sky-600`) junto al título del campo; el texto aparece al pasar el mouse y al tocar (tablet), en globo `bg-[#254153] text-white text-[11px] w-64`. Ej.: % máximo de defecto al día → escalamiento a QRR (tarjeta a la izquierda de las estadísticas del defecto, `sm:w-48`).

---

## 5. Capas (z-index)

| Elemento | z-index |
|---|---|
| Barra de controles sticky | `z-40` |
| Banner principal (`Header`) | `z-[100]` |
| Ventanas emergentes de detalle | `z-[150]` |
| Imagen ampliada (zoom) | `z-[200]` |
| Formularios grandes de mantenimiento | `z-[10000]` |
| Cámara en vivo | `z-[10002]` |
| Editor de anotación de fotos | `z-[12000]` |

Una ventana debe quedar **por encima del banner** (más de 100).

---

## 6. Tarjetas, KPIs y semáforo

- Tarjeta de sección: `bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5]`.
- KPI destacado: fondo navy `bg-[#324354] text-white`, etiqueta `text-[10px] font-black uppercase tracking-wider text-white/70`, valor `text-2xl font-black`.
- KPI secundario: `bg-slate-50 border border-slate-200 rounded-xl p-2.5`.
- Tendencia: peor que el histórico → `bg-rose-50 border-rose-200 text-rose-700` + `TrendingUp`; mejor → `bg-emerald-50 border-emerald-200 text-emerald-700` + `TrendingDown` (para defectos, subir es malo).
- Semáforo del Tablero de Control: verde > meta, amarillo hasta 5 puntos por debajo, rojo más abajo (relativo a la meta de cada planta). En gráficas de indicadores con meta (§7.1): verde ≥ meta, amarillo hasta 10 puntos por debajo, rojo.
- Zonas de criterios de calidad: `border-l-4` roja / naranja (`amber`) / amarilla (`yellow`) / verde (`emerald`) con fondo `-50/70`.

---

## 7. Gráficas

Seguir `.agents/skills/visualizacion-graficas/SKILL.md` (tamaños para los Dell Pro 14). Resumen: Recharts, ejes `fontSize` 10–12, línea de meta `ReferenceLine` punteada.

### 7.1 Tablero dinámico estilo Power BI (estándar para gráficas nuevas)
Referencia: `components/calidad/CalidadGeneralIFI.tsx` (Tablero de Control → Calidad → Calidad IFI). Toda gráfica de indicadores nueva debe comportarse así.

**Encabezado de la sección (una sola fila)**
- Izquierda: título `text-base sm:text-lg font-black text-[#324354]` (sin descripción larga) y, debajo, las acciones (`Registrar…` navy, `Configurar…` blanco con borde). Las acciones solo con permiso de edición.
- Derecha: filtros. En pantallas angostas bajan a su propia línea. Sin botón de recargar: los datos se consultan solos al cambiar filtros.

**Filtros (`FiltroPbi`)**
- Título pequeño `text-[10px] font-bold text-slate-500` con **borrador** (`Eraser`) encima, visible al pasar el mouse (siempre visible en tablet) cuando hay selección.
- Lista desplegable de **selección múltiple** con casillas y "Seleccionar todo"; el recuadro dice "Todas", la opción elegida o "Varias selecciones". Nada marcado = "Todas".
- En cascada: **Año → Mes → Semana → Día**; cada filtro ofrece solo valores con datos según los anteriores, y al cambiar uno se limpian los de abajo.
- Al abrir la pantalla: **año y mes en curso**. Semanas ISO (lunes a domingo, como Power BI); con varios años, semanas y días muestran el año.

**Granularidad automática de las columnas**
| Filtros | Columnas | Tarjetas |
|---|---|---|
| Un año + un mes | un día por columna | promedio del mes |
| Varios meses o años | un mes por columna (`oct 25`) | promedio de los meses |
| Semana o días marcados | los días de esa selección | promedio de esos días |
| Año sin marcar ("Todas") | **un año por columna** | promedio de todos los meses |
- La vista por año lee resultados ya guardados (API `?vista=anual`), no recalcula en vivo.

**Tarjetas KPI encima de la gráfica**
- Primera tarjeta (doble ancho): indicador general con meta en chip ("Meta 90%"). Luego una tarjeta por componente (planta) con peso y meta.
- Siempre muestran el **promedio de lo filtrado**; si hay una columna resaltada, muestran esa columna.
- Valor coloreado con el **mismo semáforo que las columnas**.
- Componente sin dato: borde punteado, "+ Agregar" (si puede editar). "No trabajó": texto gris; su peso se reparte entre los demás.
- **Clic en una tarjeta de componente** = la gráfica muestra solo ese componente (su meta como línea, su semáforo, título "Calidad <nombre> por Día"); la tarjeta elegida `ring-2 ring-[#324354]`, las otras `opacity-60`, la general `opacity-40`. Clic de nuevo o en la general vuelve al total.

**Gráfica**
- `BarChart` alto **380 px**, `margin.top` 22 para las etiquetas.
- **Valor encima de cada columna** (`LabelList position="top"`, 1 decimal, `fontSize 10`, `fontWeight 800`).
- Línea de meta `ReferenceLine` azul `#2563eb` punteada; la etiqueta "Meta X%" va **en el eje Y** (`position: 'left'`, `offset: 36`, margen izquierdo 62 y `YAxis width={32}`), nunca dentro del área de columnas, para no tapar los valores.
- Semáforo del indicador general: verde ≥ meta, amarillo hasta 10 puntos por debajo, rojo más abajo (`#59a96a` / `#deb841` / `#d14747`). Por componente, el mismo corte contra su propia meta (`colorPlanta`).
- **Resaltado tipo Power BI:** clic en una columna la resalta (las demás `fillOpacity 0.3`) y las tarjetas muestran ese periodo; **otro clic en la misma columna o un clic por fuera** la quita (botón "Quitar selección" en la tarjeta general). Las tarjetas, filtros y ventanas no quitan el resaltado (`data-ifi-conservar`).
- Recharts 3: el clic de la gráfica trae `activeIndex`/`activeLabel` (no `activePayload`). Usar el clic de la gráfica **y** el de la `Bar`, con protección contra doble disparo (≈150 ms).
- Tooltip: periodo, valor y detalle por componente (calidad, meta, cumplimiento, peso efectivo; "No trabajó: X").

**Datos y configuración**
- Pesos de los componentes **por año** (ventana "Configurar pesos": deben sumar 100 %; sin pesos del año se usan los vigentes).
- Registro manual por día con opción **"No trabajó"** (queda fuera del cálculo y su peso se reparte).
- Consultas por mes en lotes de 3 y guardadas en memoria mientras la página esté abierta.

---

## 8. Lista de verificación antes de entregar una pantalla

1. Usa `Header` y, si aplica, la barra de controles del §2.2.
2. Ninguna superposición a 360, 768, 1024, 1280 y 1536 px.
3. Ventanas con fondo oscurecido, cierre con X / fondo / Escape, y por encima del banner.
4. Consulta y edición con el mismo diseño.
5. Colores solo de la paleta del §1.
6. Textos en español, sin abreviaturas inventadas.

---

## Historial

- 2026-10-24 · Creación del skill: banners, barra de controles responsive (3 columnas), ventanas emergentes, modo edición en el mismo panel, fotos, capas, KPIs y semáforo.
- 2026-10-24 · Detalle con bloques de distinto permiso (criterio + configuración del registro en línea en `CriterioDetallePanel`); alarmas con `border-l-4` amarilla / azul / roja e interruptores Sí/No.
- 2026-10-24 · Título de hoja en la barra ("Criterios de Aceptación y Rechazo de Mármol Sintético (MS)"); barras con título largo en una línea solo desde `2xl`; no usar plantillas de grid nuevas.
- 2026-10-24 · Criterios de todas las plantas unificados en una vista con selector de planta (`CriteriosCalidadView`); se elimina la vista anterior de `/calidad/criterios`.
- 2026-10-24 · Herramienta **Texto** en `PhotoAnnotationEditor` (recuadros de texto sobre la foto).
- 2026-10-24 · Detalle de criterio: % máximo de defecto permitido al día con ayuda `Info` (escalamiento a QRR) y láminas de zonas críticas de acabado; se quita el pie "Secure Terminal" de la vista de criterios.
- 2026-10-24 · Calidad MS: botón **Indicadores** (`/calidad/ms/indicadores`, reutiliza `IndicadoresCalidadView soloMs`), nuevo orden de la barra, hora a hora con ícono `Timer`; botón Ejecutar y métricas de la derecha más compactos.
- 2026-10-24 · Íconos Registro → `Search` (lupa sola) e Indicadores → `PieChart`; métricas de la barra de registro: Buenos · Defectuosos · Saldos y destrucciones (solo ícono `BrokenSinkIcon` + cantidad, con `title`) · IFI · Total.
- 2026-10-24 · Puntos de color en las tarjetas de criterios: se pinta la zona solo si no admite defectos (máximo 0 o "NO SE ACEPTA"); el resto en gris.
- 2026-10-24 · **Nuevo defecto MS** (`NuevoDefectoMsModal`): crea el defecto en `ms_defectos` (registro, reportes, histórico, indicadores y Power BI) + su criterio vinculado. Botón "Nuevo defecto" en la barra de Criterios (MS con `configurar_defectos`) y tarjeta punteada al final de la matriz del registro.
- 2026-10-24 · Barras de Histórico y Saldos: buscador primero y del ancho del selector del registro (`max-w-[520px]`, `[contain:inline-size]`); filtros de tipo como lista desplegable con etiqueta (patrón del selector de planta); fechas como rango "desde a hasta" a la derecha de los botones.
- 2026-10-24 · Permisos por botón en Calidad MS (`permisosCalidadMs` / `usePermisosCalidadMs`): la barra muestra solo los botones permitidos (esquinas con `first:rounded-l last:rounded-r`); Configuración y Criterios con nivel Sin acceso / Ver / Editar (selector segmentado en Configuración → Usuarios). "Ver" = consulta sin guardar (`DefectsSettingsModal soloLectura`, criterio sin edición).
- 2026-10-26 · Filtros estilo Power BI (`FiltroPbi` en `CalidadGeneralIFI`): título pequeño con borrador (`Eraser`) encima de cada lista desplegable de **selección múltiple** con casillas y "Seleccionar todo" (texto "Todas" / la opción / "Varias selecciones"), en cascada Año → Mes → Semana → Día (nada marcado = "Todas"). Gráficas con resaltado tipo Power BI: clic en una columna la resalta (las demás al 30 %) y las tarjetas muestran ese periodo; otro clic en la misma columna o por fuera la quita. Valor encima de cada columna con 1 decimal.
- 2026-10-26 · Tablero de Control: tercer nivel de pestañas (Calidad) pegado al segundo, con la misma altura y clases (`py-1.5 px-4`, botones `px-4 py-1.5 rounded-xl`); se despliega/oculta con la flecha (`ChevronDown`/`ChevronUp`) del botón del segundo nivel.
- 2026-10-26 · Tablero de Control con banner compacto (`compact`, sin subtítulo) y los niveles 2 y 3 de pestañas más bajos que el banner (`xl:h-11`, botones `h-8 text-[13px] rounded-lg`), fijos al desplazarse en `xl` (`top-14` y `top-[100px]`).
- 2026-10-26 · Banner (`Header`): logo FIRPLAK más grande (`h-11` compacto, `h-16` normal) y sin el texto "Usuario" bajo el nombre; aplica a toda la app.
- 2026-10-26 · Encabezados por niveles en toda la app (§2.0): banner siempre compacto (56 px, logo `h-11`, sin subtítulo ni "Usuario") y barras de pestañas de 44 px con botones `h-8` en los 8 `SubHeader` y en Consulta SAP, Máquinas, LILAC, Bitácora, Asistencia, Gestor de Mantenimiento y Calidad; detalle de OPT pasa al `Header` estándar. Excepto Control de Piso MS/FV/Muebles.
- 2026-10-26 · Tablero de Control: 10 pestañas (Tiempo Real, Tablero de Control, Control de Piso, Nivel de Servicio, Productividad, Calidad, Mantenimiento, Sistema de Producción, Variación, Ausentismo) en una sola fila con `CarruselPestanas`.
- 2026-10-26 · IFI general: clic en la tarjeta de una planta filtra la gráfica a esa planta (meta y semáforo de la planta; tarjeta con `ring-2 ring-[#324354]`, las demás al 60 % y el IFI general al 40 %); clic en IFI General o de nuevo en la planta vuelve al general. Se quitan la descripción y "Sincronizar histórico".
- 2026-10-26 · IFI general: botón "Configurar pesos" (ícono `Scale`) con ventana de pesos por año (tabla `calidad_ifi_pesos`, deben sumar 100 %); tarjetas de planta con el mismo semáforo que las columnas (`colorPlanta`: verde ≥ meta, amarillo hasta 10 pts debajo, rojo). Sin botón de recargar.
- 2026-10-26 · §7.1 Tablero dinámico estilo Power BI (filtros múltiples en cascada con borrador, columnas por día/mes/año, tarjetas que filtran la gráfica, resaltado y semáforo) tomado de Calidad IFI como estándar para gráficas nuevas.
- 2026-10-27 · Pestañas en la dirección: la vista activa se guarda con `?vista=…&sub=…` (`history.replaceState`) para que al refrescar o compartir el enlace se abra la misma pestaña (Tablero de Control; mismo patrón que `?planta=` en Criterios).
- 2026-10-27 · Láminas de zonas críticas por planta (`ZONAS_CRITICAS_POR_PLANTA`): MS (lavamanos/lavarropas) y MBL-CEFI (mueble con puertas, `/calidad/zonas-criticas/muebles.jpg`, generada con el mismo estilo). Plantas sin lámina muestran el recuadro vacío.
