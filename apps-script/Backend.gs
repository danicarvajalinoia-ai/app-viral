/**
 * ============================================================
 * APP MARKETING · RADAR DE REFERENTES — Backend
 * ============================================================
 *
 * Este archivo es GENÉRICO: no tiene ningún ID de hoja ni ninguna llave
 * escrita adentro. Se vincula solo a la hoja que lo contiene, así que la
 * misma copia le sirve a cualquier persona.
 *
 * QUÉ HACE
 *   1. Recibe el enlace de un post de un competidor.
 *   2. Lo scrapea con Apify (Instagram / TikTok / YouTube).
 *   3. Si el post no trae subtítulos y hay llave de OpenAI, descarga el
 *      video y transcribe el audio.
 *   4. Le pide a la IA que genere Guion, Caption, Carrusel y Video 10s.
 *   5. Guarda todo como una fila en la hoja.
 *
 * INSTALACIÓN: ver INSTALACION.md. Resumen:
 *   Extensiones → Apps Script → pegar este archivo → Implementar →
 *   Nueva implementación → App web → Ejecutar como: Yo →
 *   Con acceso a: Cualquier usuario → copiar la URL /exec.
 *
 * Las llaves (Apify y la IA) NO se ponen aquí: se configuran desde la
 * pantalla de Ajustes de la app y quedan guardadas en las Propiedades del
 * script, donde el navegador no puede leerlas.
 */

// ── Nombres de las columnas, tal como aparecen en la fila 1 de la hoja ──
// El mapeo se hace POR NOMBRE, no por posición: si mueves una columna de
// lugar o agregas una nueva, todo sigue funcionando.
var COLS = {
  referente:   'Referente',
  views:       'Views',
  likes:       'Likes',
  comentarios: 'Comentarios',
  hashtag:     '#hashtag',
  numPost:     '# de Post',
  fecha:       'Fecha de publicación',
  pais:        'País',
  plataforma:  'Plataforma',
  tema:        'Tema',
  transcripcion: 'Transcripción',
  traduccion:  'Traducción',
  guion:       'Copy / Guion',
  caption:     'Caption',
  carrusel:    'Carrusel',
  video10s:    'Videos 10s',
  pieza:       'Pieza / Video',
  estado:      'Estado',
  // El texto que el referente publicó con su post. Se guarda aparte porque
  // la columna Caption guarda el que escribe la IA, y "Regenerar" necesita
  // el original cuando el post no trajo transcripción.
  captionOriginal: 'Caption original',
  id:          'ID'
}

// Columnas que el backend agrega solo, al final, si la hoja no las tiene.
var COLS_AUTOMATICAS = [COLS.captionOriginal, COLS.id]

var HOJA_DEFAULT = 'Referentes'
var PROPS = PropertiesService.getScriptProperties()

// ── Actores de Apify que leen un POST suelto ──
// No se exponen en la app: al comprador no le sirven de nada y solo estorban.
// Si alguna vez Apify cambia un actor, se sobreescribe sin tocar el código
// desde Configuración del proyecto → Propiedades del script, creando
// ACTOR_INSTAGRAM, ACTOR_TIKTOK o ACTOR_YOUTUBE.
var ACTORES_DEFAULT = {
  instagram: 'apify~instagram-scraper',
  tiktok:    'clockworks~tiktok-scraper',
  youtube:   'streamers~youtube-scraper'
}

// ============================================================
// ENTRADA HTTP
// ============================================================

function doGet(e) {
  return json_({ ok: true, status: 'App Marketing · Radar de Referentes' })
}

function doPost(e) {
  try {
    var d = {}
    try { d = JSON.parse((e && e.postData && e.postData.contents) || '{}') } catch (err) { d = {} }
    var action = d.action || ''

    // Acciones que no exigen clave: saber si el script ya está configurado y
    // ponerle clave la primera vez.
    if (action === 'estado')   return json_(h_estado())
    if (action === 'setClave') return json_(h_setClave(d))

    // De aquí en adelante, todo exige la clave de acceso.
    var g = verificarClave_(d)
    if (!g.ok) return json_(g)

    if (action === 'listar')     return json_(h_listar())
    if (action === 'analizar')   return json_(h_analizar(d))
    if (action === 'listarCuentas')  return json_(h_listarCuentas())
    if (action === 'addCuenta')      return json_(h_addCuenta(d))
    if (action === 'updateCuenta')   return json_(h_updateCuenta(d))
    if (action === 'deleteCuenta')   return json_(h_deleteCuenta(d))
    if (action === 'listarMetricas') return json_(h_listarMetricas())
    if (action === 'scrapeSeguidores') return json_(h_scrapeSeguidores(d))
    if (action === 'regenerar')  return json_(h_regenerar(d))
    if (action === 'guardar')    return json_(h_guardar(d))
    if (action === 'eliminar')   return json_(h_eliminar(d))
    if (action === 'getConfig')  return json_(h_getConfig())
    if (action === 'saveConfig') return json_(h_saveConfig(d))

    return json_({ ok: false, error: 'Acción desconocida: ' + action })
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) })
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}

// ============================================================
// CLAVE DE ACCESO
// ============================================================
//
// El App Web se publica como "cualquier usuario" porque el frontend vive en
// Netlify y Google no permite login cruzado entre dominios. Por eso la app se
// protege con una clave que el dueño define la primera vez que entra.

function h_estado() {
  return { ok: true, configurado: !!PROPS.getProperty('CLAVE_ACCESO') }
}

function h_setClave(d) {
  if (PROPS.getProperty('CLAVE_ACCESO')) {
    return { ok: false, error: 'Esta app ya tiene una clave definida.' }
  }
  var clave = String(d.clave || '').trim()
  if (clave.length < 6) return { ok: false, error: 'La clave debe tener al menos 6 caracteres.' }
  PROPS.setProperty('CLAVE_ACCESO', clave)
  return { ok: true }
}

function verificarClave_(d) {
  var real = PROPS.getProperty('CLAVE_ACCESO')
  if (!real) return { ok: false, error: 'SIN_CONFIGURAR' }
  if (String(d.clave || '') !== real) return { ok: false, error: 'CLAVE_INVALIDA' }
  return { ok: true }
}

