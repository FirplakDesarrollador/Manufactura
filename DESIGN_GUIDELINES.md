# Directrices de Diseño y Layouts en Manufactura (FIRPLAK S.A.)

Este documento establece los estándares y convenciones para el desarrollo de la interfaz de usuario en la aplicación de Manufactura, garantizando la consistencia visual, el soporte a dispositivos móviles y la prevención de solapamientos entre elementos fijos y contenido dinámico.

---

## 1. Alturas y Espaciados de Elementos Fijos/Sticky

Para mantener la consistencia sistémica, nunca se deben hardcodear paddings o alturas en los layouts de página individuales. En su lugar, se deben utilizar las variables globales de CSS definidas en `app/globals.css`:

* **`--header-height` (Por defecto: `80px`):** Altura estándar de la barra de navegación superior.
* **`--footer-height` (Por defecto: `80px`):** Altura estándar de la barra de acciones o pie de página inferior (botones Anterior, Siguiente, etc.).

---

## 2. El Componente `PageContainer`

Cualquier vista o página que tenga un header sticky o una barra de acciones fija (`fixed bottom-0`) debe envolver su contenido principal con el componente `PageContainer` ubicado en [PageContainer.tsx](file:///c:/Users/hector.chinchilla/OneDrive%20-%20FIRPLAK%20SA/Escritorio/Manufactura/components/layout/PageContainer.tsx):

```tsx
import PageContainer from "@/components/layout/PageContainer";

export default function MiPagina() {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50">...</header>
            
            <PageContainer 
                as="main" 
                hasHeader={false} // Si el header fluye normalmente arriba
                hasFooter={true}  // Si la página tiene botones fijos abajo
                footerHeight="80px"
            >
                {/* Contenido scrolleable de la página */}
            </PageContainer>
            
            <footer className="fixed bottom-0 w-full">...</footer>
        </div>
    );
}
```

### Reglas de `PageContainer`:
1. **Compensación de Safe Area:** El componente incorpora nativamente `env(safe-area-inset-top)` y `env(safe-area-inset-bottom)` para evitar que el contenido se solape con notches o barras del sistema operativo móvil.
2. **Padding de Holgura:** Aplica automáticamente un padding adicional de `24px` en la parte inferior para garantizar que el último elemento de la lista respire y se pueda scrollear por encima del botón de acción.

---

## 3. Elementos Fijos en Pantalla

* **No usar Paddings Hardcodeados:** Prohibido el uso de clases como `pb-40`, `pb-96` o paddings arbitrarios en píxeles para "esquivar" las barras.
* **Consistencia:** Si se necesita añadir un nuevo elemento fijo (ej. un panel flotante), debe registrarse su altura correspondiente en una variable CSS y actualizar el `PageContainer` si aplica a toda la aplicación.
