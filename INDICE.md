# Índice de app.html

## HTML — Secciones de pantalla
| Sección | ID | Línea |
|---|---|---|
| Login | `#pantalla-login` | 220 |
| App wrapper | `#app` | 234 |
| Panel Principal | `#sec-principal` | 297 |
| Dashboard Admin | `#admin-dashboard` | 306 |
| Evaluaciones Web | `#sec-evaluaciones-web` | 382 |
| Cronograma | `#sec-cronograma` | 426 |
| ↳ Panel Eventos Programados | `#crono-panel-eventos` | 457 |
| ↳ Panel Reporte Anual | `#panel-reporte-anual` | 483 |
| ↳ Panel Tartarek | `#crono-panel-tartarek` | 499 |
| IE (Ingresos/Egresos) | `#sec-ie` | 433 |
| Reportes | `#sec-reportes` | 558 |
| Capacitadores | `#sec-capacitadores` | 801 |
| Cursos | `#sec-cursos` | 910 |
| Usuarios | `#sec-usuarios` | 1001 |
| Permisos | `#sec-permisos` | 1046 |
| Ventas de Ejecutivos | `#sec-ventas-ejecutivos` | 1070 |
| Eliminados | `#sec-eliminados` | 1098 |
| BPO / BPA | `#sec-bpo-bpa` | 1135 |

## HTML — Modales
| Modal | Línea |
|---|---|
| Modal Editar Venta | 1195 |
| Modal Ver Completo | 1269 |
| Modal Editar Capacitador | 1278 |
| Modal Reprogramar Evento | 1365 |
| Modal Evento Cronograma | 1387 |
| Modal Pregunta Web | 1427 |
| Modal Exportar Todo | 1472 |
| Modal Motivo Eliminación | 1526 |
| Modal Editar Usuario | 1547 |

## JavaScript — Por módulo

### Auth / Sesión
| Función | Línea |
|---|---|
| `login()` | 2019 |
| `cerrarSesion()` | 2034 |
| `cargarSesionPorToken(token)` | 2046 (canjea link_token vía Edge Function `link-login` + `verifyOtp`) |
| `cargarSesion()` | 2073 |
| `cargarPermisos()` | 2115 |
| `aplicarPermisosUI()` | 2131 |

> Nota: el resto del índice (después de esta sección) puede estar desactualizado respecto a `app.html` — verificar con grep antes de confiar en los números de línea.

### Navegación
| Función | Línea |
|---|---|
| `irSeccion(sec)` | 1750 |

### Panel Principal / Turnos
| Función | Línea |
|---|---|
| `cargarTurnos()` | 2217 |
| `renderTurnos(datos)` | 2524 |
| `construirTarjetaTurno(turno, filas)` | 2546 |
| `construirTablaVentas(filas, turnoId)` | 2571 |
| `filtrarVentas(texto)` | 2229 |
| `encontrarGruposDuplicados(datos)` | 2394 |
| `renderDuplicados(datos)` | 2455 |
| `COLUMNAS_VENTA` (definición) | 1832 |

### Eliminar con motivo
| Función | Línea |
|---|---|
| `_pedirMotivoEliminar(msg, cb)` | 2802 |
| `_confirmarEliminar()` | 2811 |
| `_cancelarEliminar()` | 2818 |
| `_logEliminacion(tipo, ids, motivo, datos)` | 2823 |
| `eliminarSeleccionadosTurno(turnoId)` | 2834 |

### Editar Venta
| Función | Línea |
|---|---|
| `abrirEditarVenta(id)` | 2902 |
| `cerrarEditarVenta()` | 2936 |
| `guardarEditarVenta()` | 2941 |

### Áreas y Cursos
| Función | Línea |
|---|---|
| `cargarAreasCursos(callback)` | 1857 |
| `renderSeccCursos()` | 1916 |
| `renderListaAreas()` | 1942 |
| `renderListaCursos()` | 1986 |
| `crearArea()` | 2053 |
| `crearCurso()` | 2072 |
| `eliminarArea(id)` | 2064 |
| `eliminarCurso(id)` | 2098 |
| `editarCursoInline(id)` | 2140 |
| `guardarEditCurso(id)` | 2176 |
| `_VERSIONES_CURSO` | 2138 |

