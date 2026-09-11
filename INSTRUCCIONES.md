# Sistema de Ventas VirtuallCorp — Instrucciones de instalación

## PASO 1 — Configurar Google Apps Script (el cerebro de la app)

1. Ir a: **script.google.com**
2. Clic en **"Nuevo proyecto"**
3. Borrar todo el código que aparece
4. Copiar y pegar todo el contenido de **`apps-script.js`**
5. Clic en el ícono de guardar (o Ctrl+S)
6. Ponerle un nombre al proyecto: `VirtuallCorp Ventas`

### Configurar las contraseñas (hacer solo una vez):

7. En el menú superior, hacer clic en **"Ejecutar"** → **"configurarContrasenas"**
8. Google pedirá autorización → clic en **"Revisar permisos"** → elegir tu cuenta de Google → clic en **"Permitir"**
9. Aparecerá un mensaje en el log: `✅ Contraseñas configuradas`

> Antes de ejecutar `configurarContrasenas`, edita esa función en el código y reemplaza `CAMBIAR_ESTA_CLAVE` por las contraseñas que quieras usar para Supervisor y Admin.

### Publicar como aplicación web:

10. Clic en **"Implementar"** → **"Nueva implementación"**
11. Clic en el ícono de engranaje → **"Aplicación web"**
12. Configurar así:
    - Descripción: `Sistema VirtuallCorp`
    - Ejecutar como: **Yo (tu@email.com)**
    - Quién tiene acceso: **Cualquier persona**
13. Clic en **"Implementar"**
14. **Copiar la URL** que aparece (empieza con `https://script.google.com/macros/s/...`)

---

## PASO 2 — Pegar la URL en los archivos HTML

1. Abrir **`supervisor.html`** con el Bloc de notas o cualquier editor de texto
2. Buscar la línea: `const APPS_SCRIPT_URL = 'PEGAR_AQUI_TU_URL_DE_APPS_SCRIPT';`
3. Reemplazar `PEGAR_AQUI_TU_URL_DE_APPS_SCRIPT` con la URL copiada en el paso anterior
4. Guardar el archivo
5. Repetir los mismos 4 pasos para **`admin.html`**

---

## PASO 3 — Publicar en internet (gratis)

### Opción A — Netlify Drop (más fácil, sin cuenta):

1. Ir a: **app.netlify.com/drop**
2. Arrastrar toda la carpeta `sistema-ventas-virtualcorp` al recuadro
3. Esperar unos segundos
4. Netlify te dará una URL como: `https://nombre-aleatorio.netlify.app`

Los links quedan así:
- **Supervisor:** `https://nombre-aleatorio.netlify.app/supervisor.html`
- **Admin:** `https://nombre-aleatorio.netlify.app/admin.html`

### Opción B — GitHub Pages:

1. Crear cuenta en **github.com** (si no tienes)
2. Clic en **"New repository"** → nombre: `virtualcorp-ventas` → **"Create repository"**
3. Subir todos los archivos de la carpeta
4. Ir a **Settings** → **Pages** → Source: **Deploy from a branch** → Branch: **main** → Save
5. Esperar 2 minutos → la URL aparece en la misma sección de Pages

---

## PASO 4 — Dar acceso a Google Sheets al script

Si el script no puede leer las hojas, asegurarse de que:

1. Las hojas de Google Sheets sean **accesibles por el dueño del script**
2. Si las hojas son de otra cuenta de Google, compartirlas con el correo del script
3. En cada hoja: Compartir → agregar el correo → rol **Lector**

---

## Archivos del proyecto

```
sistema-ventas-virtualcorp/
├── supervisor.html    ← Panel para supervisores (link azul)
├── admin.html         ← Panel para administradores (link morado)
├── apps-script.js     ← Código para pegar en script.google.com
├── manifest.json      ← Para instalación como app en celular
├── sw.js              ← Servicio offline
├── icon.svg           ← Ícono de la app
└── INSTRUCCIONES.md   ← Este archivo
```

---

## Agregar más hojas de cálculo

Cuando tengas más hojas (el resto de las 9 y más), abrí `apps-script.js` y agregá entradas en `HOJAS_CONFIG`:

```javascript
{
  id: 'ID_DE_LA_NUEVA_HOJA',
  nombre: 'Nombre descriptivo',
  vendedor: 'Nombre del vendedor',
  turno: 'Mañana'  // o Tarde o Noche
},
```

Después volvé a **Implementar** el script (nueva implementación) y la app automáticamente mostrará los nuevos datos.

---

## Soporte

Si algo no funciona, describí el problema y Claude te ayuda a resolverlo.
