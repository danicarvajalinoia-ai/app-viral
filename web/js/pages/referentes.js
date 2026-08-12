// ============================================================
// RADAR DE REFERENTES — pantalla principal.
// ============================================================
// Pegas el enlace de un post de un competidor, Apify lo scrapea y la IA
// devuelve tu versión: Guion, Caption, Carrusel y texto de video de 10s.
// ============================================================

var _rfOrden = 'views'     // views | likes | comentarios | fecha
var _rfBusqueda = ''
var _rfPlataforma = ''     // '' = todas
var _rfAnalizando = false

function renderReferentes() {
  var page = document.getElementById('page-referentes')
  page.innerHTML = rfMisMetricas() + rfAnalizador() + rfListaSeccion()
  rfPintarFilas()
}

// ── Caja de análisis ──
function rfAnalizador() {
  return '<div class="rf-hero">' +
    '<h2 class="rf-hero-title">' + icon('radar', 20) + ' Radar de referentes</h2>' +
    '<p class="rf-hero-sub">Pega el enlace de un post que te llamó la atención. Traigo sus números y su transcripción, y te devuelvo tu versión lista para producir.</p>' +
    '<div class="rf-hero-row">' +
      '<input id="rf-url" class="rf-url-input" type="url" ' +
        'placeholder="https://www.instagram.com/reel/…  ·  tiktok.com/@…  ·  youtube.com/watch?v=…" ' +
        'onkeydown="if(event.key===\'Enter\')rfAnalizar()">' +
      '<button class="btn-primary rf-analizar-btn" id="rf-btn" onclick="rfAnalizar()">' +
        icon('sparkles') + ' Analizar</button>' +
    '</div>' +
    '<div id="rf-progreso" class="rf-progreso hidden"></div>' +
  '</div>'
}

function rfAnalizar() {
  if (_rfAnalizando) return
  var input = document.getElementById('rf-url')
  var url = (input.value || '').trim()
  if (!url) { showToast('Pega primero el enlace del post', 'error'); return }

  _rfAnalizando = true
  var btn = document.getElementById('rf-btn')
  btn.disabled = true
  btn.innerHTML = icon('sparkles') + ' Analizando…'

  // El scraping y la IA juntos tardan; se avisa por pasos para que la espera
  // no se sienta como que la app se colgó.
  var prog = document.getElementById('rf-progreso')
  prog.classList.remove('hidden')
  prog.textContent = 'Consultando el post en Apify… (puede tardar hasta un minuto)'
  var t = setTimeout(function() { prog.textContent = 'Generando tu versión con la IA…' }, 20000)

  api.analizar(url).then(function(res) {
    clearTimeout(t)
    if (res && res.fila) store.reemplazar(res.fila)

    if (!res || res.ok === false) {
      // Si el scraping funcionó pero la IA no, la fila igual se guardó.
      showToast((res && res.error) || 'No se pudo analizar', 'error')
      if (res && res.parcial) {
        // El error concreto se queda a la vista: el toast se va en segundos y
        // ahí casi siempre dice exactamente qué falta configurar.
        prog.textContent = (res.error || 'La IA falló') +
          ' — los datos del referente sí se guardaron. Abre la fila y usa "Regenerar" para reintentar.'
        return
      }
      prog.classList.add('hidden')
      return
    }

    input.value = ''
    prog.classList.add('hidden')
    showToast('✓ Listo — tu versión está abajo')
    rfAbrirDetalle(res.fila.id)
  }).catch(function(err) {
    clearTimeout(t)
    prog.classList.add('hidden')
    showToast('Error: ' + (err.message || err), 'error')
  }).then(function() {
    clearTimeout(t)
    _rfAnalizando = false
    btn.disabled = false
    btn.innerHTML = icon('sparkles') + ' Analizar'
  })
}

// ── Mis métricas: seguidores por red ──
// Misma fórmula del CRM: por cada red se suma la última medición de cada
// cuenta, y se compara contra la medición anterior para mostrar la variación.
function rfMisMetricas() {
  var cards = (CONFIG.REDES || []).map(function(r) {
    var s = store.seguidoresPorRed(r.id)
    var delta = s.total - s.previa
    var pct = s.previa > 0 ? (delta / s.previa) * 100 : 0
    var color = delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text-muted)'
    var signo = delta > 0 ? '+' : ''
    var tieneCuenta = store.cuentas.some(function(c) { return c.red === r.id })

    return '<div class="rf-metric-card">' +
      '<div class="rf-metric-head">' + redIcon(r.id, 20) + ' ' + escHtml(r.label) + '</div>' +
      '<div class="rf-metric-num">' + (tieneCuenta ? fmtCompact(s.total) : '—') + '</div>' +
      '<div class="rf-metric-sub">SEGUIDORES</div>' +
      '<div class="rf-metric-delta" style="color:' + color + '">' +
        (s.previa > 0 ? signo + fmtCompact(delta) + ' (' + signo + pct.toFixed(1) + '%)' : '—') +
        ' <span style="color:var(--text-muted)">vs medición previa</span></div>' +
    '</div>'
  }).join('')

  var sinCuentas = !store.cuentas.length

  return '<div class="rf-mis-head">' +
      '<h2 class="rf-seccion-title">Mis cuentas</h2>' +
      '<button class="btn-secondary" id="rf-metricas-btn" onclick="rfActualizarMetricas()">' +
        icon('refresh') + ' Actualizar métricas</button>' +
    '</div>' +
    '<div class="rf-metrics">' + cards + '</div>' +
    (sinCuentas
      ? '<p class="rf-aviso">Todavía no has agregado tus cuentas. ' +
        '<a href="#" onclick="irA(\'ajustes\');return false">Agrégalas en Ajustes</a> para ver tus seguidores aquí.</p>'
      : '')
}