// ============================================================
// ACCESO A LA HOJA
// ============================================================

/** La hoja de trabajo: la que tenga la columna "Referente", o la primera. */
function hoja_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var hojas = ss.getSheets()
  for (var i = 0; i < hojas.length; i++) {
    var h = hojas[i]
    if (h.getLastColumn() < 1) continue
    var enc = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0]
    for (var j = 0; j < enc.length; j++) {
      if (String(enc[j]).trim() === COLS.referente) return h
    }
  }
  // Ninguna hoja tiene los encabezados todavía → se preparan en la primera.
  var destino = ss.getSheetByName(HOJA_DEFAULT) || hojas[0] || ss.insertSheet(HOJA_DEFAULT)
  crearEncabezados_(destino)
  return destino
}

/** Escribe la fila de encabezados en una hoja vacía. */
function crearEncabezados_(h) {
  var enc = [COLS.referente, COLS.views, COLS.likes, COLS.comentarios, COLS.hashtag,
    COLS.numPost, COLS.fecha, COLS.pais, COLS.plataforma, '', COLS.tema,
    COLS.transcripcion, COLS.traduccion, COLS.guion, COLS.caption, COLS.carrusel,
    COLS.video10s, COLS.pieza, COLS.estado, COLS.captionOriginal, COLS.id]
  h.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight('bold')
  h.setFrozenRows(1)
}

/**
 * Mapa nombre-de-columna → índice (base 0). Si faltan las columnas
 * automáticas (Caption original e ID), las agrega al final. ID es la que
 * permite editar una fila sin equivocarse cuando alguien reordena o borra
 * filas a mano en la hoja.
 */
function mapaCols_(h) {
  var ancho = Math.max(1, h.getLastColumn())
  var enc = h.getRange(1, 1, 1, ancho).getValues()[0]
  var map = {}
  for (var i = 0; i < enc.length; i++) {
    var nombre = String(enc[i]).trim()
    if (nombre) map[nombre] = i
  }
  COLS_AUTOMATICAS.forEach(function(col) {
    if (map[col] !== undefined) return
    h.getRange(1, ancho + 1).setValue(col).setFontWeight('bold')
    map[col] = ancho
    ancho++
  })
  return map
}

/** Todas las filas como objetos {campo: valor}. */
function h_listar() {
  var h = hoja_()
  var map = mapaCols_(h)
  var ultima = h.getLastRow()
  if (ultima < 2) return { ok: true, filas: [] }

  var datos = h.getRange(2, 1, ultima - 1, h.getLastColumn()).getValues()
  var filas = []
  var pendientes = []   // filas viejas sin ID: se les asigna uno

  for (var i = 0; i < datos.length; i++) {
    var fila = datos[i]
    // Salta filas totalmente vacías.
    if (fila.join('').trim() === '') continue

    var id = String(fila[map[COLS.id]] || '').trim()
    if (!id) {
      id = nuevoId_()
      pendientes.push({ fila: i + 2, id: id })
    }
    filas.push(objetoDeFila_(fila, map, id))
  }

  pendientes.forEach(function(p) {
    h.getRange(p.fila, map[COLS.id] + 1).setValue(p.id)
  })

  return { ok: true, filas: filas }
}

function objetoDeFila_(fila, map, id) {
  function v(col) {
    var i = map[col]
    return i === undefined ? '' : fila[i]
  }
  return {
    id: id,
    referente:     String(v(COLS.referente) || ''),
    views:         Number(v(COLS.views)) || 0,
    likes:         Number(v(COLS.likes)) || 0,
    comentarios:   Number(v(COLS.comentarios)) || 0,
    hashtag:       String(v(COLS.hashtag) || ''),
    numPost:       String(v(COLS.numPost) || ''),
    fecha:         aIso_(v(COLS.fecha)),
    pais:          String(v(COLS.pais) || ''),
    plataforma:    String(v(COLS.plataforma) || ''),
    tema:          String(v(COLS.tema) || ''),
    transcripcion: String(v(COLS.transcripcion) || ''),
    traduccion:    String(v(COLS.traduccion) || ''),
    guion:         String(v(COLS.guion) || ''),
    caption:       String(v(COLS.caption) || ''),
    carrusel:      String(v(COLS.carrusel) || ''),
    video10s:      String(v(COLS.video10s) || ''),
    pieza:         String(v(COLS.pieza) || ''),
    estado:        String(v(COLS.estado) || ''),
    captionOriginal: String(v(COLS.captionOriginal) || '')
  }
}

function aIso_(v) {
  if (!v) return ''
  if (Object.prototype.toString.call(v) === '[object Date]') return v.toISOString()
  return String(v)
}

function nuevoId_() {
  return 'ref_' + Utilities.getUuid().replace(/-/g, '').slice(0, 16)
}

/** Número de fila (base 1) de un ID, o 0 si no existe. */
function filaDeId_(h, map, id) {
  var ultima = h.getLastRow()
  if (ultima < 2) return 0
  var col = h.getRange(2, map[COLS.id] + 1, ultima - 1, 1).getValues()
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]).trim() === String(id)) return i + 2
  }
  return 0
}

// ============================================================
// ANALIZAR UN ENLACE  (Apify → IA → fila nueva)
// ============================================================

function h_analizar(d) {
  var url = String(d.url || '').trim()
  if (!url) return { ok: false, error: 'Pega el enlace del post del referente.' }

  var plataforma = detectarPlataforma_(url)
  if (!plataforma) {
    return { ok: false, error: 'No reconozco ese enlace. Debe ser de Instagram, TikTok o YouTube.' }
  }

  var scrape = scrapeApify_(url, plataforma)
  if (!scrape.ok) return scrape

  // Sin subtítulos (Instagram casi siempre): se transcribe el audio del video.
  var avisoTranscripcion = ''
  if (!scrape.datos.transcripcion) {
    var tr = transcribirAudio_(scrape.datos.videoUrl)
    if (tr.ok) scrape.datos.transcripcion = tr.texto
    else {
      avisoTranscripcion = 'Sin transcripción: ' + tr.error
      console.log(avisoTranscripcion + ' · ' + url)
    }
  }

  var ia = generarConIA_(scrape.datos)
  if (!ia.ok) {
    // El scraping sí sirvió: guardo la fila igual para no perder el trabajo
    // (y el usuario puede reintentar solo la parte de IA con "Regenerar").
    var guardadaSinIA = escribirFila_(scrape.datos, {}, null)
    return { ok: false, error: 'Se guardaron los datos del referente, pero la IA falló: ' + ia.error,
             parcial: true, fila: guardadaSinIA, avisoTranscripcion: avisoTranscripcion }
  }

  return { ok: true, fila: escribirFila_(scrape.datos, ia.datos, null), avisoTranscripcion: avisoTranscripcion }
}

