// ================================================================
// SISTEMA DE VENTAS - VIRTUALCORP
// Pegar este codigo completo en: script.google.com
// ================================================================

// PASO 1: Configura tus hojas aqui
var HOJAS_CONFIG = [
  { id: '1f1L_5QEd8CbFeby1hxRFhfC0JagJKu99kBrVQOaQ2LQ', nombre: 'Manana - Alvaro',   vendedor: 'Alvaro',  turno: 'Manana' },
  { id: '1RmFKDvyDX6OMD4Iu1qxqJStB8tn65SFswtTfKw7dwEE', nombre: 'Tarde - Alvaro',    vendedor: 'Alvaro',  turno: 'Tarde'  },
  { id: '17t6Mj8vbU2gEL1ksK_BBibhMUuM5WyjVkTnRfYfJne4', nombre: 'Noche - Alvaro',    vendedor: 'Alvaro',  turno: 'Noche'  },
  { id: '1uU-z4FhF6ltLrznPOsFd2skGX6_aKf6MrWSavJVC4Ew', nombre: 'Manana - Mariela',  vendedor: 'Mariela', turno: 'Manana' },
  { id: '1hBDKtkS6ezGoBxrHUcXfyASN6YU8XcpMl1sfMSmx8Yc', nombre: 'Tarde - Mariela',   vendedor: 'Mariela', turno: 'Tarde'  },
  { id: '1-1titBKtuprFM0GLnnHdg3YoqkHc5WgpW4ZKDZcSm30', nombre: 'Noche - Mariela',   vendedor: 'Mariela', turno: 'Noche'  },
  { id: '1bontb4W6xr3FIu5ENhG3NR74JSz53cW0BT92WNXXsjw', nombre: 'Manana - Mafer',    vendedor: 'Mafer',   turno: 'Manana' },
  { id: '1qG4dR9tg6tXckCxNIZbLzoK7wOudDF3k7hjmb8AXwg8', nombre: 'Tarde - Mafer',     vendedor: 'Mafer',   turno: 'Tarde'  },
  { id: '1ZwzyDBkFYvEe2_9QSdywFqVMWPIStBGQ924vd8QlXOw', nombre: 'Noche - Mafer',     vendedor: 'Mafer',   turno: 'Noche'  },
  { id: '1v1hZomEKE1GxstfS1tSRYk0Lqak8jBrUrym05slCzCw', nombre: 'Manana - Susi',     vendedor: 'Susi',    turno: 'Manana' },
  { id: '1qV6dChwumVhG-BMa0C88GZSmgbWcPvYqsJFVFcPqxWQ', nombre: 'Tarde - Susi',      vendedor: 'Susi',    turno: 'Tarde'  },
  { id: '1ptrMZ7xHsRsC8JGbhCztobXjohqOLqK0kBG8MAxdojE', nombre: 'Noche - Susi',      vendedor: 'Susi',    turno: 'Noche'  }
];

// Hoja de cursos web (columnas distintas)
var HOJA_WEB = {
  id: '1jKYrcOrBWIvAF7u1YnTW86-Ke1QaoRW1FvDBrj3yD7Q',
  nombre: 'Cursos Web'
};

var COL_WEB = {
  marcaTemporal:    0,   // A
  nombres:          1,   // B
  celular:          2,   // C
  fechaInscripcion: 3,   // D
  monto:            4,   // E
  tipoVenta:        6,   // G (turno)
  bancoBilletera:   7,   // H
  vendedor:         8,   // I
  area:             12,  // M
  curso:            13,  // N
  realizado:        14   // O
};

// PASO 2: Posicion de cada columna (empieza en 0)
// Si una columna no existe en tu hoja, pon -1
var COL = {
  marcaTemporal:     0,
  nombres:           1,
  ci:                2,
  celular:           3,
  correo:            4,
  numeroTransaccion: 5,
  razonSocial:       6,
  nit:               7,
  medioCancelacion:  8,
  atencionCliente:   9,
  notificaciones:    10,
  fechaPago:         11,
  bancoBilletera:    12,
  banco:             13,
  monto:             14,
  verificado:        15,
  area:              16,
  curso:             17
};

