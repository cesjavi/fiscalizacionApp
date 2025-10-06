# Flujo para obtener y mostrar la dirección de fiscalización

Este documento detalla todos los pasos que sigue la aplicación para conseguir la
**dirección** (y el resto de datos del establecimiento) asignada a un fiscal y
hacerla visible en la pantalla de acciones.

## 1. Consulta al backend y guardado local

1. La pantalla **Fiscalización** (`src/pages/FiscalizacionLookup.tsx`) realiza un
   `POST` a `/api/fiscalizacion/buscarFiscal` con el DNI del miembro. En caso de
   autorización correcta, la respuesta incluye la estructura completa con los
   datos del establecimiento (`establecimiento_fiscalizacion`, `direccion`,
   `ubicacion`, etc.).
2. Antes de navegar, el resultado se normaliza con
   `normalizeFiscalData(fiscal)` y se persiste en `localStorage` bajo la clave
   `fiscalData`. También se guarda en el `FiscalDataContext` para que el resto
   de la app lo comparta.

## 2. Normalización de los campos relevantes

1. `normalizeFiscalData` (`src/FiscalDataContext.tsx`) toma cualquier objeto que
   parezca un fiscal y:
   - Busca personas anidadas (`persona`, `fg_asignado`, etc.) para copiar los
     campos útiles al nivel raíz.
   - Homogeneiza apellidos, nombres, tipo de fiscal y zona para facilitar los
     renders posteriores.
2. Gracias a esa normalización, la estructura queda lista para extraer la
   dirección sin importar cómo venga nombrada en la respuesta.

## 3. Extracción de establecimiento y dirección

1. Cuando la pantalla de acciones necesita mostrar los datos asignados, invoca
   `getFiscalAssignmentDetails(fiscalData)`.
2. Este helper recorre la información normalizada y obtiene:
   - `establecimiento`: busca en una lista de claves conocidas (por ejemplo
     `nombre_establecimiento`, `nombre_escuela`, `establecimiento_fiscalizacion`).
   - `direccion`: intenta primero las claves más comunes (`direccion`,
     `domicilio`, `ubicacion`, `direccion_establecimiento`, etc.). Si la
     dirección está dentro de un objeto `establecimiento`, vuelve a revisar esas
     claves en el objeto interno.
   - `fiscalGeneral`, `mesa` y `lugar` se resuelven de la misma manera con sus
     conjuntos de claves.

## 4. Fallbacks con valores cacheados

1. Si la respuesta del backend no incluye alguno de los datos, la pantalla
   `FiscalizacionActions` revisa otras entradas de `localStorage` (por ejemplo
   `direccion_establecimiento`, `establecimiento_fiscalizacion`, `domicilio`).
2. El helper `readStoredAssignmentValue` parsea esas entradas, admite objetos
   JSON (ej. `{ "direccion": "Camacuá 493" }`) y devuelve el primer texto
   válido que encuentre.
3. Como último recurso, arma una etiqueta con `Sección` y `Circuito` cuando la
   dirección no está disponible pero sí existen esos datos.

## 5. Render en la pantalla de acciones

Con los valores finales (`establecimientoAsignado`, `direccionAsignada`, etc.),
`src/pages/FiscalizacionActions.tsx` muestra en el layout la mesa, el lugar, el
establecimiento y la dirección que correspondan al fiscal activo.

De esta manera la dirección se obtiene automáticamente desde la respuesta del
backend, se normaliza para cubrir distintos formatos y se completan los huecos
con la información almacenada en el dispositivo si fuera necesario.