/** Vuelve a correr solo la IA sobre una fila ya scrapeada. */
function h_regenerar(d) {
  var h = hoja_()
  var map = mapaCols_(h)
  var fila = filaDeId_(h, map, d.id)
  if (!fila) return { ok: false, error: 'No encontré esa fila.' }

  var valores = h.getRange(fila, 1, 1, h.getLastColumn()).getValues()[0]
  var actual = objetoDeFila_(valores, map, d.id)

  // Se parte del caption ORIGINAL del referente. Las filas creadas antes de
  // que existiera esa columna no lo tienen: ahí se usa el que haya.
  var ia = generarConIA_({
    referente: actual.referente,
    plataforma: actual.plataforma,
    caption: actual.captionOriginal || actual.caption,
    hashtag: actual.hashtag,
    transcripcion: actual.transcripcion
  })
  if (!ia.ok) return ia

  escribirCampos_(h, map, fila, {
    tema: ia.datos.tema, traduccion: ia.datos.traduccion, guion: ia.datos.guion,
    caption: ia.datos.caption, carrusel: ia.datos.carrusel, video10s: ia.datos.video10s
  })
  return { ok: true, fila: objetoDeFila_(h.getRange(fila, 1, 1, h.getLastColumn()).getValues()[0], map, d.id) }
}

/** Crea la fila con lo scrapeado + lo generado. */
function escribirFila_(s, ia, _) {
  var h = hoja_()
  var map = mapaCols_(h)
  var id = nuevoId_()
  var destino = h.getLastRow() + 1

  escribirCampos_(h, map, destino, {
    referente: s.referente, views: s.views, likes: s.likes, comentarios: s.comentarios,
    hashtag: s.hashtag, numPost: s.numPost, fecha: s.fecha, pais: s.pais,
    plataforma: s.plataforma, transcripcion: s.transcripcion, pieza: s.pieza,
    captionOriginal: s.caption || '',
    tema: ia.tema || '', traduccion: ia.traduccion || '', guion: ia.guion || '',
    caption: ia.caption || '', carrusel: ia.carrusel || '', video10s: ia.video10s || '',
    estado: 'Pendiente', id: id
  })

  var valores = h.getRange(destino, 1, 1, h.getLastColumn()).getValues()[0]
  return objetoDeFila_(valores, map, id)
}

/**
 * Escribe solo las celdas indicadas, sin tocar el resto de la fila.
 * Lee la fila entera, la modifica en memoria y la escribe de una sola vez:
 * una llamada a la hoja en vez de una por campo. Con 19 columnas la diferencia
 * es de varios segundos, y esta es la parte más lenta de toda la app.
 */
function escribirCampos_(h, map, fila, campos) {
  var ancho = h.getLastColumn()
  var rango = h.getRange(fila, 1, 1, ancho)
  // Una fila nueva (más allá del final) no tiene nada que leer.
  var valores = fila <= h.getLastRow() ? rango.getValues()[0] : new Array(ancho).fill('')

  var hayCambios = false
  Object.keys(campos).forEach(function(clave) {
    var nombreCol = COLS[clave]
    if (!nombreCol) return
    var i = map[nombreCol]
    if (i === undefined || i >= ancho) return
    var valor = campos[clave]
    if (valor === undefined || valor === null) return
    valores[i] = valor
    hayCambios = true
  })

  if (hayCambios) rango.setValues([valores])
}

function h_guardar(d) {
  var h = hoja_()
  var map = mapaCols_(h)
  var fila = filaDeId_(h, map, d.id)
  if (!fila) return { ok: false, error: 'No encontré esa fila.' }
  escribirCampos_(h, map, fila, d.campos || {})
  var valores = h.getRange(fila, 1, 1, h.getLastColumn()).getValues()[0]
  return { ok: true, fila: objetoDeFila_(valores, map, d.id) }
}

function h_eliminar(d) {
  var h = hoja_()
  var map = mapaCols_(h)
  var fila = filaDeId_(h, map, d.id)
  if (!fila) return { ok: false, error: 'No encontré esa fila.' }
  h.deleteRow(fila)
  return { ok: true }
}

// ============================================================
// MIS CUENTAS Y SUS SEGUIDORES
// ============================================================
//
// Viven en dos pestañas aparte de la de referentes:
//   Cuentas_RS   → las cuentas propias que se vigilan
//   Metricas_RS  → una fila por medición, para poder mostrar la variación
//
// Las dos se crean solas la primera vez que se usan.

var COLS_CUENTAS  = ['ID', 'Red', 'Handle', 'Nombre', 'Activo', 'Fecha creación']
var COLS_METRICAS = ['ID', 'Cuenta ID', 'Red', 'Handle', 'Seguidores', 'Fecha']

/** Devuelve una pestaña por nombre, creándola con sus encabezados si no existe. */
function pestaña_(nombre, encabezados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var h = ss.getSheetByName(nombre)
  if (!h) {
    h = ss.insertSheet(nombre)
    h.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight('bold')
    h.setFrozenRows(1)
    return h
  }
  if (h.getLastRow() === 0) {
    h.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight('bold')
    h.setFrozenRows(1)
  }
  return h
}

/** Todas las filas de una pestaña como objetos, usando las claves dadas. */
function leerPestaña_(nombre, encabezados, claves) {
  var h = pestaña_(nombre, encabezados)
  var ultima = h.getLastRow()
  if (ultima < 2) return []
  var datos = h.getRange(2, 1, ultima - 1, encabezados.length).getValues()
  var out = []
  datos.forEach(function(fila) {
    if (fila.join('').trim() === '') return
    var o = {}
    claves.forEach(function(clave, i) { o[clave] = fila[i] })
    out.push(o)
  })
  return out
}