// ================================================================
// NO MODIFICAR A PARTIR DE AQUI
// ================================================================

function formatVal(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  }
  return (val !== undefined && val !== null) ? String(val).trim() : '';
}

function doGet(e) {
  var params   = e.parameter;
  var password = params.password || '';
  var role     = params.role     || '';
  var callback = params.callback || '';

  var props     = PropertiesService.getScriptProperties();
  // Configura SUPERVISOR_PASSWORD y ADMIN_PASSWORD en Script Properties (no dejes un fallback en el código)
  var passSuper = props.getProperty('SUPERVISOR_PASSWORD') || 'CAMBIAR_ESTA_CLAVE';
  var passAdmin = props.getProperty('ADMIN_PASSWORD')      || 'CAMBIAR_ESTA_CLAVE';

  var rolVerificado = null;
  if (role === 'supervisor' && password === passSuper) { rolVerificado = 'supervisor'; }
  if (role === 'admin'      && password === passAdmin)  { rolVerificado = 'admin'; }

  if (!rolVerificado) {
    return responder({ status: 'error', message: 'Contrasena incorrecta' }, callback);
  }

  // ── ACCIONES DE INGRESOS/EGRESOS (lectura y escritura centralizada) ──
  if (params.action) {
    return manejarAccionIE(params, rolVerificado, callback);
  }

  try {
    var forzar = params.forzar === '1';
    var ventas = forzar ? null : leerVentasDeCache();

    if (!ventas) {
      ventas = leerTodasLasVentas();
      guardarVentasEnCache(ventas);
    }

    var ieData = obtenerDatosIE();

    return responder({
      status: 'success',
      role:   rolVerificado,
      total:  ventas.length,
      data:   ventas,
      ie:     ieData
    }, callback);

  } catch (err) {
    return responder({ status: 'error', message: err.message }, callback);
  }
}

// ================================================================
// CACHE DE VENTAS - evita releer las 13 hojas en cada ingreso
// Se guarda por 4 minutos. El boton "Actualizar datos" la salta (forzar=1).
// ================================================================

var VENTAS_CACHE_SEGUNDOS = 240;