function rfActualizarMetricas() {
  if (!store.cuentas.length) {
    showToast('Primero agrega tus cuentas en Ajustes', 'error')
    return
  }
  var btn = document.getElementById('rf-metricas-btn')
  btn.disabled = true
  btn.innerHTML = icon('refresh') + ' Consultando…'
  showToast('Consultando seguidores en Apify…')

  api.scrapeSeguidores().then(function(res) {
    if (!res || res.ok === false) { showToast((res && res.error) || 'No se pudo actualizar', 'error'); return }
    store.setMetricas(res.metricas)
    renderReferentes()
    var nOk = (res.actualizadas || []).length, nErr = (res.errores || []).length
    showToast(nOk + ' cuentas actualizadas' + (nErr ? ' · ' + nErr + ' con error' : ''),
      nErr && !nOk ? 'error' : 'success')
    if (nErr) console.warn('Apify errores:', res.errores)
  }).then(null, function(err) {
    showToast('Error: ' + (err.message || err), 'error')
  }).then(function() {
    var b = document.getElementById('rf-metricas-btn')
    if (b) { b.disabled = false; b.innerHTML = icon('refresh') + ' Actualizar métricas' }
  })
}

// ── Lista ──
function rfListaSeccion() {
  var opsPlat = ['<option value="">Todas las plataformas</option>'].concat(
    (CONFIG.PLATAFORMAS || []).map(function(p) {
      return '<option value="' + escHtml(p.id) + '"' + (_rfPlataforma === p.id ? ' selected' : '') + '>' + escHtml(p.id) + '</option>'
    })).join('')

  var opsOrden = [
    { id: 'views', label: 'Más vistos' },
    { id: 'likes', label: 'Más likes' },
    { id: 'comentarios', label: 'Más comentados' },
    { id: 'fecha', label: 'Más recientes' }
  ].map(function(o) {
    return '<option value="' + o.id + '"' + (_rfOrden === o.id ? ' selected' : '') + '>' + escHtml(o.label) + '</option>'
  }).join('')

  return '<div class="rf-card">' +
    '<div class="rf-list-head">' +
      '<div><h3 class="rf-list-title">Analizados</h3>' +
        '<p class="rf-list-sub" id="rf-sub"></p></div>' +
      '<div class="rf-filtros">' +
        '<input class="rf-search" placeholder="Buscar por referente o tema…" value="' + escHtml(_rfBusqueda) + '" oninput="rfBuscar(this.value)">' +
        '<select onchange="rfSetPlataforma(this.value)">' + opsPlat + '</select>' +
        '<select onchange="rfSetOrden(this.value)">' + opsOrden + '</select>' +
      '</div>' +
    '</div>' +
    '<div id="rf-filas"></div>' +
  '</div>'
}

function rfSetOrden(v)      { _rfOrden = v; rfPintarFilas() }
function rfSetPlataforma(v) { _rfPlataforma = v; rfPintarFilas() }
function rfBuscar(v)        { _rfBusqueda = v; rfPintarFilas() }

function rfVisibles() {
  var q = (_rfBusqueda || '').trim().toLowerCase()
  var lista = store.filas.filter(function(f) {
    if (_rfPlataforma && f.plataforma !== _rfPlataforma) return false
    if (!q) return true
    return (String(f.referente) + ' ' + String(f.tema) + ' ' + String(f.hashtag)).toLowerCase().indexOf(q) >= 0
  })
  return lista.sort(function(a, b) {
    if (_rfOrden === 'fecha') return new Date(b.fecha || 0) - new Date(a.fecha || 0)
    return (Number(b[_rfOrden]) || 0) - (Number(a[_rfOrden]) || 0)
  })
}