### Usuarios
| Función | Línea |
|---|---|
| `cargarUsuarios()` | 2988 |
| `crearUsuario()` | 3060 |
| `toggleActivo(id, estado)` | 3078 |
| `abrirEditarUsuario(idx)` | 3028 |
| `guardarEdicionUsuario()` | 3043 |
| `copiarLinkUsuario(token, btn)` | 3016 |

### Permisos
| Función | Línea |
|---|---|
| `renderPermisos()` | 3087 |
| `actualizarPermiso(clave, rol, valor)` | 3102 |

### Cronograma
| Función | Línea |
|---|---|
| `seleccionarTipoCrono(tipo)` | 3599 (pestañas: eventos / anual / tartarek) |
| `inicializarTartarek()` / `seleccionarSubTartarek(tipo)` | ~3625 (sub-pestañas de Tartarek) |
| `analizarTartarekRepetir()` / `_renderTartarekRepetir(...)` | ~3650 (agente: recomienda cursos a repetir según reporte anual) |
| `cargarTartarekCursosNuevos()` / `_renderTartarekCursosNuevos(...)` | ~3675 (sub-tab "Cursos Nuevos", lee tabla `tartarek_cursos_nuevos`) |
| `enviarAIdeaCurso(id)` | ~3760 (copia una recomendación a `ideas_cursos`) |
| (backend) `ingest-cvs`: `normalizarNombre` + `posible_duplicado_de` | detecta posibles CVs duplicados por nombre parecido (sin tildes/extensión/"(1)") |
| `buscarCvTexto()` (palabras clave, gratis) / `cargarCvDuplicados()` | sub-tab "Buscar CV" en Tartarek |
| (backend) `match-course` usa `match_cvs_por_palabras` (Postgres, palabras clave, pesa más las coincidencias cerca del inicio del CV) — ya no depende de Voyage/pgvector |
| `rechazarCvDeIdea(ideaId, cvId)` / `descartarPalabraClave(palabra, ideaId)` | feedback: rechazar un CV puntual, o descartar una palabra genérica para siempre (tablas `cv_matches_rechazados`, `palabras_descartadas`) |
| `abrirFormSeguimiento` / `confirmarEnviarSeguimiento` | envía una idea a "Seguimiento" con CV o capacitador asignado (borra la idea de `ideas_cursos`) |
| `cargarSeguimiento` / `toggleEtapaSeguimiento` / `actualizarFechaEtapa` / `eliminarSeguimiento` | sub-tab "Seguimiento": 4 etapas con checkbox + fecha/hora editable a mano (semáforo verde/rojo vía `_colorFechaEtapa`), tabla `seguimiento_cursos` (incluye `enviado_por`, `whatsapp`) |
| `volverAIdeasCurso` / `editarSeguimientoInline` / `guardarEditSeguimiento` / `toggleVerMasSeguimiento` | Seguimiento: volver a Ideas de Curso, editar todo (nombre/detalle/contenido/docente/whatsapp), y desplegable de detalle+temario |
| `guardarIdeaCurso()` / `cargarIdeasCursos()` / `eliminarIdeaCurso(id)` | ~3775 (sub-tab "Ideas de Curso", tabla `ideas_cursos`) |
| `editarIdeaCursoInline(id)` / `guardarEditIdeaCurso(id)` | ~3830 (edición inline de una idea guardada) |
| `toggleMatchesIdea` / `cargarMatchesIdea` / `buscarCandidatosIdea` | ~3925 (CVs sugeridos por idea, via `cv_matches` + Edge Function `match-course`; incluye `motivo` = palabras clave coincidentes; `buscarCandidatosIdea` hace cola client-side para respetar el límite de 3/min de Voyage) |
| `_starsInputHtml` / `_starsDisplayHtml` / `_setEstrellas` | ~3880 (selector de importancia 1-5 estrellas; ideas ordenadas por importancia desc) |
| `inicializarCronograma()` | 3622 |
| `cargarCronograma()` | 3818 |
| `renderCronograma(eventos)` | 3938 |
| `abrirReprogramar(id)` | 3975 |
| `guardarEvento()` | 4857 |
| `eliminarEvento(id)` | 4884 |

