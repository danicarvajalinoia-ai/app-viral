// ============================================================
// ARRANQUE — acceso y navegación entre Radar y Ajustes.
// ============================================================
// El App Web de Google se publica abierto porque el frontend vive en Netlify
// y Google no permite su login entre dominios distintos. Por eso el acceso se
// protege con una clave que el dueño define la primera vez que entra.
// ============================================================

var _pagina = 'referentes'

// ── Tema claro / oscuro ──
// app.css ya trae las dos paletas: la oscura por defecto y la clara bajo
// html[data-theme="light"]. Aquí solo se cambia el atributo y se recuerda.
function temaActual() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

function aplicarTema(tema) {
  if (tema === 'light') document.documentElement.setAttribute('data-theme', 'light')
  else document.documentElement.removeAttribute('data-theme')
  localStorage.setItem('am_tema', tema)
  pintarBotonTema()
}

function alternarTema() {
  aplicarTema(temaActual() === 'light' ? 'dark' : 'light')
}

function pintarBotonTema() {
  var btn = document.getElementById('btn-tema')
  if (!btn) return
  var claro = temaActual() === 'light'
  // En claro se ofrece pasar a oscuro (luna) y al revés (sol).
  btn.innerHTML = claro
    ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>'
    : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
  btn.title = claro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'
}

// ── Pantallas ──
function mostrarPantalla(id) {
  ;['pantalla-conexion', 'pantalla-clave', 'pantalla-login', 'app-shell'].forEach(function(p) {
    document.getElementById(p).classList.toggle('hidden', p !== id)
  })
}

function mostrarConexion(error) {
  mostrarPantalla('pantalla-conexion')
  document.getElementById('conexion-error').textContent = error || ''
  document.getElementById('conexion-url').focus()
}

// Conectar la hoja: se valida contra el backend ANTES de guardar la URL, para
// no dejar guardada una dirección que no responde.
function submitConexion(e) {
  if (e) e.preventDefault()
  var url = document.getElementById('conexion-url').value.trim()
  var err = document.getElementById('conexion-error')

  if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(url)) {
    err.textContent = 'Debe ser la URL del Apps Script y terminar en /exec.'
    return
  }
  err.textContent = ''

  var btn = document.querySelector('#form-conexion button[type="submit"]')
  btn.disabled = true
  btn.textContent = 'Conectando…'

  setBackendUrl(url)
  setDemo(false)

  api.estado().then(function(res) {
    btn.disabled = false
    btn.textContent = 'Conectar'
    if (!res || res.ok === false) {
      setBackendUrl('')   // no dejar guardada una URL que no sirve
      err.textContent = 'No respondió: ' + ((res && res.error) || '') +
        ' Revisa que la implementación tenga acceso para "Cualquier usuario".'
      return
    }
    arrancarConBackend(res)
  })
}

// Entrar a la demo sin conectar nada.
function verDemo() {
  setBackendUrl('')
  setDemo(true)
  document.getElementById('banner-demo').classList.remove('hidden')
  api.listar().then(function(r) { entrar(r && r.filas) })
}

// Desconectar la hoja actual (por si se equivocó de URL o cambia de hoja).
function desconectar() {
  confirmModal('¿Desconectar esta hoja? Tendrás que volver a pegar la URL del Apps Script.', function() {
    setBackendUrl('')
    setClaveLocal('')
    setDemo(false)
    location.reload()
  }, { peligro: true, ok: 'Desconectar' })
}

function mostrarLogin(error) {
  mostrarPantalla('pantalla-login')
  document.getElementById('login-error').textContent = error || ''
  var i = document.getElementById('login-clave')
  i.value = ''
  i.focus()
}

// ── Navegación ──
function irA(pagina) {
  _pagina = pagina
  ;['referentes', 'ajustes'].forEach(function(p) {
    document.getElementById('page-' + p).classList.toggle('hidden', p !== pagina)
  })
  document.querySelectorAll('.nav-item').forEach(function(a) {
    a.classList.toggle('active', a.dataset.page === pagina)
  })
  if (pagina === 'referentes') renderReferentes()
  else renderAjustes()
}