function rfPintarFilas() {
  var cont = document.getElementById('rf-filas')
  if (!cont) return
  var lista = rfVisibles()

  cont.innerHTML = lista.length
    ? lista.map(rfFilaHtml).join('')
    : '<div class="rf-empty">' +
        (store.filas.length ? 'Ningún referente coincide con el filtro.'
                            : 'Todavía no has analizado ningún post. Pega un enlace arriba para empezar.') +
      '</div>'

  // El subtítulo lleva los totales de lo que llevas estudiado: es el resumen
  // que antes ocupaba tarjetas propias, ahora que arriba van tus seguidores.
  var sub = document.getElementById('rf-sub')
  if (sub) {
    var t = { views: 0, likes: 0, comentarios: 0 }
    lista.forEach(function(f) {
      t.views += Number(f.views) || 0
      t.likes += Number(f.likes) || 0
      t.comentarios += Number(f.comentarios) || 0
    })
    sub.textContent = lista.length + (lista.length === 1 ? ' pieza' : ' piezas') +
      (lista.length ? ' · ' + fmtCompact(t.views) + ' views · ' + fmtCompact(t.likes) +
                      ' likes · ' + fmtCompact(t.comentarios) + ' comentarios' : '')
  }
}

function rfFilaHtml(f) {
  var info = estadoInfo(f.estado)
  var red = redDePlataforma(f.plataforma)
  var titulo = f.tema || f.referente || '(sin tema)'

  var opsEstado = (CONFIG.ESTADOS || []).map(function(e) {
    return '<option value="' + escHtml(e.id) + '"' + (f.estado === e.id ? ' selected' : '') + '>' + escHtml(e.id) + '</option>'
  }).join('')

  return '<div class="rf-row" onclick="rfAbrirDetalle(\'' + escHtml(f.id) + '\')">' +
    '<div class="rf-row-main">' +
      '<div class="rf-row-title">' + escHtml(titulo) + '</div>' +
      '<div class="rf-row-meta">' +
        redIcon(red, 15) + ' ' + escHtml(f.referente || '—') +
        (f.fecha ? ' · ' + escHtml(formatDate(f.fecha)) : '') +
        (f.transcripcion ? '' : ' · <span class="rf-warn">sin transcripción</span>') +
      '</div>' +
    '</div>' +
    '<div class="rf-row-stats">' +
      '<span title="Views">' + icon('play', 13) + ' ' + fmtCompact(f.views) + '</span>' +
      '<span title="Likes">' + icon('heart', 13) + ' ' + fmtCompact(f.likes) + '</span>' +
      '<span title="Comentarios">' + icon('message', 13) + ' ' + fmtCompact(f.comentarios) + '</span>' +
    '</div>' +
    '<div class="rf-row-actions" onclick="event.stopPropagation()">' +
      '<select class="rf-estado-sel" style="border-color:' + info.color + ';color:' + info.color + '" ' +
        'onchange="rfSetEstado(\'' + escHtml(f.id) + '\', this.value)">' + opsEstado + '</select>' +
      '<button class="card-btn card-btn-delete" title="Eliminar" onclick="rfEliminar(\'' + escHtml(f.id) + '\')">' + icon('trash') + '</button>' +
    '</div>' +
  '</div>'
}

function rfSetEstado(id, estado) {
  var f = store.porId(id)
  if (f) f.estado = estado
  rfPintarFilas()
  api.guardar(id, { estado: estado }).then(function(res) {
    if (!res || res.ok === false) showToast((res && res.error) || 'No se pudo guardar', 'error')
  })
}

function rfEliminar(id) {
  var f = store.porId(id)
  confirmModal('¿Eliminar "' + ((f && (f.tema || f.referente)) || 'esta pieza') + '" de la hoja?', function() {
    store.quitar(id)
    renderReferentes()
    api.eliminar(id).then(function(res) {
      if (!res || res.ok === false) showToast((res && res.error) || 'No se pudo eliminar', 'error')
      else showToast('Eliminado')
    })
  }, { peligro: true, ok: 'Eliminar' })
}

