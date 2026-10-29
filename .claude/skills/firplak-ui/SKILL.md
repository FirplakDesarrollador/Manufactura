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
| 1 | Banner | 48 px (`h-12`) | `Header` (siempre estilo compacto) |
| 2 | Pestañas del módulo | 40 px (`h-10` / `xl:h-10`) | barra de pestañas (§2.3); botones `h-7 px-3 text-[11px] sm:text-xs`, íconos 14 |
| 3 | Pestañas de una sección (opcional) | 40 px (`h-10` / `xl:h-10`) | misma barra que el nivel 2, **pegada** a él |

- Medidas pensadas para el **zoom normal de los equipos: 100 %** (1 px CSS ≈ 1,5 px de pantalla). Las alturas "en px" que pide el usuario son px de pantalla medidos en sus capturas.

- Los niveles 2 y 3 son **más bajos que el banner**; nunca de su misma altura.
- El nivel 3 también puede ser una **barra de herramientas** de la pestaña activa (ej. Gestor de Mantenimiento → **Planificador**: buscador, Desplegar Todo, + Correctivo, + TPM e indicadores en `fixed top-[88px] h-10 bg-white border-b`), con el mismo despliegue por la flecha del botón del nivel 2. El nivel 2 **siempre visible**: no usar pestañitas sueltas para ocultarlo. Si la barra vive dentro de un contenedor con animación (`animate-in`), renderizarla con `createPortal(…, document.body)`: un ancestro con transform desubica los `fixed`. Con `Header` no compacto (ya deja su espaciador de 48 px) el contenido lleva `pt-[88px]` con nivel 3 abierto y `pt-[48px]` sin él.
- Sin espacio entre niveles: cada barra solo lleva `border-b border-[#e2ded5]`.
- El nivel 3 se despliega/oculta con la flecha (`ChevronDown` / `ChevronUp`, 15 px) dentro del botón del nivel 2 que lo abre (ej. **Calidad** en el Tablero de Control).
- Fijos al desplazarse: nivel 2 `sticky top-12 z-40` (o `top-[48px]`), nivel 3 `sticky top-[88px] z-30`. Barras con `fixed`: nivel 2 `top-12`, nivel 3 `top-[88px]`; el contenido debajo de barras `fixed` lleva `pt-[56px]` (solo banner + nivel 2 cerrado) o `pt-[96px]` (banner + nivel 2).
- Referencia: `app/indicadores-productividad/page.tsx` (3 niveles) y los `components/*/SubHeader*.tsx`.

### 2.1 Banner principal (nivel 1)
Componente único: `components/opt-sistemica/Header.tsx`. **No crear encabezados propios** (incluye el menú lateral, que así es igual en toda la app).

```tsx
<Header title="Calidad MS" subtitle="" compact={true} userEmail={email} showLogout={true}
        onLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} />
```
- Fondo `bg-[#324354]`, alto `h-12` (48 px), capa `z-[100]`.
- Izquierda: menú hamburguesa (`w-6 h-6`) + título en mayúsculas `text-base sm:text-lg font-light tracking-widest`. **Sin subtítulo** (el prop existe por compatibilidad, no se muestra).
- Centro: logo FIRPLAK `h-9` (blanco, `/logo-firplak-clean.png`).
- Derecha: solo el primer nombre del usuario `text-sm sm:text-base font-semibold` (sin el texto "Usuario"). **Sin ícono de cerrar sesión en el banner**: se cierra sesión solo desde el menú lateral.
- El estilo es siempre el compacto; `compact` solo decide la posición: `true` → `sticky top-0`; `false` → `fixed` con espaciador `h-12`.
- Menú lateral: panel oscuro con "FIRPLAK · MANUFACTURA", módulos con submenús (›), sesión activa y "Cerrar sesión". Vive dentro de `Header`; no se duplica en otras pantallas.

### 2.2 Barra de controles (debajo del banner)
Patrón de las pestañas de Calidad MS (`app/calidad/ms/page.tsx`): filtros a la izquierda, botones de navegación al centro, indicadores a la derecha.

