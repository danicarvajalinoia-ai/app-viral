// ============================================================
// API — Cliente del Apps Script (la hoja de cálculo es la base).
// ============================================================
// Todas las llamadas son POST con el cuerpo en JSON. NO se mandan headers
// personalizados a propósito: así el navegador las trata como peticiones
// simples y no dispara el preflight CORS, que Apps Script no responde.
// ============================================================

// La clave de acceso se guarda en el navegador para no pedirla en cada visita.
var _clave = localStorage.getItem('am_clave') || ''

function setClaveLocal(c) {
  _clave = c || ''
  if (_clave) localStorage.setItem('am_clave', _clave)
  else localStorage.removeItem('am_clave')
}

// ── A qué hoja está conectada esta app ──
// La URL del Apps Script la pega el usuario desde la app y queda guardada en
// su navegador. Si CONFIG.BACKEND_URL trae algo, ese manda y no se pregunta.
function backendUrl() {
  return CONFIG.BACKEND_URL || localStorage.getItem('am_backend') || ''
}

function setBackendUrl(url) {
  url = String(url || '').trim()
  if (url) localStorage.setItem('am_backend', url)
  else localStorage.removeItem('am_backend')
}

function enDemo() {
  return !backendUrl() && localStorage.getItem('am_demo') === '1'
}

function setDemo(activo) {
  if (activo) localStorage.setItem('am_demo', '1')
  else localStorage.removeItem('am_demo')
}

function _post(action, payload) {
  // Sin hoja conectada, la app corre con datos de ejemplo. Ver js/demo.js.
  if (!backendUrl()) {
    DEMO_ACTIVO = true
    var r = demoResponder(action, payload || {})
    // Pequeño retraso para que la interfaz se comporte igual que con el
    // backend real (spinners, botones deshabilitados).
    return new Promise(function(res) { setTimeout(function() { res(r) }, 220) })
  }

  var body = Object.assign({ action: action, clave: _clave }, payload || {})
  return fetch(backendUrl(), { method: 'POST', body: JSON.stringify(body) })
    .then(function(r) { return r.json() })
    .then(function(res) {
      // Sesión inválida → la app vuelve a pedir la clave.
      if (res && res.ok === false && res.error === 'CLAVE_INVALIDA') {
        setClaveLocal('')
        if (typeof mostrarLogin === 'function') mostrarLogin('La clave no es correcta.')
      }
      return res
    })
    .catch(function(err) {
      return { ok: false, error: 'No hay conexión con el backend: ' + (err.message || err) }
    })
}

var api = {
  // ── Acceso ──
  estado:    function()  { return _post('estado') },
  setClave:  function(c) { return _post('setClave', { clave: c }) },
  // Sirve de "login": si la clave es mala, el backend responde CLAVE_INVALIDA.
  probarClave: function(c) {
    var previa = _clave
    _clave = c
    return _post('listar').then(function(res) {
      if (!res || res.ok === false) { _clave = previa; return res }
      setClaveLocal(c)
      return res
    })
  },

  // ── Referentes ──
  listar:    function()      { return _post('listar') },
  analizar:  function(url)   { return _post('analizar', { url: url }) },
  regenerar: function(id)    { return _post('regenerar', { id: id }) },
  guardar:   function(id, campos) { return _post('guardar', { id: id, campos: campos }) },
  eliminar:  function(id)    { return _post('eliminar', { id: id }) },

  // ── Mis cuentas y seguidores ──
  listarCuentas:  function()  { return _post('listarCuentas') },
  addCuenta:      function(d) { return _post('addCuenta', d) },
  updateCuenta:   function(d) { return _post('updateCuenta', d) },
  deleteCuenta:   function(id) { return _post('deleteCuenta', { id: id }) },
  listarMetricas: function()  { return _post('listarMetricas') },
  scrapeSeguidores: function(cuentaId) { return _post('scrapeSeguidores', { cuentaId: cuentaId || '' }) },

  // ── Configuración ──
  getConfig:  function()  { return _post('getConfig') },
  saveConfig: function(d) { return _post('saveConfig', d) }
}