// ── Entrar ──
function entrar(filas) {
  mostrarPantalla('app-shell')
  store.set(filas || [])
  irA('referentes')

  // Cuentas y seguidores se piden aparte para que la pantalla aparezca ya.
  // Cuando llegan, las tarjetas de arriba se repintan solas.
  Promise.all([api.listarCuentas(), api.listarMetricas()]).then(function(r) {
    if (r[0] && r[0].ok) store.setCuentas(r[0].cuentas)
    if (r[1] && r[1].ok) store.setMetricas(r[1].metricas)
    if (_pagina === 'referentes') renderReferentes()
  })
}

function submitLogin(e) {
  if (e) e.preventDefault()
  var clave = document.getElementById('login-clave').value
  if (!clave) { document.getElementById('login-error').textContent = 'Escribe la clave.'; return }

  var btn = document.querySelector('#form-login button[type="submit"]')
  btn.disabled = true
  btn.textContent = 'Entrando…'

  api.probarClave(clave).then(function(res) {
    btn.disabled = false
    btn.textContent = 'Entrar'
    if (!res || res.ok === false) {
      document.getElementById('login-error').textContent =
        res && res.error === 'CLAVE_INVALIDA' ? 'Clave incorrecta.' : ((res && res.error) || 'No se pudo entrar.')
      return
    }
    entrar(res.filas)
  })
}

// Primera vez: no hay clave en el script todavía, el dueño la define.
function submitDefinirClave(e) {
  if (e) e.preventDefault()
  var c1 = document.getElementById('clave-1').value
  var c2 = document.getElementById('clave-2').value
  var err = document.getElementById('clave-error')

  if (c1.length < 6) { err.textContent = 'Usa al menos 6 caracteres.'; return }
  if (c1 !== c2)     { err.textContent = 'Las dos claves no coinciden.'; return }
  err.textContent = ''

  api.setClave(c1).then(function(res) {
    if (!res || res.ok === false) { err.textContent = (res && res.error) || 'No se pudo guardar.'; return }
    setClaveLocal(c1)
    return api.listar().then(function(r) { entrar(r && r.filas) })
  })
}

// Con la hoja ya conectada: definir clave la primera vez, o entrar.
function arrancarConBackend(estado) {
  if (!estado.configurado) { mostrarPantalla('pantalla-clave'); return }

  // Ya hay clave guardada en este navegador: se intenta entrar directo.
  if (localStorage.getItem('am_clave')) {
    api.listar().then(function(r) {
      if (r && r.ok !== false) entrar(r.filas)
      else mostrarLogin(r && r.error === 'CLAVE_INVALIDA' ? 'Tu clave cambió, vuelve a entrar.' : '')
    })
    return
  }
  mostrarLogin()
}

// ── Arranque ──
document.addEventListener('DOMContentLoaded', function() {
  pintarBotonTema()
  document.getElementById('form-conexion').addEventListener('submit', submitConexion)
  document.getElementById('form-login').addEventListener('submit', submitLogin)
  document.getElementById('form-clave').addEventListener('submit', submitDefinirClave)

  // Nadie ha conectado una hoja: se pregunta por la URL (o se ofrece la demo).
  if (!backendUrl()) {
    if (enDemo()) {
      document.getElementById('banner-demo').classList.remove('hidden')
      api.listar().then(function(r) { entrar(r && r.filas) })
    } else {
      mostrarConexion()
    }
    return
  }

  api.estado().then(function(res) {
    if (!res || res.ok === false) {
      mostrarConexion('La hoja conectada no responde: ' + ((res && res.error) || '') +
        ' Pega la URL de nuevo o revisa la implementación del Apps Script.')
      return
    }
    arrancarConBackend(res)
  })
})

function salir() {
  confirmModal('¿Cerrar sesión en este navegador?', function() {
    setClaveLocal('')
    mostrarLogin()
  }, { ok: 'Cerrar sesión' })
}