var CLAVES_CUENTAS  = ['id', 'red', 'handle', 'nombre', 'activo', 'fecha_creacion']
var CLAVES_METRICAS = ['id', 'cuenta_id', 'red', 'handle', 'seguidores', 'fecha']

function h_listarCuentas() {
  var cuentas = leerPestaña_('Cuentas_RS', COLS_CUENTAS, CLAVES_CUENTAS).map(function(c) {
    c.id = String(c.id)
    c.activo = String(c.activo).toUpperCase() !== 'FALSE'
    c.fecha_creacion = aIso_(c.fecha_creacion)
    return c
  })
  return { ok: true, cuentas: cuentas }
}

function h_addCuenta(d) {
  var handle = String(d.handle || '').trim()
  if (!handle) return { ok: false, error: 'Escribe el @usuario de la cuenta.' }
  var h = pestaña_('Cuentas_RS', COLS_CUENTAS)
  var id = 'cta_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12)
  h.appendRow([id, String(d.red || 'instagram'), handle, String(d.nombre || ''), 'TRUE', new Date()])
  return h_listarCuentas()
}

function h_updateCuenta(d) {
  var h = pestaña_('Cuentas_RS', COLS_CUENTAS)
  var fila = buscarFilaPorId_(h, d.id)
  if (!fila) return { ok: false, error: 'No encontré esa cuenta.' }
  var valores = h.getRange(fila, 1, 1, COLS_CUENTAS.length).getValues()[0]
  if (d.red !== undefined)    valores[1] = String(d.red)
  if (d.handle !== undefined) valores[2] = String(d.handle)
  if (d.nombre !== undefined) valores[3] = String(d.nombre)
  if (d.activo !== undefined) valores[4] = d.activo ? 'TRUE' : 'FALSE'
  h.getRange(fila, 1, 1, COLS_CUENTAS.length).setValues([valores])
  return h_listarCuentas()
}

function h_deleteCuenta(d) {
  var h = pestaña_('Cuentas_RS', COLS_CUENTAS)
  var fila = buscarFilaPorId_(h, d.id)
  if (!fila) return { ok: false, error: 'No encontré esa cuenta.' }
  h.deleteRow(fila)

  // Sus mediciones dejan de tener sentido: se borran también.
  var m = pestaña_('Metricas_RS', COLS_METRICAS)
  var ultima = m.getLastRow()
  if (ultima >= 2) {
    var col = m.getRange(2, 2, ultima - 1, 1).getValues()   // columna "Cuenta ID"
    for (var i = col.length - 1; i >= 0; i--) {             // de abajo hacia arriba
      if (String(col[i][0]) === String(d.id)) m.deleteRow(i + 2)
    }
  }
  return h_listarCuentas()
}

/** Número de fila de un ID en la columna A, o 0. */
function buscarFilaPorId_(h, id) {
  var ultima = h.getLastRow()
  if (ultima < 2) return 0
  var col = h.getRange(2, 1, ultima - 1, 1).getValues()
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]).trim() === String(id)) return i + 2
  }
  return 0
}

function h_listarMetricas() {
  var metricas = leerPestaña_('Metricas_RS', COLS_METRICAS, CLAVES_METRICAS).map(function(m) {
    m.cuenta_id = String(m.cuenta_id)
    m.seguidores = Number(m.seguidores) || 0
    m.fecha = aIso_(m.fecha)
    return m
  })
  return { ok: true, metricas: metricas }
}

// Actores que leen el PERFIL (seguidores). Son distintos a los que leen un
// post suelto: aquí interesa la cuenta completa, no una publicación.
// Se sobreescriben igual que los otros, con ACTOR_PERFIL_INSTAGRAM, etc.
var ACTORES_PERFIL_DEFAULT = {
  instagram: 'apify~instagram-profile-scraper',
  tiktok:    'clockworks~tiktok-scraper',
  youtube:   'streamers~youtube-scraper'
}

/**
 * Consulta los seguidores de cada cuenta activa y agrega una medición nueva.
 * No pisa la anterior: el histórico es lo que permite mostrar la variación.
 */
function h_scrapeSeguidores(d) {
  var token = PROPS.getProperty('APIFY_TOKEN')
  if (!token) return { ok: false, error: 'Falta el token de Apify. Ponlo en Ajustes → Llaves.' }

  var cuentas = h_listarCuentas().cuentas.filter(function(c) {
    if (!c.activo) return false
    return d && d.cuentaId ? String(c.id) === String(d.cuentaId) : true
  })
  if (!cuentas.length) return { ok: false, error: 'No tienes cuentas activas. Agrégalas en Ajustes → Mis cuentas.' }

  var m = pestaña_('Metricas_RS', COLS_METRICAS)
  var actualizadas = [], errores = []

  cuentas.forEach(function(c) {
    try {
      var seguidores = seguidoresDe_(c, token)
      m.appendRow(['met_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12),
        c.id, c.red, c.handle, seguidores, new Date()])
      actualizadas.push({ handle: c.handle, seguidores: seguidores })
    } catch (err) {
      errores.push(c.handle + ': ' + (err.message || err))
    }
  })

  return { ok: true, actualizadas: actualizadas, errores: errores, metricas: h_listarMetricas().metricas }
}

function seguidoresDe_(c, token) {
  var actor = PROPS.getProperty('ACTOR_PERFIL_' + String(c.red).toUpperCase()) ||
              ACTORES_PERFIL_DEFAULT[c.red]
  if (!actor) throw new Error('sin actor para ' + c.red)

  var handle = String(c.handle || '').replace(/^@/, '')
  var input
  if (c.red === 'instagram') {
    input = { usernames: [handle] }
  } else if (c.red === 'tiktok') {
    input = { profiles: [handle], resultsPerPage: 1, shouldDownloadVideos: false, shouldDownloadCovers: false }
  } else {
    var url = handle.indexOf('http') === 0 ? handle : 'https://www.youtube.com/@' + handle
    input = { startUrls: [{ url: url }], maxResults: 1, maxResultStreams: 0, maxResultsShorts: 0 }
  }

  var res = UrlFetchApp.fetch(
    'https://api.apify.com/v2/acts/' + actor + '/run-sync-get-dataset-items?token=' + encodeURIComponent(token),
    { method: 'post', contentType: 'application/json', payload: JSON.stringify(input), muteHttpExceptions: true })

  if (res.getResponseCode() >= 400) throw new Error('Apify ' + res.getResponseCode())

  var arr = JSON.parse(res.getContentText())
  var item = Array.isArray(arr) ? arr[0] : arr
  if (!item) throw new Error('sin datos')

  // Cada actor nombra los seguidores distinto: se prueba en orden.
  var n = primero_(item, ['followersCount', 'followers', 'fans', 'numberOfSubscribers',
    'subscriberCount', 'subscribers', 'followerCount', 'authorMeta.fans'])
  if (n === '' || isNaN(Number(n))) throw new Error('sin dato de seguidores')
  return Number(n)
}

