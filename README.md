# VirtuallCorp — Sistema de Ventas y Gestión

**🔗 Demo en vivo:** https://ramiroz93.github.io/sistema-ventas-virtualcorp/app.html — 100% funcional, sin necesidad de crear cuenta: elige con qué rol entrar (Administrador / Supervisora / Ejecutivo de Ventas) y prueba el panel completo con datos ficticios.

Panel interno de gestión para una academia de capacitación: control de ventas por turno, cronograma de eventos, finanzas, reportes y administración de usuarios, todo con autenticación por roles y actualización en tiempo real.

Construido como SPA en JavaScript vanilla (sin framework) sobre Supabase, pensado para correr liviano en cualquier hosting estático.

## Sobre la demo en vivo

Corre 100% en el navegador, sin backend real: al inicio de `app.html`, el cliente real de Supabase fue reemplazado por un mock en memoria con la misma interfaz (`.from().select/insert/update/delete`) pero datos ficticios — ventas, cronograma, capacitadores, usuarios, ingresos/egresos, y también Maxxor y Tartarek (que siguen siendo pestañas de este mismo sistema). Puedes crear, editar y eliminar libremente; los cambios viven solo en tu pestaña y se pierden al recargar.

> `index.html` (la portada del repo) pertenece a una versión anterior del sistema basada en Google Apps Script — el sistema actual, con el que corre la demo, es `app.html`.

## Qué resuelve

Antes disperso en hojas de cálculo, el sistema centraliza en un solo panel:

- Registro y seguimiento de ventas por turno y vendedor, con detección de duplicados
- Cronograma de eventos y cursos, con reportes anuales y por curso
- Control de ingresos y egresos con gráficos y exportación
- Gestión de capacitadores, cursos, áreas y pagos
- Evaluaciones web para alumnos, con formularios por curso
- Administración de usuarios y permisos por rol (admin, supervisor, ejecutivo)
- Exportación de reportes a PDF

Dos módulos avanzados del mismo sistema —control de personal en tiempo real y un agente de recomendación de cursos con matching de CVs— se muestran como proyectos aparte por su complejidad propia:
- **[Maxxor](https://github.com/ramiroz93/maxxor)** — panel de control de personal en tiempo real
- **[Tartarek](https://github.com/ramiroz93/tartarek)** — agente de recomendación de cursos con matching de CVs

## Stack técnico

- **Frontend:** JavaScript vanilla, HTML/CSS (sin build step, sin framework)
- **Backend:** [Supabase](https://supabase.com) — Postgres, Auth, Edge Functions (Deno), Storage
- **Deploy:** Vercel
- **PWA:** instalable, con service worker para uso offline básico

## Cómo correrlo localmente

Clona el repo y abre `app.html` con cualquier servidor estático (o la extensión Live Server de VS Code) — corre igual que la demo en vivo, sin configurar nada.

Para conectarlo a un Supabase real en vez del mock: crea un proyecto en [Supabase](https://supabase.com), corre `supabase-schema.sql`, reemplaza el bloque de datos de demo al inicio del `<script>` de `app.html` por `var supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);` con tus propias credenciales (Settings → API), y despliega las Edge Functions de `supabase/functions/` con el [CLI de Supabase](https://supabase.com/docs/guides/cli).

> Este repo es una pieza de portfolio: las credenciales originales fueron removidas.

## Estructura

```
├── index.html              ← landing
├── app.html                ← SPA principal (dashboard, ventas, reportes, admin)
├── admin.html / supervisor.html / ejecutivo.html  ← paneles por rol
├── form-web.html           ← formulario público de evaluación de cursos
├── registro-cliente.html   ← registro de clientes/alumnos
├── supabase-schema.sql     ← esquema de base de datos
├── supabase/functions/     ← Edge Functions (Deno)
└── apps-script.js          ← integración alternativa vía Google Apps Script/Sheets
```
