// ============================================================
// MODO DEMO — la app funcionando sin backend.
// ============================================================
// Se activa SOLO cuando CONFIG.BACKEND_URL está vacío. Sirve para dos cosas:
// recorrer la app antes de instalarla, y mostrársela a un comprador.
//
// Todo vive en memoria: nada se guarda, nada se scrapea, nada se le pide a la
// IA. Al recargar la página vuelve al estado inicial.
// ============================================================

var DEMO_ACTIVO = false   // lo enciende api.js si no hay BACKEND_URL

var DEMO_FILAS = [
  {
    id: 'demo_1',
    referente: '@garyvee',
    views: 1840000, likes: 214000, comentarios: 3120,
    hashtag: '#marketing #contenido #emprendimiento',
    numPost: 'C8xK2mLpQr1',
    fecha: '2026-07-28T14:20:00.000Z',
    pais: 'Estados Unidos',
    plataforma: 'Instagram',
    tema: 'Publicar aunque nadie te vea',
    transcripcion: 'Everybody wants the audience before they do the work. You are worried about the fifty people watching. Those fifty people are the reason you get to five hundred. The first two years nobody watched me either. Volume beats perfection every single time.',
    traduccion: 'Todos quieren la audiencia antes de hacer el trabajo. Te preocupan las cincuenta personas que te ven. Esas cincuenta son la razón por la que vas a llegar a quinientas. Los primeros dos años a mí tampoco me veía nadie. El volumen le gana a la perfección todas las veces.',
    guion: 'Te da pena publicar porque solo te ven cincuenta personas.\n\nEsas cincuenta son exactamente la razón por la que algún día vas a llegar a quinientas. No hay atajo. No hay una versión de esto donde te saltas la parte incómoda.\n\nLos primeros dos años nadie me veía a mí tampoco. Lo único que cambió no fue la calidad: fue la cantidad de veces que aparecí.\n\nPublica hoy el que te da pena. Ese es el que cuenta.',
    caption: '¿Te da pena publicar porque casi nadie te ve? 👀\n\nEsas primeras personas son las que construyen a las siguientes. Nadie empieza con audiencia.\n\nPublica el que te da pena. Ese es el que cuenta 🚀\n\n¿Cuántas veces has borrado un post antes de subirlo? Cuéntame abajo 👇',
    carrusel: '1. Te da pena publicar porque solo te ven 50 personas\n2. Esas 50 son las que construyen a las próximas 500\n3. No existe la versión donde te saltas la parte incómoda\n4. Los primeros 2 años a nadie lo ve nadie\n5. Lo que cambia no es la calidad: es la cantidad de veces que apareces\n6. El post que te da pena es el que cuenta\n7. ¿Cuál vas a publicar hoy?',
    video10s: 'Te da pena que solo te vean 50.\nEsas 50 construyen las próximas 500.\nPublica el que te da pena.',
    pieza: 'https://www.instagram.com/reel/C8xK2mLpQr1/',
    estado: 'Publicado'
  },
  {
    id: 'demo_2',
    referente: '@aliabdaal',
    views: 962000, likes: 88400, comentarios: 1740,
    hashtag: '#productividad #habitos',
    numPost: '7392018475620',
    fecha: '2026-08-02T09:05:00.000Z',
    pais: 'Reino Unido',
    plataforma: 'TikTok',
    tema: 'La regla de los dos minutos',
    transcripcion: 'If a task takes less than two minutes, do it now. The reason this works is not time management, it is momentum. Your brain treats an unfinished small task the same way it treats a big one. Clear the small ones and the big one stops feeling impossible.',
    traduccion: 'Si una tarea toma menos de dos minutos, hazla ya. Esto funciona no por gestión del tiempo, sino por impulso. Tu cerebro trata una tarea pequeña sin terminar igual que una grande. Saca las pequeñas y la grande deja de sentirse imposible.',
    guion: 'Si algo te toma menos de dos minutos, hazlo ya.\n\nY no es por productividad. Es por otra cosa: tu cerebro trata una tarea chiquita sin terminar exactamente igual que una gigante. Las dos ocupan el mismo espacio.\n\nPor eso terminas el día agotado sin haber hecho nada grande. No fue el trabajo. Fueron las once cositas abiertas.\n\nSaca las pequeñas primero. La grande deja de verse imposible.',
    caption: 'Si te toma menos de 2 minutos, hazlo ya ⏱️\n\nNo es productividad, es cómo funciona tu cabeza: una tarea chiquita sin terminar pesa igual que una gigante.\n\nPor eso terminas agotado sin haber hecho nada grande.\n\n¿Cuántas cositas abiertas tienes ahora mismo? 👇',
    carrusel: '1. Si te toma menos de 2 minutos, hazlo ya\n2. No es productividad: es cómo funciona tu cabeza\n3. Una tarea chiquita sin terminar pesa igual que una gigante\n4. Las dos ocupan el mismo espacio mental\n5. Por eso terminas agotado sin haber hecho nada grande\n6. No fue el trabajo: fueron las 11 cositas abiertas\n7. Saca las pequeñas y la grande deja de verse imposible',
    video10s: '¿Te toma menos de 2 minutos?\nHazlo ya.\nNo es productividad: es espacio mental.',
    pieza: 'https://www.tiktok.com/@aliabdaal/video/7392018475620',
    estado: 'En producción'
  },
  {
    id: 'demo_3',
    referente: 'Marques Brownlee',
    views: 3410000, likes: 156000, comentarios: 8930,
    hashtag: '#tecnologia #ia',
    numPost: 'dQw4w9WgXcQ',
    fecha: '2026-08-06T17:00:00.000Z',
    pais: 'Estados Unidos',
    plataforma: 'YouTube',
    tema: 'La IA no te quita el trabajo',
    transcripcion: '',
    traduccion: '',
    guion: '',
    caption: '',
    carrusel: '',
    video10s: '',
    pieza: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    estado: 'Pendiente'
  }
]