// ── Detalle: lo que trajo el referente (izquierda) y lo tuyo (derecha) ──
function rfAbrirDetalle(id) {
  var f = store.porId(id)
  if (!f) return

  var enlace = safeUrl(f.pieza)
  var red = redDePlataforma(f.plataforma)

  function campo(etiqueta, clave, filas) {
    return '<div class="rf-campo">' +
      '<div class="rf-campo-head">' +
        '<label>' + escHtml(etiqueta) + '</label>' +
        '<button class="rf-copy" onclick="rfCopiar(\'d-' + clave + '\')">' + icon('copy', 13) + ' Copiar</button>' +
      '</div>' +
      '<textarea id="d-' + clave + '" rows="' + filas + '">' + escHtml(f[clave] || '') + '</textarea>' +
    '</div>'
  }

  document.getElementById('modal-detalle').innerHTML =
    '<div class="modal-head-row">' +
      '<h2>' + redIcon(red, 18) + ' ' + escHtml(f.referente || 'Referente') + '</h2>' +
      '<button class="modal-x" onclick="closeModal(\'modal-detalle\')">×</button>' +
    '</div>' +

    '<div class="rf-stats-strip">' +
      '<div><b>' + fmtCompact(f.views) + '</b><span>Views</span></div>' +
      '<div><b>' + fmtCompact(f.likes) + '</b><span>Likes</span></div>' +
      '<div><b>' + fmtCompact(f.comentarios) + '</b><span>Comentarios</span></div>' +
      '<div><b>' + escHtml(formatDate(f.fecha)) + '</b><span>Publicado</span></div>' +
      '<div><b>' + escHtml(f.plataforma || '—') + '</b><span>Plataforma' + (f.pais ? ' · ' + escHtml(f.pais) : '') + '</span></div>' +
    '</div>' +
    (f.hashtag ? '<p class="rf-hashtags">' + escHtml(f.hashtag) + '</p>' : '') +
    (enlace ? '<p class="rf-hint">' + icon('link', 13) + ' <a href="' + escHtml(enlace) + '" target="_blank" rel="noopener">Ver el post original ↗</a></p>' : '') +

    '<div class="rf-detalle-cols">' +
      '<div class="rf-col">' +
        '<h3 class="rf-col-title">Del referente</h3>' +
        campo('Tema', 'tema', 2) +
        campo('Transcripción', 'transcripcion', 8) +
        campo('Traducción', 'traduccion', 8) +
      '</div>' +
      '<div class="rf-col">' +
        '<h3 class="rf-col-title">' + icon('sparkles', 14) + ' Tu versión</h3>' +
        campo('Copy / Guion', 'guion', 10) +
        campo('Caption', 'caption', 4) +
        campo('Carrusel', 'carrusel', 6) +
        campo('Videos 10s', 'video10s', 3) +
      '</div>' +
    '</div>' +

    '<div class="modal-actions" style="justify-content:space-between">' +
      '<button class="btn-secondary" onclick="rfRegenerar(\'' + escHtml(f.id) + '\')" id="rf-regen-btn">' +
        icon('refresh') + ' Regenerar con IA</button>' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn-secondary" onclick="closeModal(\'modal-detalle\')">Cerrar</button>' +
        '<button class="btn-primary" onclick="rfGuardarDetalle(\'' + escHtml(f.id) + '\')">Guardar</button>' +
      '</div>' +
    '</div>'

  openModal('modal-detalle')

  if (!f.transcripcion) {
    showToast('Este post no trajo transcripción — pégala a mano y usa Regenerar', 'error')
  }
}

var _RF_EDITABLES = ['tema', 'transcripcion', 'traduccion', 'guion', 'caption', 'carrusel', 'video10s']

function rfCopiar(elId) {
  var el = document.getElementById(elId)
  if (el) copiarTexto(el.value)
}

function rfGuardarDetalle(id) {
  var campos = {}
  _RF_EDITABLES.forEach(function(c) {
    var el = document.getElementById('d-' + c)
    if (el) campos[c] = el.value
  })

  var f = store.porId(id)
  if (f) Object.assign(f, campos)
  rfPintarFilas()

  api.guardar(id, campos).then(function(res) {
    if (!res || res.ok === false) { showToast((res && res.error) || 'No se pudo guardar', 'error'); return }
    if (res.fila) store.reemplazar(res.fila)
    closeModal('modal-detalle')
    showToast('✓ Guardado en la hoja')
  })
}

function rfRegenerar(id) {
  // Se manda primero lo que esté escrito: si pegaste la transcripción a mano,
  // la IA la usa en vez de la que vino vacía del scraping.
  var campos = {}
  _RF_EDITABLES.forEach(function(c) {
    var el = document.getElementById('d-' + c)
    if (el) campos[c] = el.value
  })

  var btn = document.getElementById('rf-regen-btn')
  btn.disabled = true
  btn.innerHTML = icon('refresh') + ' Generando…'

  api.guardar(id, campos)
    .then(function() { return api.regenerar(id) })
    .then(function(res) {
      if (!res || res.ok === false) { showToast((res && res.error) || 'La IA falló', 'error'); return }
      store.reemplazar(res.fila)
      rfPintarFilas()
      rfAbrirDetalle(id)
      showToast('✓ Regenerado')
    })
    .then(null, function(err) { showToast('Error: ' + (err.message || err), 'error') })
    .then(function() {
      if (btn.isConnected) { btn.disabled = false; btn.innerHTML = icon('refresh') + ' Regenerar con IA' }
    })
}

store.on('change:filas', function() {
  if (!document.getElementById('page-referentes').classList.contains('hidden')) rfPintarFilas()
})