### Capacitadores
| Función | Línea |
|---|---|
| `inicializarCapacitadoresTab()` | 3420 |
| `cargarCapacitadoresTab()` | 3612 |
| `agregarCapacitador()` | 3685 |
| `eliminarCapacitador(id)` | 3721 |
| `abrirEditarCap(id)` | 3497 |
| `guardarEditarCap()` | 3581 |

### Cursos Web
| Función | Línea |
|---|---|
| `COLUMNAS_WEB` (definición) | 3810 |
| `cargarVentasWeb()` | 3832 |
| `renderVentasWebSection()` | 3844 |
| `construirTablaWeb(filas)` | 3946 |
| `cambiarWebField(id, campo, valor)` | 4003 |
| `eliminarVentaWeb(id)` | 4011 |
| `eliminarSeleccionadosWeb()` | 3920 |
| `copiarMiLinkWeb(btn)` | 4025 |
| `exportarVentasWeb()` | 4070 |

### Evaluaciones Web
| Función | Línea |
|---|---|
| `inicializarEvaluacionesWeb()` | 4092 |
| `renderEvaluacionesWeb(cursos)` | 4143 |
| `copiarLinkFormulario(cursoId)` | 4195 |
| `cargarPreguntasCurso(cursoId)` | 4219 |
| `guardarPreguntaWeb()` | 4300 |
| `eliminarPreguntaWeb(pregId, cursoId)` | 4340 |

### Ingresos / Egresos (IE)
| Función | Línea |
|---|---|
| `inicializarIE()` | 4500 |
| `cargarIE()` | 4505 |
| `renderResumenIE()` | 4541 |
| `renderChartIE()` | 4583 |
| `renderTablaIE(filas)` | 4679 |
| `agregarMovimientoIE()` | 4704 |
| `eliminarMovimientoIE(id)` | 4732 |
| `exportarIE()` | 4741 |

### Reportes
| Función | Línea |
|---|---|
| `inicializarReportes()` | 4810 |
| `generarReporte()` | 4821 |
| `renderReporte(desde, hasta)` | 4855 |
| `inicializarReporteMes()` | 4992 |
| `generarReporteMes()` | 5014 |
| `renderReporteMes(year)` | 5032 |
| `inicializarReporteCurso()` | 5166 |
| `generarReporteCurso()` | 5177 |
| `renderReporteCurso(...)` | 5199 |
| `exportarReportePDF()` | 4937 |

### Admin Dashboard
| Función | Línea |
|---|---|
| `inicializarAdminDash()` | 5291 |
| `renderDashCards()` | 5349 |
| `renderDashChart()` | 5382 |
| `setFiltroDash(tipo)` | 5316 |

### Ventas de Ejecutivos
| Función | Línea |
|---|---|
| `inicializarVentasEjecutivos()` | 5414 |
| `cargarVentasEjecutivo()` | 5426 |
| `renderVentasEjecutivo()` | 5451 |
| `_veTablaVentas(filas)` | 5521 |
| `_veTablaWeb(filas)` | 5542 |

### BPO / BPA
| Función | Línea |
|---|---|
| `BPO_TABLA` (constante) | 5568 |
| `inicializarBPO()` | 5617 |
| `cargarBPO()` | 5628 |
| `calcularNivelBPO(numCursos, totalPart)` | 5607 |
| `_renderBPOCards()` | 5692 |
| `_bpoToggleCurso(uid, key)` | 5677 |
| `_bpoToggleWebDetail(uid)` | 5683 |
| `toggleTablaBPORef()` | 5585 |

### Eliminados
| Función | Línea |
|---|---|
| `cargarEliminados()` | 5827 |

### Utilidades
| Función | Línea |
|---|---|
| `escHtml(str)` | 4758 |
| `mostrarToast(msg)` | 1598 |
| `mostrarLoginMsg(msg)` | 1605 |
