# VirtuallCorp — Sistema de Ventas y Gestión

Panel interno de gestión para una academia de capacitación: control de ventas por turno, cronograma de eventos, finanzas, reportes y administración de usuarios, todo con autenticación por roles y actualización en tiempo real.

Construido como SPA en JavaScript vanilla (sin framework) sobre Supabase, pensado para correr liviano en cualquier hosting estático.

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

1. Clona el repo y abre `index.html` con cualquier servidor estático (o usa la extensión Live Server de VS Code — abrir el archivo directo con `file://` no funciona por CORS de Supabase).
2. Crea un proyecto en [Supabase](https://supabase.com) y corre `supabase-schema.sql` en el SQL Editor para crear las tablas.
3. En `app.html`, `form-web.html` y `registro-cliente.html`, reemplaza `SUPABASE_URL` y `SUPABASE_ANON_KEY` por las credenciales de tu proyecto (Settings → API en el dashboard de Supabase).
4. Despliega las Edge Functions de `supabase/functions/` con el [CLI de Supabase](https://supabase.com/docs/guides/cli) (`supabase functions deploy`).

> Este repo es una pieza de portfolio: las credenciales originales fueron removidas y reemplazadas por placeholders.

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