// Mis cuentas propias y dos mediciones de cada una, para que las tarjetas de
// seguidores muestren también la variación.
var DEMO_CUENTAS = [
  { id: 'cta_1', red: 'instagram', handle: '@tumarca',      nombre: 'Tu Marca',     activo: true, fecha_creacion: '2026-06-01T10:00:00.000Z' },
  { id: 'cta_2', red: 'tiktok',    handle: '@tumarca',      nombre: 'Tu Marca',     activo: true, fecha_creacion: '2026-06-01T10:00:00.000Z' },
  { id: 'cta_3', red: 'youtube',   handle: '@tumarca',      nombre: 'Tu Marca',     activo: true, fecha_creacion: '2026-06-01T10:00:00.000Z' }
]

var DEMO_METRICAS = [
  { id: 'met_1', cuenta_id: 'cta_1', red: 'instagram', handle: '@tumarca', seguidores: 41200, fecha: '2026-07-15T08:00:00.000Z' },
  { id: 'met_2', cuenta_id: 'cta_1', red: 'instagram', handle: '@tumarca', seguidores: 43850, fecha: '2026-08-10T08:00:00.000Z' },
  { id: 'met_3', cuenta_id: 'cta_2', red: 'tiktok',    handle: '@tumarca', seguidores: 18640, fecha: '2026-07-15T08:00:00.000Z' },
  { id: 'met_4', cuenta_id: 'cta_2', red: 'tiktok',    handle: '@tumarca', seguidores: 22310, fecha: '2026-08-10T08:00:00.000Z' },
  { id: 'met_5', cuenta_id: 'cta_3', red: 'youtube',   handle: '@tumarca', seguidores: 9120,  fecha: '2026-07-15T08:00:00.000Z' },
  { id: 'met_6', cuenta_id: 'cta_3', red: 'youtube',   handle: '@tumarca', seguidores: 8940,  fecha: '2026-08-10T08:00:00.000Z' }
]