// ============================================================
// APIFY
// ============================================================

function detectarPlataforma_(url) {
  var u = url.toLowerCase()
  if (u.indexOf('instagram.com') >= 0) return 'instagram'
  if (u.indexOf('tiktok.com') >= 0) return 'tiktok'
  if (u.indexOf('youtube.com') >= 0 || u.indexOf('youtu.be') >= 0) return 'youtube'
  return ''
}

function scrapeApify_(url, plataforma) {
  var token = PROPS.getProperty('APIFY_TOKEN')
  if (!token) return { ok: false, error: 'Falta el token de Apify. Ponlo en Ajustes → Apify.' }

  var actor = PROPS.getProperty('ACTOR_' + plataforma.toUpperCase()) || ACTORES_DEFAULT[plataforma]
  var input = inputApify_(url, plataforma)

  var endpoint = 'https://api.apify.com/v2/acts/' + actor +
    '/run-sync-get-dataset-items?token=' + encodeURIComponent(token)

  var res
  try {
    res = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(input),
      muteHttpExceptions: true
    })
  } catch (err) {
    return { ok: false, error: 'No se pudo conectar con Apify: ' + (err.message || err) }
  }

  if (res.getResponseCode() >= 400) {
    return { ok: false, error: 'Apify respondió ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300) }
  }

  var arr
  try { arr = JSON.parse(res.getContentText()) } catch (err) { arr = [] }
  var item = Array.isArray(arr) ? arr[0] : arr
  if (!item) return { ok: false, error: 'Apify no devolvió datos de ese post. Revisa que el enlace sea público.' }

  return { ok: true, datos: normalizar_(item, plataforma, url, token) }
}

/**
 * Los archivos que Apify guarda (subtítulos, videos) viven en
 * api.apify.com. Si la cuenta tiene el acceso a sus datos restringido, la
 * descarga sin token responde 401/403 y la transcripción queda vacía sin
 * avisar. Con el token funciona en los dos casos.
 */