```tsx
<div className="bg-gray-50 border-b border-gray-200 py-2 xl:py-0 xl:h-14 sticky top-[48px] z-40 flex items-center shadow-xs">
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
- Una sola línea solo desde el ancho donde todo cabe; por debajo, filas con `flex-wrap`. **A zoom 100 % la pantalla mide ≈ 1266 px CSS (menos que `xl`)**: el usuario no quiere dos renglones ahí, así que usar `min-[1200px]:` en lugar de `xl:`. Barra de Registro MS como nivel 2: alto `min-[1200px]:h-10` (40 px), selector `h-7 text-[11px]` con `min-[1200px]:max-w-[520px]`, botón Ejecutar `h-7 text-[10px]`, métricas `text-sm` (`2xl:text-base`) con etiquetas `text-[10px]` e íconos `w-4`. Referencia: `app/calidad/ms/page.tsx`; igual en Reportes (`list`), Saldos y Criterios: buscadores `h-7 text-[11px]` con `min-[1200px]:max-w-[340px]` (`2xl:max-w-[480px]`), fechas `h-7 text-[10px] w-[108px]`, botones `h-7 text-[10px]`.
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
<div className="bg-white border-b border-[#e2ded5] px-3 shadow-2xs relative z-30 w-full font-sans py-1.5 xl:py-0 xl:h-10 flex items-center">
  <div className="max-w-7xl w-full mx-auto flex flex-row flex-nowrap gap-2 justify-start md:justify-center overflow-x-auto scrollbar-hide">
    <button className={`flex items-center gap-1.5 h-7 px-3 rounded-lg font-bold text-[11px] sm:text-xs whitespace-nowrap ${activa ? 'bg-[#324354] text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
      <Icono size={14} /> <span>Etiqueta</span>
    </button>
  </div>
</div>
```
- Botones `h-7`, `rounded-lg`, letra `text-[11px] sm:text-xs`, íconos de 14 px, `whitespace-nowrap shrink-0`.
- **Siempre una sola fila** (nunca `flex-wrap`: una segunda fila queda tapada por el banner). Si no caben, carrusel con `components/ui/CarruselPestanas.tsx`: centra las pestañas cuando caben y, si no, desplaza en horizontal con flechas ‹ › a los lados. Con una sola fila la barra mide `h-10` en todos los tamaños y puede ir `sticky` (nivel 2 `top-12`, nivel 3 `top-[88px]`).
- Si un `Suspense` muestra un hueco mientras carga, debe medir `h-10`.

### 2.4 Botones de navegación con ícono (grupo pegado)
`components/calidad/CalidadMsNavButtons.tsx`: botones `h-7 w-8` (íconos `w-4`) unidos (`-space-x-px`), activo `bg-blue-600 text-white`, inactivo `bg-white text-[#254153] border-gray-300`, primer botón `rounded-l`, último `rounded-r`. Cada botón con `title` descriptivo.

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

**Recuadro modelo (Calidad General Plantas - IFI, aprobado 2026-10-28)** — referencia: `components/calidad/CalidadGeneralIFI.tsx` dentro de `<section className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#e2ded5] space-y-3">`.
- **Encabezado** (`flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 text-xs`): a la izquierda título `text-base sm:text-lg font-black text-[#324354]` y debajo los botones de acción (`px-3 py-1.5 rounded-lg font-bold`, íconos `w-3.5`); a la derecha los 4 `FiltroPbi` **alineados arriba** (`items-start`), al ras del borde superior del recuadro.
- **Tarjetas compactas** (`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2`, `px-2 py-1.5` / `px-2.5 py-1.5 rounded-xl border shadow-2xs`): fila 1 nombre `text-[10px] font-black uppercase` + peso o chip de meta a la derecha; fila 2 **valor y dato secundario en la misma línea** (`flex items-baseline justify-between`): valor `text-lg`/`text-2xl font-black leading-tight` con semáforo y a la derecha "meta X%" `text-[9px]` (en la general, "Promedio de N día(s) con dato" `text-[10px]` al lado del valor). Nunca una tercera línea.
- **Gráfica** en `bg-white rounded-xl p-3 shadow-xs border border-slate-200`: solo el título `text-xs sm:text-sm font-black` (**sin leyenda de semáforo** ni textos de ayuda a la derecha). Alto `h-[max(200px,calc(100dvh-375px))]` → recuadro completo ≈ **810 px de pantalla a zoom 100 %**.
- Meta: `ReferenceLine` **verde `#3b8f50`** punteada `4 4`, `strokeWidth 1.5`, etiqueta "Meta X%" verde en el eje Y.
- **Clic en una columna de día** la resalta y la **refleja en los filtros Semana y Día** (la semana ISO y el día); al quitar el resaltado los filtros vuelven a lo que había. Cambiar esos filtros con el día reflejado aplica el filtro real.

**Filtros (`FiltroPbi`)**
- Tamaño compacto: `sm:w-28 min-w-[96px]`, botón `h-6 text-[9px] font-semibold`, flecha `w-3`; título `text-[8px] font-bold text-slate-500` con **borrador** (`Eraser`) encima, visible al pasar el mouse (siempre visible en tablet) cuando hay selección.
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
- `BarChart` con alto según la pantalla: `h-[max(200px,calc(100dvh-375px))]` (recuadro de ≈ 810 px de pantalla con el zoom habitual de 100 %; se ajusta al alto de la ventana, mínimo 200 px), `margin.top` 22 para las etiquetas.
- **Valor encima de cada columna** (`LabelList position="top"`, 1 decimal, `fontSize 10`, `fontWeight 800`).
- Línea de meta `ReferenceLine` verde `#3b8f50` punteada; la etiqueta "Meta X%" va **en el eje Y** (`position: 'left'`, `offset: 36`, margen izquierdo 62 y `YAxis width={32}`), nunca dentro del área de columnas, para no tapar los valores.
- Semáforo del indicador general: verde ≥ meta, amarillo hasta 10 puntos por debajo, rojo más abajo (`#59a96a` / `#deb841` / `#d14747`). Por componente, el mismo corte contra su propia meta (`colorPlanta`).
- **Resaltado tipo Power BI:** clic en una columna la resalta (las demás `fillOpacity 0.3`) y las tarjetas muestran ese periodo; **otro clic en la misma columna o un clic por fuera** la quita (botón "Quitar selección" en la tarjeta general). Las tarjetas, filtros y ventanas no quitan el resaltado (`data-ifi-conservar`).
- Recharts 3: el clic de la gráfica trae `activeIndex`/`activeLabel` (no `activePayload`). Usar el clic de la gráfica **y** el de la `Bar`, con protección contra doble disparo (≈150 ms).
- Tooltip: periodo, valor y detalle por componente (calidad, meta, cumplimiento, peso efectivo; "No trabajó: X").

**Varias gráficas en un mismo tablero (filtro cruzado)** — referencia: `components/calidad/CalidadMsDashboard.tsx` (Mármol Sintético). **Fibra de Vidrio (`CalidadFVDashboard.tsx`) es idéntico en apariencia**: mismo encabezado (título + Tablero Dinámico/Power BI + 4 filtros), 8 tarjetas, Pareto con anillo, "Detalle por Producto", IFI por día y por mes; cambia solo la fuente (SharePoint), la meta (35 %, eje Y ajustado a los datos mostrando la meta) y que la tabla es por producto (casilla "Revisadas", sin reparación). Toda planta nueva con tablero de calidad sigue este mismo diseño. **Saldos y Destrucciones** (`CalidadSaldosDashboard.tsx`) también: mismo encabezado con selector **$ Costo / Piezas** y **Todos / Saldos / Destrucciones**, 8 tarjetas, fila 1 = por día (barras apiladas verde saldo `#10b981` / rojo destrucción `#ef4444` + línea **acumulado** naranja `#f59e0b` en eje derecho) y por mes / promedio por año; fila 2 = Pareto de causas (lista + anillo) y detalle de piezas (tabla con Fecha, Tipo S/D, Referencia, Causa, Pzs, Costo). Pesos compactos en etiquetas (`$7,6 M`, `$352 mil`).
- Mismo encabezado, filtros arriba, tarjetas compactas, meta verde, sin leyenda de semáforo y día reflejado en Semana/Día que el **recuadro modelo** de arriba.
- Tarjetas KPI de una fila de 8: nombre `text-[8px] font-bold uppercase`, valor `text-sm sm:text-base font-black leading-tight`, `px-2.5 py-1.5`.
- Alto por fila: `--ms-h: max(120px, calc((100dvh - 382px) / 2 - 12px))` (Pareto y referencias) y `--ms-h2: max(140px, calc((100dvh - 382px) / 2 + 12px))` (tendencias, más altas para que los valores no se monten) → recuadro completo ≈ 810 px de pantalla a zoom 100 %. Espacios mínimos: raíz `space-y-2`, encabezado `pb-2`, tarjetas de gráfica `p-2.5`, filas `gap-2.5`. Línea con más de 12 puntos: valores alternados arriba/abajo (`LabelList content`, 9 px). Columnas de tendencia con eje Y desde 60 (o el mínimo redondeado), no desde 0. Para que quepa se compacta: selector de vista (Tablero Dinámico / Power BI) **en la misma línea del título**; controles de una tarjeta (casillas `shrink-0` y buscador que toma el ancho sobrante `flex-1 min-w-[80px] max-w-[160px]`, contenedor `flex-1 min-w-0 justify-end`, título `whitespace-nowrap shrink-0`; letra `text-[9px]`, casillas `w-3 h-3`) **en la línea de su título** (`lg:flex-nowrap`: a zoom 100 % con escala de Windows 150 % la pantalla mide ≈ 1266 px CSS, por debajo de `xl`); anillo del Pareto grande: columna `md:col-span-7`, sube hasta la línea del título (`md:-mt-7`, alto `calc(var(--ms-h)+28px)`), `innerRadius 55%` / `outerRadius 100%`, márgenes 14/40 y etiquetas a `outerRadius + 10`; sin textos de ayuda tipo "N causas · clic para filtrar".
- El filtro va en `components/calidad/FiltroPbi.tsx` (con `semanaIso`): reutilizarlo, no copiarlo.
- Clic en un elemento (punto, columna, porción del anillo, fila de una lista o tabla) **filtra las demás gráficas** y el elemento queda resaltado (los otros al 25–40 %); otro clic en él o un clic en el fondo de su recuadro lo quita. Encima de las tarjetas, chips "Filtrando por: …" con X y "Quitar todo".
- **Clic en un mes o un año** de cualquier gráfica de tiempo **cambia los filtros de arriba** (Año/Mes) y todo el tablero pasa a ese periodo; otro clic en el mismo quita ese filtro (mes → año completo; año → todos). Clic en un día solo lo resalta y filtra las demás gráficas. Los periodos fuera de los filtros quedan tenues.
- Cada gráfica no se filtra a sí misma. Gráficas de tiempo: si el periodo elegido está en la otra (día ↔ mes ↔ año), se resaltan los periodos que lo contienen.
- Dos gráficas de tendencia: la principal sigue la granularidad automática; la secundaria tiene botones **"Por mes" / "Promedio por año"** (por mes: todos los meses de los años elegidos, los meses fuera del filtro tenues; por año: todos los años, valor = promedio de sus meses). Arranca automática (principal por día → por mes; por mes → por año) y vuelve a automática al cambiar filtros.
- **Todas las gráficas muestran sus valores**: columnas y líneas con `LabelList position="top"` (1 decimal); puntos de línea con el color del semáforo. Anillo/torta: % en cada porción con espacio (≥ 2,5 %), las causas más allá de 12 se agrupan en "Otras (n)".
- Al elegir una causa, las tendencias cambian a "% piezas con <causa>" (sin meta) con el color de la causa.

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
- 2026-10-27 · Mármol Sintético con el estándar §7.1: filtros Año/Mes/Semana/Día (`FiltroPbi` compartido), valores en líneas, columnas y anillo, filtro cruzado entre Pareto, referencias y tendencias, gráficas por mes/año al quitar filtros. Se quitan el chip "Supabase en vivo", la descripción y el botón de recargar.
- 2026-10-28 · **Encabezados delgados en toda la app** (menos Control de Piso MS/FV/Muebles): banner 48 px (`h-12`, título `text-base sm:text-lg`, logo `h-9`, nombre `text-sm sm:text-base`), niveles 2 y 3 de 40 px con botones `h-7 text-[11px] sm:text-xs`; barras fijas en `top-12` / `top-[48px]` y `top-[88px]`. Recuadro IFI guardado como **recuadro modelo** (§7.1) y replicado en Mármol Sintético.
- 2026-10-28 · El zoom normal de los equipos es 100 %: Tablero de Control con `Header slim` (48 px, letra un tamaño menor) y pestañas de 40 px; recuadro IFI a ≈ 800 px de pantalla (`calc(100dvh-383px)`), sin la leyenda del semáforo junto al título de la gráfica. `FiltroPbi` más pequeño: `sm:w-32`, botón `h-7 text-[10px]`, título `text-[9px]`. Clic en una columna de día la refleja en los filtros Semana y Día (al quitar el resaltado vuelven). Línea y etiqueta de meta en verde `#3b8f50` (punteada `4 4`). Tarjetas KPI compactas (`py-1.5`): la meta (o el detalle "Promedio de…") va al lado del valor, no en otra línea; filtros alineados arriba (`items-start`) junto al título.