var DEMO_CONFIG = {
  ok: true,
  proveedor: 'claude',
  modelo: '',
  promptCentral: [
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
  ].join('\n'),
  vozMarca: JSON.stringify([
    { nombre: 'Guion que funcionó · julio', texto: 'Ejemplo de guion con la voz de la marca.\n\nAquí subirías tus propios guiones y captions que ya te funcionaron, para que la IA imite ese estilo.' }
  ]),
  apifyPuesta: false,
  claudePuesta: false,
  openaiPuesta: false
}

// Copia de trabajo: se modifica durante la sesión y se pierde al recargar.
var _demoFilas = null
var _demoCfg = null
var _demoCuentas = null
var _demoMetricas = null

function _demoEstado() {
  if (!_demoFilas)    _demoFilas = JSON.parse(JSON.stringify(DEMO_FILAS))
  if (!_demoCfg)      _demoCfg = JSON.parse(JSON.stringify(DEMO_CONFIG))
  if (!_demoCuentas)  _demoCuentas = JSON.parse(JSON.stringify(DEMO_CUENTAS))
  if (!_demoMetricas) _demoMetricas = JSON.parse(JSON.stringify(DEMO_METRICAS))
}

/** Responde igual que el backend real, pero desde memoria. */
function demoResponder(action, d) {
  _demoEstado()

  if (action === 'estado')  return { ok: true, configurado: true }
  if (action === 'listar')  return { ok: true, filas: _demoFilas }

  if (action === 'analizar') {
    return { ok: false, error: 'Estás en modo demo: no se puede analizar un enlace real. Configura el backend para activarlo.' }
  }
  if (action === 'regenerar') {
    return { ok: false, error: 'Estás en modo demo: la IA no está conectada.' }
  }

  if (action === 'guardar') {
    var f = _demoFilas.find(function(x) { return x.id === d.id })
    if (!f) return { ok: false, error: 'No encontré esa fila.' }
    Object.assign(f, d.campos || {})
    return { ok: true, fila: f }
  }

  if (action === 'eliminar') {
    _demoFilas = _demoFilas.filter(function(x) { return x.id !== d.id })
    return { ok: true }
  }

  // ── Mis cuentas ──
  if (action === 'listarCuentas')  return { ok: true, cuentas: _demoCuentas }
  if (action === 'listarMetricas') return { ok: true, metricas: _demoMetricas }

  if (action === 'addCuenta') {
    if (!String(d.handle || '').trim()) return { ok: false, error: 'Escribe el @usuario de la cuenta.' }
    _demoCuentas.push({
      id: 'cta_demo_' + (_demoCuentas.length + 1),
      red: d.red || 'instagram', handle: d.handle, nombre: d.nombre || '',
      activo: true, fecha_creacion: new Date().toISOString()
    })
    return { ok: true, cuentas: _demoCuentas }
  }

  if (action === 'updateCuenta') {
    var c = _demoCuentas.find(function(x) { return x.id === d.id })
    if (!c) return { ok: false, error: 'No encontré esa cuenta.' }
    ;['red', 'handle', 'nombre', 'activo'].forEach(function(k) {
      if (d[k] !== undefined) c[k] = d[k]
    })
    return { ok: true, cuentas: _demoCuentas }
  }

  if (action === 'deleteCuenta') {
    _demoCuentas = _demoCuentas.filter(function(x) { return x.id !== d.id })
    _demoMetricas = _demoMetricas.filter(function(x) { return x.cuenta_id !== d.id })
    return { ok: true, cuentas: _demoCuentas }
  }

  if (action === 'scrapeSeguidores') {
    return { ok: false, error: 'Estás en modo demo: Apify no está conectado.' }
  }

  if (action === 'getConfig') return _demoCfg

  if (action === 'saveConfig') {
    // Las llaves no se guardan ni de mentira: en demo no hay dónde ponerlas.
    ;['proveedor', 'modelo', 'promptCentral', 'vozMarca'].forEach(function(k) {
      if (d[k] !== undefined) _demoCfg[k] = d[k]
    })
    if (d.apifyToken || d.claudeKey || d.openaiKey) {
      return { ok: false, error: 'Estás en modo demo: las llaves no se pueden guardar sin backend.' }
    }
    return _demoCfg
  }

  return { ok: false, error: 'Acción desconocida en demo: ' + action }
}