function conTokenApify_(enlace, token) {
  var u = String(enlace || '')
  if (!token || u.indexOf('api.apify.com') < 0 || /[?&]token=/.test(u)) return u
  return u + (u.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(token)
}

function inputApify_(url, plataforma) {
  if (plataforma === 'instagram') {
    return { directUrls: [url], resultsType: 'posts', resultsLimit: 1, addParentData: false }
  }
  if (plataforma === 'tiktok') {
    // El video solo se descarga si hay llave de OpenAI: es lo que permite
    // transcribir el audio cuando TikTok no trae subtítulos.
    return { postURLs: [url], resultsPerPage: 1,
             shouldDownloadVideos: !!PROPS.getProperty('OPENAI_KEY'),
             shouldDownloadCovers: false, shouldDownloadSubtitles: true }
  }
  return { startUrls: [{ url: url }], maxResults: 1, downloadSubtitles: true,
           subtitlesLanguage: 'any', saveSubsToKVS: false }
}

/**
 * Cada actor de Apify nombra los campos distinto y además cambia con las
 * versiones. Por eso se prueban varios nombres posibles para cada dato y se
 * usa el primero que aparezca, en vez de confiar en una sola forma.
 */
function normalizar_(it, plataforma, url, token) {
  return {
    // No va a la hoja: solo se usa para transcribir el audio si hace falta.
    videoUrl:      conTokenApify_(primero_(it, ['videoUrl', 'mediaUrls.0', 'videoMeta.downloadAddr', 'downloadAddr']), token),
    referente:     primero_(it, ['ownerUsername', 'authorMeta.name', 'authorMeta.nickName', 'channelName', 'ownerFullName', 'author', 'channelUsername']),
    views:         num_(primero_(it, ['videoPlayCount', 'playCount', 'viewCount', 'views', 'videoViewCount'])),
    likes:         num_(primero_(it, ['likesCount', 'diggCount', 'likes', 'likeCount'])),
    comentarios:   num_(primero_(it, ['commentsCount', 'commentCount', 'comments'])),
    hashtag:       hashtags_(it),
    numPost:       String(primero_(it, ['shortCode', 'id', 'videoId', 'postId']) || ''),
    fecha:         fecha_(primero_(it, ['timestamp', 'createTimeISO', 'date', 'uploadDate', 'createTime'])),
    pais:          String(primero_(it, ['locationName', 'country', 'authorMeta.region']) || ''),
    plataforma:    etiquetaPlataforma_(plataforma),
    transcripcion: transcripcion_(it, token),
    pieza:         String(primero_(it, ['url', 'webVideoUrl', 'postPage']) || url),
    caption:       String(primero_(it, ['caption', 'text', 'description', 'title']) || '')
  }
}

/** Lee la primera ruta que exista y no esté vacía. Soporta 'a.b'. */
function primero_(obj, rutas) {
  for (var i = 0; i < rutas.length; i++) {
    var partes = rutas[i].split('.')
    var v = obj
    for (var j = 0; j < partes.length && v != null; j++) v = v[partes[j]]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return ''
}

function num_(v) {
  var n = Number(v)
  return isNaN(n) ? 0 : n
}

function hashtags_(it) {
  var h = it.hashtags
  if (Array.isArray(h) && h.length) {
    return h.map(function(x) {
      var t = (typeof x === 'string') ? x : (x && (x.name || x.text) || '')
      return t ? (t.charAt(0) === '#' ? t : '#' + t) : ''
    }).filter(String).join(' ')
  }
  // Si el actor no los separa, se sacan del texto del post.
  var texto = String(primero_(it, ['caption', 'text', 'description', 'title']) || '')
  var m = texto.match(/#[\wÀ-ÿ]+/g)
  return m ? m.join(' ') : ''
}

function fecha_(v) {
  if (!v) return ''
  if (typeof v === 'number') {
    // Los actores mandan segundos o milisegundos según el caso.
    var ms = v < 1e12 ? v * 1000 : v
    return new Date(ms).toISOString()
  }
  var d = new Date(v)
  return isNaN(d) ? String(v) : d.toISOString()
}

function etiquetaPlataforma_(p) {
  return { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube' }[p] || p
}

/**
 * La transcripción es la parte menos confiable del scraping: YouTube casi
 * siempre trae subtítulos, TikTok a veces, Instagram casi nunca. Cuando no
 * viene, h_analizar intenta transcribir el audio (transcribirAudio_).
 */
function transcripcion_(it, token) {
  // 1) Algunos actores ya la mandan como texto listo.
  var directo = primero_(it, ['transcript', 'text_transcript', 'videoTranscript'])
  if (typeof directo === 'string' && directo.trim()) return limpiarSubs_(directo)

  // 2) TikTok (clockworks) la deja en videoMeta.subtitleLinks: una lista de
  //    enlaces por idioma que hay que descargar aparte. YouTube usa formas
  //    parecidas. Se recogen todas las listas posibles y se prueba la primera
  //    que sirva, prefiriendo el audio original y luego español e inglés.
  var listas = [it.videoMeta && it.videoMeta.subtitleLinks, it.subtitleLinks, it.subtitles, it.captions]
  for (var i = 0; i < listas.length; i++) {
    var texto = deListaSubs_(listas[i], token)
    if (texto) return texto
  }

  // 3) Algunos actores de TikTok dejan un enlace aparte con la transcripción.
  var enlace = primero_(it, ['videoMeta.transcriptionLink', 'transcriptionLink'])
  if (enlace) return descargarTexto_(enlace, token)
  return ''
}

/** Saca el texto de una lista de subtítulos, en el idioma más conveniente. */
function deListaSubs_(lista, token) {
  if (typeof lista === 'string' && lista.trim()) return limpiarSubs_(lista)
  if (!Array.isArray(lista) || !lista.length) return ''

  var ordenada = lista.slice().sort(function(a, b) {
    return puntajeIdioma_(b) - puntajeIdioma_(a)
  })

  for (var i = 0; i < ordenada.length; i++) {
    var s = ordenada[i]
    if (typeof s === 'string') { var t = limpiarSubs_(s); if (t) return t }
    if (!s || typeof s !== 'object') continue

    if (s.text) { var t2 = limpiarSubs_(String(s.text)); if (t2) return t2 }
    if (s.srt)  { var t3 = limpiarSubs_(String(s.srt));  if (t3) return t3 }

    var enlace = s.downloadLink || s.srtUrl || s.url || s.link
    var t4 = enlace ? descargarTexto_(enlace, token) : ''
    if (t4) return t4
  }
  return ''
}

/** Descarga un archivo de subtítulos y lo deja en texto corrido, o ''. */
function descargarTexto_(enlace, token) {
  try {
    var r = UrlFetchApp.fetch(conTokenApify_(enlace, token), { muteHttpExceptions: true })
    if (r.getResponseCode() < 400) return limpiarSubs_(r.getContentText())
    console.log('Subtítulos: la descarga respondió ' + r.getResponseCode())
  } catch (err) {
    console.log('Subtítulos: no se pudieron descargar: ' + (err.message || err))
  }
  return ''
}

/**
 * Orden de preferencia de los subtítulos. TikTok marca el audio original
 * como source "ASR" y las traducciones automáticas como "MT", y nombra los
 * idiomas con tres letras ("spa-ES", "eng-US"); YouTube usa dos ("es", "en").
 * Se prefiere el original, porque la traducción la hace después la IA.
 */
function puntajeIdioma_(s) {
  if (!s || typeof s !== 'object') return 0
  var puntos = String(s.source || '').toUpperCase() === 'ASR' ? 10 : 0
  var base = String(s.language || s.lang || s.languageCode || '').toLowerCase().split(/[-_]/)[0]
  if (base === 'es' || base === 'spa') puntos += 2
  else if (base === 'en' || base === 'eng') puntos += 1
  return puntos
}

// ============================================================
// TRANSCRIPCIÓN DEL AUDIO (OpenAI)
// ============================================================
//
// Instagram no expone subtítulos, así que la única forma de tener su
// transcripción es escuchar el video. Se usa la API de OpenAI porque la de
// Claude no recibe audio. Solo corre si hay llave de OpenAI en Ajustes.

var MODELO_TRANSCRIPCION_DEFAULT = 'whisper-1'
var LIMITE_AUDIO_MB = 25   // tope de OpenAI por archivo

function transcribirAudio_(videoUrl) {
  var key = PROPS.getProperty('OPENAI_KEY')
  if (!key) return { ok: false, error: 'el post no trae subtítulos. Pon la llave de OpenAI en Ajustes para transcribir el audio.' }
  if (!videoUrl) return { ok: false, error: 'Apify no devolvió el archivo del video.' }

  var video
  try {
    video = UrlFetchApp.fetch(String(videoUrl), { muteHttpExceptions: true, followRedirects: true })
  } catch (err) {
    return { ok: false, error: 'no se pudo descargar el video: ' + (err.message || err) }
  }
  if (video.getResponseCode() >= 400) {
    return { ok: false, error: 'la descarga del video respondió ' + video.getResponseCode() + '.' }
  }

  var blob = video.getBlob()
  var mb = blob.getBytes().length / (1024 * 1024)
  if (mb > LIMITE_AUDIO_MB) {
    return { ok: false, error: 'el video pesa ' + mb.toFixed(1) + ' MB y OpenAI acepta hasta ' + LIMITE_AUDIO_MB + ' MB.' }
  }
  // OpenAI reconoce el formato por la extensión del nombre.
  blob.setName('video.mp4')

  var res
  try {
    res = UrlFetchApp.fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'post',
      headers: { Authorization: 'Bearer ' + key },
      payload: {
        file: blob,
        model: PROPS.getProperty('TRANSCRIPCION_MODELO') || MODELO_TRANSCRIPCION_DEFAULT
      },
      muteHttpExceptions: true
    })
  } catch (err) {
    return { ok: false, error: 'no se pudo conectar con OpenAI: ' + (err.message || err) }
  }
  if (res.getResponseCode() >= 400) {
    return { ok: false, error: 'OpenAI respondió ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200) }
  }

  var texto = ''
  try { texto = String(JSON.parse(res.getContentText()).text || '').trim() } catch (err) { texto = '' }
  if (!texto) return { ok: false, error: 'el video no tiene voz que transcribir.' }
  return { ok: true, texto: texto }
}

/** Quita numeración y marcas de tiempo de un SRT/VTT y deja el texto corrido. */
function limpiarSubs_(txt) {
  return String(txt)
    .replace(/^WEBVTT.*$/gm, '')
    .replace(/^\d+$/gm, '')
    .replace(/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->.*$/gm, '')
    .replace(/<[^>]+>/g, '')
    .split('\n').map(function(l) { return l.trim() }).filter(String)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ============================================================
// IA
// ============================================================

function generarConIA_(s) {
  var cfg = leerConfigIA_()
  var base = String(s.transcripcion || '').trim() || String(s.caption || '').trim()
  if (!base) {
    return { ok: false, error: 'El post no trajo ni transcripción ni texto: no hay de dónde generar.' }
  }

  var voz = vozMarcaTexto_(cfg.vozMarca)
  var instrucciones = [
    cfg.promptCentral,
    voz ? '\n\n### ASÍ ESCRIBE ESTA MARCA (imita el estilo, nunca copies los datos)\n' + voz : '',
    // El formato de salida es fijo: es lo que permite guardar cada pieza en su
    // columna. El CÓMO de cada una lo manda el prompt central de arriba.
    '\n\n### QUÉ DEBES DEVOLVER',
    'Responde ÚNICAMENTE con un objeto JSON válido, sin explicaciones ni ```.',
    'Estas son las seis claves, en este orden:',
    '{',
    '  "tema": "el tema del post en 3 a 6 palabras",',
    '  "traduccion": "el texto original traducido al español; si ya está en español, deja el mismo texto pulido",',
    '  "guion": "el guion para grabar",',
    '  "caption": "el caption para publicar",',
    '  "carrusel": "los copys del carrusel",',
    '  "video10s": "el texto en pantalla del video corto"',
    '}',
    'Respeta las indicaciones de longitud, tono y formato que están arriba.'
  ].join('\n')

  var entrada = [
    '### POST DEL REFERENTE',
    'Creador: ' + (s.referente || 'desconocido'),
    'Plataforma: ' + (s.plataforma || '—'),
    'Hashtags: ' + (s.hashtag || '—'),
    '',
    'Texto / caption original:',
    String(s.caption || '(sin caption)'),
    '',
    'Transcripción del video:',
    String(s.transcripcion || '(sin transcripción)')
  ].join('\n')

  var texto = cfg.proveedor === 'openai'
    ? llamarOpenAI_(instrucciones, entrada, cfg)
    : llamarClaude_(instrucciones, entrada, cfg)

  if (!texto.ok) return texto

  var datos = parsearJson_(texto.contenido)
  if (!datos) return { ok: false, error: 'La IA no devolvió un JSON válido. Reintenta o ajusta el prompt central.' }

  return {
    ok: true,
    datos: {
      tema:       String(datos.tema || ''),
      traduccion: String(datos.traduccion || ''),
      guion:      String(datos.guion || ''),
      caption:    String(datos.caption || ''),
      carrusel:   aTexto_(datos.carrusel),
      video10s:   aTexto_(datos.video10s)
    }
  }
}

/**
 * La voz de marca se guarda como una lista de ejemplos [{nombre, texto}] que
 * el dueño sube desde Ajustes. Aquí se convierte en texto plano para meterla
 * en el prompt. Si alguien la guardó como texto suelto, se usa tal cual.
 */
function vozMarcaTexto_(v) {
  var s = String(v || '').trim()
  if (!s) return ''
  var arr
  try { arr = JSON.parse(s) } catch (err) { return s }
  if (!Array.isArray(arr)) return s
  return arr.map(function(e) {
    return '— ' + (e.nombre || 'Ejemplo') + ' —\n' + (e.texto || '')
  }).join('\n\n')
}

/** El carrusel puede venir como lista de láminas: se aplana a texto. */
function aTexto_(v) {
  if (Array.isArray(v)) {
    return v.map(function(x, i) {
      if (x && typeof x === 'object') return (i + 1) + '. ' + (x.texto || x.text || JSON.stringify(x))
      return (i + 1) + '. ' + String(x)
    }).join('\n')
  }
  if (v && typeof v === 'object') return JSON.stringify(v)
  return String(v || '')
}

/** Rescata el JSON aunque la IA lo envuelva en ``` o le ponga texto alrededor. */
function parsearJson_(txt) {
  var s = String(txt || '').trim()
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try { return JSON.parse(s) } catch (err) { /* sigue abajo */ }
  var ini = s.indexOf('{'), fin = s.lastIndexOf('}')
  if (ini >= 0 && fin > ini) {
    try { return JSON.parse(s.slice(ini, fin + 1)) } catch (err) { return null }
  }
  return null
}

// claude-sonnet-4-5 se retira el 30 de noviembre de 2026; este es su sucesor.
var MODELO_CLAUDE_DEFAULT = 'claude-sonnet-5-5'

// Modelos que aceptan el reintento automático en otro modelo cuando el
// filtro de seguridad rechaza una petición (parámetro "fallbacks").
var MODELOS_CON_FALLBACK = ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1']

function llamarClaude_(sistema, entrada, cfg) {
  var key = PROPS.getProperty('ANTHROPIC_KEY')
  if (!key) return { ok: false, error: 'Falta la API key de Claude. Ponla en Ajustes → IA.' }

  var modelo = cfg.modelo || MODELO_CLAUDE_DEFAULT
  var headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01' }
  var cuerpo = {
    model: modelo,
    // Los modelos 5.x piensan antes de responder y ese razonamiento cuenta
    // dentro de max_tokens: con 4000 el JSON podía quedar cortado.
    max_tokens: 16000,
    system: sistema,
    messages: [{ role: 'user', content: entrada }]
  }
  // "medium" equilibra calidad y tiempo: Apps Script corta a los 6 minutos y
  // en ese tiempo también caben Apify y la transcripción.
  if (/^claude-(opus|sonnet|haiku|fable)-5/.test(modelo)) {
    cuerpo.output_config = { effort: 'medium' }
  }
  if (MODELOS_CON_FALLBACK.indexOf(modelo) >= 0) {
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01'
    cuerpo.fallbacks = 'default'
  }

  var res
  try {
    res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      headers: headers,
      payload: JSON.stringify(cuerpo),
      muteHttpExceptions: true
    })
  } catch (err) {
    return { ok: false, error: 'No se pudo conectar con Claude: ' + (err.message || err) }
  }

  if (res.getResponseCode() >= 400) {
    return { ok: false, error: 'Claude respondió ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300) }
  }
  var body = JSON.parse(res.getContentText())

  if (body.stop_reason === 'refusal') {
    var cat = body.stop_details && body.stop_details.category
    return { ok: false, error: 'Claude no quiso generar este contenido' + (cat ? ' (' + cat + ')' : '') +
      '. Revisa el texto del referente o el prompt central.' }
  }

  // La respuesta puede empezar con bloques de razonamiento ("thinking"):
  // se toma solo el texto.
  var texto = (body.content || []).filter(function(b) { return b && b.type === 'text' })
    .map(function(b) { return b.text || '' }).join('')
  if (!texto) return { ok: false, error: 'Claude devolvió una respuesta vacía.' }
  return { ok: true, contenido: texto }
}

function llamarOpenAI_(sistema, entrada, cfg) {
  var key = PROPS.getProperty('OPENAI_KEY')
  if (!key) return { ok: false, error: 'Falta la API key de OpenAI. Ponla en Ajustes → IA.' }

  var res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + key },
    payload: JSON.stringify({
      model: cfg.modelo || 'gpt-4o',
      messages: [{ role: 'system', content: sistema }, { role: 'user', content: entrada }],
      response_format: { type: 'json_object' }
    }),
    muteHttpExceptions: true
  })

  if (res.getResponseCode() >= 400) {
    return { ok: false, error: 'OpenAI respondió ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300) }
  }
  var body = JSON.parse(res.getContentText())
  var texto = (body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content) || ''
  if (!texto) return { ok: false, error: 'OpenAI devolvió una respuesta vacía.' }
  return { ok: true, contenido: texto }
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

// Este es el ÚNICO prompt que el usuario edita. Trae ya las indicaciones de
// cada pieza: si quiere carruseles de 5 láminas en vez de 7, o captions sin
// emojis, lo escribe aquí y no hay que tocar nada más.
var PROMPT_CENTRAL_DEFAULT = [
  'Eres estratega de contenido para redes sociales.',
  'Tu trabajo es tomar un post que le funcionó a otro creador y producir la versión',
  'de esta marca: misma estructura ganadora, voz y ejemplos propios.',
  '',
  'REGLAS GENERALES:',
  '- Escribe en español neutro, hablando de tú.',
  '- No inventes cifras, estudios ni casos.',
  '- No copies frases textuales del referente: toma la fórmula, no las palabras.',
  '- El gancho es una sola frase que detiene el scroll.',
  '',
  'CÓMO QUIERO CADA PIEZA:',
  '- Copy / Guion: el guion hablado completo para grabar, en párrafos cortos',
  '  separados por línea en blanco, empezando por el gancho.',
  '- Caption: listo para publicar, directo, con emojis moderados y un llamado',
  '  a la acción al final.',
  '- Carrusel: una lámina por línea, numeradas del 1 al 7.',
  '- Videos 10s: el texto que va en pantalla, máximo 3 frases muy cortas.'
].join('\n')

function leerConfigIA_() {
  return {
    proveedor:     PROPS.getProperty('IA_PROVEEDOR') || 'claude',
    modelo:        PROPS.getProperty('IA_MODELO') || '',
    promptCentral: PROPS.getProperty('PROMPT_CENTRAL') || PROMPT_CENTRAL_DEFAULT,
    vozMarca:      PROPS.getProperty('VOZ_MARCA') || ''
  }
}

/**
 * Devuelve la configuración SIN las llaves: solo un indicador de si están
 * puestas. Las llaves nunca salen del servidor.
 */
function h_getConfig() {
  var cfg = leerConfigIA_()
  return {
    ok: true,
    proveedor: cfg.proveedor,
    modelo: cfg.modelo,
    promptCentral: cfg.promptCentral,
    vozMarca: cfg.vozMarca,
    apifyPuesta:  !!PROPS.getProperty('APIFY_TOKEN'),
    claudePuesta: !!PROPS.getProperty('ANTHROPIC_KEY'),
    openaiPuesta: !!PROPS.getProperty('OPENAI_KEY')
  }
}

function h_saveConfig(d) {
  var textos = {
    proveedor: 'IA_PROVEEDOR', modelo: 'IA_MODELO',
    promptCentral: 'PROMPT_CENTRAL', vozMarca: 'VOZ_MARCA'
  }
  Object.keys(textos).forEach(function(k) {
    if (d[k] !== undefined) PROPS.setProperty(textos[k], String(d[k]))
  })

  // Llaves: se escriben solo si llegan con valor; se borran con "quitar".
  if (d.apifyToken) PROPS.setProperty('APIFY_TOKEN', String(d.apifyToken))
  if (d.claudeKey)  PROPS.setProperty('ANTHROPIC_KEY', String(d.claudeKey))
  if (d.openaiKey)  PROPS.setProperty('OPENAI_KEY', String(d.openaiKey))
  if (d.quitar === 'apify')  PROPS.deleteProperty('APIFY_TOKEN')
  if (d.quitar === 'claude') PROPS.deleteProperty('ANTHROPIC_KEY')
  if (d.quitar === 'openai') PROPS.deleteProperty('OPENAI_KEY')

  return h_getConfig()
}