function leerVentasDeCache() {
  try {
    var cache    = CacheService.getScriptCache();
    var countStr = cache.get('ventas_chunks_count');
    if (!countStr) return null;

    var count = parseInt(countStr);
    var keys  = [];
    for (var i = 0; i < count; i++) keys.push('ventas_chunk_' + i);

    var partes = cache.getAll(keys);
    var json   = '';
    for (var j = 0; j < count; j++) {
      var parte = partes['ventas_chunk_' + j];
      if (parte === null || parte === undefined) return null;
      json += parte;
    }

    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function guardarVentasEnCache(ventas) {
  try {
    var cache     = CacheService.getScriptCache();
    var json      = JSON.stringify(ventas);
    var tamChunk  = 90000;
    var chunks    = [];

    for (var i = 0; i < json.length; i += tamChunk) {
      chunks.push(json.substring(i, i + tamChunk));
    }

    var paraGuardar = {};
    chunks.forEach(function(c, idx) { paraGuardar['ventas_chunk_' + idx] = c; });
    paraGuardar['ventas_chunks_count'] = String(chunks.length);

    cache.putAll(paraGuardar, VENTAS_CACHE_SEGUNDOS);
  } catch (e) {
    // si la cache falla, no rompe nada, simplemente no cachea
  }
}

function leerTodasLasVentas() {
  var ventas = [];

  // ── HOJAS EN VIVO (12 hojas de vendedores) ──
  for (var h = 0; h < HOJAS_CONFIG.length; h++) {
    var cfg = HOJAS_CONFIG[h];
    var ss;

    try {
      ss = SpreadsheetApp.openById(cfg.id);
    } catch (err) {
      continue;
    }

    var hoja  = ss.getSheets()[0];
    var datos = hoja.getDataRange().getValues();

    if (datos.length < 2) { continue; }

    for (var i = 1; i < datos.length; i++) {
      var fila = datos[i];

      if (!fila[0] && !fila[1]) { continue; }

      var val;
      var reg = {
        _id:       cfg.id + '_' + i,
        _hoja:     cfg.nombre,
        _vendedor: cfg.vendedor,
        _turno:    cfg.turno,
        _tipo:     'vivo'
      };

      var claves = Object.keys(COL);
      for (var k = 0; k < claves.length; k++) {
        var clave = claves[k];
        var idx   = COL[clave];
        val = (idx >= 0 && idx < fila.length) ? fila[idx] : '';
        reg[clave] = formatVal(val);
      }

      ventas.push(reg);
    }
  }

  // ── HOJA WEB (cursos web) ──
  try {
    var ssWeb = SpreadsheetApp.openById(HOJA_WEB.id);
    var allSheets = ssWeb.getSheets();
    var hojaWeb = null;
    for (var s = 0; s < allSheets.length; s++) {
      if (allSheets[s].getName().toUpperCase().indexOf('BOLIVIA') >= 0) {
        hojaWeb = allSheets[s];
        break;
      }
    }
    if (!hojaWeb) hojaWeb = allSheets[0];
    var datosWeb = hojaWeb.getDataRange().getValues();

    for (var w = 1; w < datosWeb.length; w++) {
      var fw = datosWeb[w];
      if (!fw[0] && !fw[1]) { continue; }

      var vendedorWeb = formatVal(fw[COL_WEB.vendedor]);
      var turnoWeb    = formatVal(fw[COL_WEB.tipoVenta]);

      var regWeb = {
        _id:              HOJA_WEB.id + '_' + w,
        _hoja:            HOJA_WEB.nombre,
        _vendedor:        vendedorWeb,
        _turno:           turnoWeb || 'Web',
        _tipo:            'web',
        marcaTemporal:    formatVal(fw[COL_WEB.marcaTemporal]),
        nombres:          formatVal(fw[COL_WEB.nombres]),
        ci:               '',
        celular:          formatVal(fw[COL_WEB.celular]),
        correo:           '',
        numeroTransaccion:'',
        razonSocial:      '',
        nit:              '',
        medioCancelacion: '',
        atencionCliente:  '',
        notificaciones:   '',
        fechaPago:        formatVal(fw[COL_WEB.fechaInscripcion]),
        bancoBilletera:   formatVal(fw[COL_WEB.bancoBilletera]),
        banco:            '',
        monto:            formatVal(fw[COL_WEB.monto]),
        verificado:       formatVal(fw[COL_WEB.realizado]),
        area:             formatVal(fw[COL_WEB.area]),
        curso:            formatVal(fw[COL_WEB.curso]),
        tipoVenta:        turnoWeb
      };

      ventas.push(regWeb);
    }
  } catch (errWeb) {
    // Si la hoja web falla, continuar con las demas
  }

  return ventas;
}

// ================================================================
// INGRESOS / EGRESOS - guardado dentro del Apps Script (PropertiesService)
// NO crea ninguna hoja de Google visible en Drive.
// ================================================================

function migrarHojaIEAntiguaSiExiste() {
  var props = PropertiesService.getScriptProperties();
  var ssId  = props.getProperty('IE_SHEET_ID');
  if (!ssId) return;

  try {
    var ss  = SpreadsheetApp.openById(ssId);
    var shE = ss.getSheetByName('Entradas');
    var shC = ss.getSheetByName('Categorias');

    if (shE) {
      var dE = shE.getDataRange().getValues();
      for (var i = 1; i < dE.length; i++) {
        var r = dE[i];
        if (!r[0]) continue;
        var entry = {
          id: String(r[0]), tipo: String(r[1]), categoria: String(r[2]),
          monto: Number(r[3]) || 0, fecha: String(r[4]), descripcion: String(r[5] || '')
        };
        props.setProperty('ieentry_' + entry.id, JSON.stringify(entry));
      }
    }

    if (shC) {
      var dC = shC.getDataRange().getValues();
      var catsIng = [], catsGto = [];
      for (var j = 1; j < dC.length; j++) {
        var rc = dC[j];
        if (!rc[0] || !rc[1]) continue;
        if (rc[0] === 'i') catsIng.push(String(rc[1])); else catsGto.push(String(rc[1]));
      }
      if (catsIng.length) props.setProperty('iecats_ing', JSON.stringify(catsIng));
      if (catsGto.length) props.setProperty('iecats_gto', JSON.stringify(catsGto));
    }

    try { DriveApp.getFileById(ssId).setTrashed(true); } catch (eTrash) {}
    props.deleteProperty('IE_SHEET_ID');

  } catch (err) {
    // si falla la migracion no rompe nada, simplemente no migra
  }
}

function obtenerDatosIE() {
  migrarHojaIEAntiguaSiExiste();

  var props = PropertiesService.getScriptProperties();
  var all   = props.getProperties();

  var entries = [];
  Object.keys(all).forEach(function(key) {
    if (key.indexOf('ieentry_') === 0) {
      try { entries.push(JSON.parse(all[key])); } catch (e) {}
    }
  });

  var catsIng = all['iecats_ing'] ? JSON.parse(all['iecats_ing']) : ['YouTube', 'Otros Ingresos'];
  var catsGto = all['iecats_gto'] ? JSON.parse(all['iecats_gto']) : ['Sueldos y Salarios', 'Publicidad'];

  return { entries: entries, catsIng: catsIng, catsGto: catsGto };
}

function manejarAccionIE(p, rol, callback) {
  if (rol !== 'admin') {
    return responder({ status: 'error', message: 'No autorizado' }, callback);
  }

  try {
    var props = PropertiesService.getScriptProperties();

    if (p.action === 'ie_add') {
      var id = 'ie_' + Date.now();
      var entry = { id: id, tipo: p.tipo, categoria: p.categoria, monto: Number(p.monto) || 0, fecha: p.fecha, descripcion: p.descripcion || '' };
      props.setProperty('ieentry_' + id, JSON.stringify(entry));

    } else if (p.action === 'ie_edit') {
      var key = 'ieentry_' + p.id;
      if (props.getProperty(key)) {
        var entryE = { id: p.id, tipo: p.tipo, categoria: p.categoria, monto: Number(p.monto) || 0, fecha: p.fecha, descripcion: p.descripcion || '' };
        props.setProperty(key, JSON.stringify(entryE));
      }

    } else if (p.action === 'ie_delete') {
      props.deleteProperty('ieentry_' + p.id);

    } else if (p.action === 'ie_addcat') {
      var catsKey = p.tipo === 'i' ? 'iecats_ing' : 'iecats_gto';
      var current = props.getProperty(catsKey);
      current = current ? JSON.parse(current) : (p.tipo === 'i' ? ['YouTube', 'Otros Ingresos'] : ['Sueldos y Salarios', 'Publicidad']);
      current.push(p.nombre);
      props.setProperty(catsKey, JSON.stringify(current));

    } else if (p.action === 'ie_delcat') {
      var catsKey2 = p.tipo === 'i' ? 'iecats_ing' : 'iecats_gto';
      var current2 = props.getProperty(catsKey2);
      current2 = current2 ? JSON.parse(current2) : (p.tipo === 'i' ? ['YouTube', 'Otros Ingresos'] : ['Sueldos y Salarios', 'Publicidad']);
      current2 = current2.filter(function(c) { return c !== p.nombre; });
      props.setProperty(catsKey2, JSON.stringify(current2));
    }

    return responder({ status: 'success', ie: obtenerDatosIE() }, callback);

  } catch (err) {
    return responder({ status: 'error', message: err.message }, callback);
  }
}

function responder(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// ================================================================
// EJECUTA ESTA FUNCION UNA SOLA VEZ para configurar contrasenas
// Menu: Ejecutar -> configurarContrasenas
// ================================================================
function configurarContrasenas() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('SUPERVISOR_PASSWORD', 'CAMBIAR_ESTA_CLAVE');
  props.setProperty('ADMIN_PASSWORD',      'CAMBIAR_ESTA_CLAVE');
  Logger.log('Contrasenas configuradas. Cambia los valores de este script antes de ejecutarlo.');
}
