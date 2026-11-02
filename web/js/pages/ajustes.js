// ============================================================
// AJUSTES — llaves, prompt central, voz de marca y prompts por pieza.
// ============================================================
// Mismo esquema que Integraciones del CRM: un prompt es Instrucciones +
// Ejemplos, como un proyecto de Claude. Las llaves se escriben aquí pero se
// guardan en el Apps Script: el navegador nunca las vuelve a ver.
// ============================================================

var _ajEditKey = {}   // qué tarjeta de llave está en modo "cambiar"

function renderAjustes() {
  var page = document.getElementById('page-ajustes')

  if (!store.cfg) {
    page.innerHTML = '<div class="rf-empty">Cargando ajustes…</div>'
    api.getConfig().then(function(res) {
      if (!res || res.ok === false) {
        page.innerHTML = '<div class="rf-empty">No se pudo leer la configuración: ' + escHtml((res && res.error) || '') + '</div>'
        return
      }
      store.cfg = res
      renderAjustes()
    })
    return
  }

  var c = store.cfg
  page.innerHTML =
    '<h2 style="font-size:24px;font-weight:700">Ajustes</h2>' +
    '<p class="subtitle" style="margin-bottom:20px">Llaves de los servicios y entrenamiento de la IA.</p>' +
    ajConexion() +
    ajMisCuentas() +
    ajBloqueLlaves(c) +
    ajBloqueProveedor(c) +
    ajPromptCentral(c) +
    ajVozMarca(c)
}

// ── Hoja conectada ──
function ajConexion() {
  var url = backendUrl()
  if (!url) {
    return '<div class="ia-block"><h3 class="ia-h3">Hoja conectada</h3>' +
      '<div class="ia-card">' +
        '<div class="ia-card-top"><span class="ia-card-name">Modo demo</span>' +
          '<span class="ia-badge ia-badge--off">SIN CONECTAR</span></div>' +
        '<p class="ia-card-help">Estás viendo datos de ejemplo. Conecta tu Google Sheet para trabajar de verdad.</p>' +
        '<div class="ia-card-foot"><span></span>' +
          '<div class="ia-actions"><button class="btn-primary" onclick="desconectar()">Conectar mi hoja</button></div>' +
        '</div>' +
      '</div></div>'
  }

  // La URL se muestra recortada: es larga y no aporta verla completa.
  var corta = url.length > 58 ? url.slice(0, 40) + '…' + url.slice(-12) : url

  return '<div class="ia-block"><h3 class="ia-h3">Hoja conectada</h3>' +
    '<div class="ia-card">' +
      '<div class="ia-card-top"><span class="ia-card-name">Apps Script</span>' +
        '<span class="ia-badge ia-badge--on">CONECTADO</span></div>' +
      '<p class="ia-card-help">Tus datos viven en tu Google Sheet. Esta app solo la lee y la escribe.</p>' +
      '<div class="ia-card-foot">' +
        '<span class="ia-key" title="' + escHtml(url) + '">' + escHtml(corta) + '</span>' +
        '<div class="ia-actions">' +
          '<button class="ia-btn-ghost" onclick="desconectar()">Desconectar</button>' +
        '</div>' +
      '</div>' +
    '</div></div>'
}

// ── Mis cuentas de redes ──
// Son las cuentas propias cuyos seguidores se miden. Cada medición se guarda
// en la pestaña Metricas_RS, y de ahí salen las tarjetas del Radar.
function ajMisCuentas() {
  var filas = store.cuentas.length
    ? store.cuentas.map(function(c) {
        var m = store.ultimaMetrica(c.id)
        var seg = m.actual ? fmtCompact(m.actual.seguidores) : '—'
        return '<div class="rf-row" onclick="ajEditarCuenta(\'' + escHtml(c.id) + '\')">' +
          '<div class="rf-row-main">' +
            '<div class="rf-row-title">' + redIcon(c.red, 16) + ' ' + escHtml(c.handle || c.nombre || '—') + '</div>' +
            '<div class="rf-row-meta">' + escHtml(c.nombre || '') +
              (m.actual ? (c.nombre ? ' · ' : '') + 'medido el ' + escHtml(formatDate(m.actual.fecha)) : '') +
              (c.activo ? '' : ' · <span class="rf-warn">inactiva</span>') + '</div>' +
          '</div>' +
          '<div class="rf-row-stats"><span><b>' + seg + '</b> seguidores</span></div>' +
        '</div>'
      }).join('')
    : '<div class="rf-empty" style="padding:24px">Sin cuentas todavía. Agrega la primera para empezar a medir tus seguidores.</div>'

  return '<div class="ia-block">' +
    '<div class="ia-block-head">' +
      '<h3 class="ia-h3" style="margin:0">Mis cuentas</h3>' +
      '<button class="btn-primary" onclick="ajEditarCuenta(null)">' + icon('plus') + ' Agregar cuenta</button>' +
    '</div>' +
    filas +
  '</div>'
}

function ajEditarCuenta(id) {
  var c = id ? store.cuentaPorId(id) : null
  var ops = (CONFIG.REDES || []).map(function(r) {
    return '<option value="' + r.id + '"' + (c && c.red === r.id ? ' selected' : '') + '>' + escHtml(r.label) + '</option>'
  }).join('')

  document.getElementById('modal-cuenta').innerHTML =
    '<h2>' + (c ? 'Editar cuenta' : 'Nueva cuenta') + '</h2>' +
    '<p class="subtitle">De aquí salen las tarjetas de seguidores del Radar.</p>' +
    '<div class="form-row"><label>Red</label><select id="ct-red">' + ops + '</select></div>' +
    '<div class="form-row"><label>@usuario</label>' +
      '<input id="ct-handle" placeholder="@micuenta" value="' + escHtml(c ? (c.handle || '') : '') + '"></div>' +
    '<div class="form-row"><label>Nombre (opcional)</label>' +
      '<input id="ct-nombre" placeholder="Nombre visible" value="' + escHtml(c ? (c.nombre || '') : '') + '"></div>' +
    (c ? '<div class="form-row"><label><input type="checkbox" id="ct-activo"' + (c.activo ? ' checked' : '') +
         '> Activa (se mide al actualizar métricas)</label></div>' : '') +
    '<div class="modal-actions" style="justify-content:space-between">' +
      (c ? '<button class="btn-secondary" style="color:var(--red)" onclick="ajBorrarCuenta(\'' + escHtml(id) + '\')">Eliminar</button>' : '<span></span>') +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn-secondary" onclick="closeModal(\'modal-cuenta\')">Cancelar</button>' +
        '<button class="btn-primary" onclick="ajGuardarCuenta(\'' + escHtml(id || '') + '\')">' + (c ? 'Guardar' : 'Crear') + '</button>' +
      '</div>' +
    '</div>'
  openModal('modal-cuenta')
}

function ajGuardarCuenta(id) {
  var handle = document.getElementById('ct-handle').value.trim()
  if (!handle) { showToast('Escribe el @usuario', 'error'); return }

  var datos = {
    red: document.getElementById('ct-red').value,
    handle: handle,
    nombre: document.getElementById('ct-nombre').value.trim()
  }
  var activoEl = document.getElementById('ct-activo')
  if (activoEl) datos.activo = activoEl.checked

  var llamada = id ? api.updateCuenta(Object.assign({ id: id }, datos)) : api.addCuenta(datos)
  llamada.then(function(res) {
    if (!res || res.ok === false) { showToast((res && res.error) || 'No se pudo guardar', 'error'); return }
    store.setCuentas(res.cuentas)
    closeModal('modal-cuenta')
    renderAjustes()
    showToast(id ? 'Cuenta actualizada' : 'Cuenta creada')
  })
}

function ajBorrarCuenta(id) {
  var c = store.cuentaPorId(id)
  confirmModal('¿Eliminar ' + ((c && c.handle) || 'esta cuenta') + ' y todo su histórico de seguidores?', function() {
    api.deleteCuenta(id).then(function(res) {
      if (!res || res.ok === false) { showToast((res && res.error) || 'No se pudo eliminar', 'error'); return }
      store.setCuentas(res.cuentas)
      return api.listarMetricas().then(function(m) {
        if (m && m.ok) store.setMetricas(m.metricas)
        closeModal('modal-cuenta')
        renderAjustes()
        showToast('Cuenta eliminada')
      })
    })
  }, { peligro: true, ok: 'Eliminar' })
}

// ── Llaves ──
function ajBloqueLlaves(c) {
  return '<div class="ia-block"><h3 class="ia-h3">Llaves</h3>' +
    ajTarjetaLlave('apify',  'Apify',  'Scrapea los posts de los referentes.', c.apifyPuesta,  'https://console.apify.com/account/integrations') +
    ajTarjetaLlave('claude', 'Claude', 'Genera guion, caption, carrusel y video 10s.', c.claudePuesta, 'https://console.anthropic.com/settings/keys') +
    ajTarjetaLlave('openai', 'OpenAI', 'Transcribe el audio cuando el post no trae subtítulos (Instagram). También sirve de alternativa a Claude.', c.openaiPuesta, 'https://platform.openai.com/api-keys') +
  '</div>'
}

function ajTarjetaLlave(id, nombre, ayuda, puesta, urlAyuda) {
  var editando = _ajEditKey[id]
  var badge = puesta
    ? '<span class="ia-badge ia-badge--on">CONECTADO</span>'
    : '<span class="ia-badge ia-badge--off">SIN CONECTAR</span>'

  var pie = (puesta && !editando)
    ? '<span class="ia-key">•••• configurada</span>' +
      '<div class="ia-actions">' +
        '<button class="ia-btn-ghost" onclick="ajQuitarLlave(\'' + id + '\')">Quitar</button>' +
        '<button class="ia-btn-soft" onclick="ajCambiarLlave(\'' + id + '\')">Cambiar</button>' +
      '</div>'
    : '<input id="aj-key-' + id + '" class="ia-key-input" type="password" placeholder="Pegar llave" autocomplete="off">' +
      '<div class="ia-actions">' +
        (editando ? '<button class="ia-btn-ghost" onclick="ajCancelarLlave(\'' + id + '\')">Cancelar</button>' : '') +
        '<button class="btn-primary" onclick="ajConectarLlave(\'' + id + '\')">Conectar</button>' +
      '</div>'

  return '<div class="ia-card">' +
    '<div class="ia-card-top"><span class="ia-card-name">' + escHtml(nombre) + '</span>' + badge + '</div>' +
    '<p class="ia-card-help">' + escHtml(ayuda) +
      ' <a class="ia-link" href="' + escHtml(urlAyuda) + '" target="_blank" rel="noopener">Obtener llave ↗</a></p>' +
    '<div class="ia-card-foot">' + pie + '</div>' +
  '</div>'
}

var _AJ_CAMPO_LLAVE = { apify: 'apifyToken', claude: 'claudeKey', openai: 'openaiKey' }

function ajCambiarLlave(id)  { _ajEditKey[id] = true;  renderAjustes() }
function ajCancelarLlave(id) { _ajEditKey[id] = false; renderAjustes() }

function ajConectarLlave(id) {
  var val = (document.getElementById('aj-key-' + id) || {}).value || ''
  if (!val.trim()) { showToast('Pega la llave primero', 'error'); return }
  var payload = {}
  payload[_AJ_CAMPO_LLAVE[id]] = val.trim()
  ajGuardar(payload, '✓ Llave guardada', function() { _ajEditKey[id] = false })
}

function ajQuitarLlave(id) {
  confirmModal('¿Quitar esta llave?', function() {
    ajGuardar({ quitar: id }, 'Llave eliminada')
  }, { peligro: true, ok: 'Quitar' })
}

// ── Proveedor y modelo ──
function ajBloqueProveedor(c) {
  var ops = [{ id: 'claude', label: 'Claude (Anthropic)' }, { id: 'openai', label: 'OpenAI' }]
    .map(function(o) {
      return '<option value="' + o.id + '"' + (c.proveedor === o.id ? ' selected' : '') + '>' + escHtml(o.label) + '</option>'
    }).join('')

  return '<div class="ia-block"><h3 class="ia-h3">Motor de IA</h3>' +
    '<div class="form-grid">' +
      '<div class="form-row"><label>Proveedor</label><select id="aj-proveedor">' + ops + '</select></div>' +
      '<div class="form-row"><label>Modelo</label>' +
        '<input id="aj-modelo" value="' + escHtml(c.modelo || '') + '" placeholder="claude-sonnet-5-5"></div>' +
    '</div>' +
    '<p class="ia-suave">Si dejas el modelo vacío se usa el recomendado del proveedor.</p>' +
    '<div style="margin-top:10px"><button class="btn-primary" onclick="ajGuardarProveedor()">Guardar</button></div>' +
  '</div>'
}

function ajGuardarProveedor() {
  ajGuardar({
    proveedor: document.getElementById('aj-proveedor').value,
    modelo: document.getElementById('aj-modelo').value.trim()
  }, '✓ Guardado')
}

// ── Prompt central ──
function ajPromptCentral(c) {
  return '<div class="ia-block"><h3 class="ia-h3">Prompt central</h3>' +
    '<p class="ia-suave" style="margin-top:0">Manda sobre todo lo que se genera: tono, reglas y cómo quieres cada pieza. ' +
      'Si quieres carruseles de 5 láminas o captions sin emojis, escríbelo aquí.</p>' +
    '<div class="form-row"><label>Instrucciones</label>' +
      '<textarea id="aj-prompt-central" rows="10">' + escHtml(c.promptCentral || '') + '</textarea></div>' +
    '<div style="margin-top:10px"><button class="btn-primary" onclick="ajGuardarCentral()">Guardar</button></div>' +
  '</div>'
}

function ajGuardarCentral() {
  ajGuardar({ promptCentral: document.getElementById('aj-prompt-central').value }, '✓ Guardado — aplica desde la próxima generación')
}

// ── Voz de marca: tarjetas de ejemplos, igual que en el CRM ──
function _ajVozParse(v) {
  if (!v) return []
  try {
    var a = JSON.parse(v)
    if (Array.isArray(a)) return a
  } catch (e) { /* texto plano de una versión anterior */ }
  return [{ nombre: 'Voz de marca', texto: String(v) }]
}

function ajVozMarca(c) {
  var arr = _ajVozParse(c.vozMarca)
  var cards = arr.map(function(e, i) {
    var lineas = String(e.texto || '').split('\n').length
    return '<div class="ej-card" onclick="ajVerEjemplo(' + i + ')" title="Ver / editar">' +
      '<button class="ej-card-x" title="Quitar" onclick="event.stopPropagation(); ajQuitarEjemplo(' + i + ')">×</button>' +
      '<div class="ej-card-name">' + escHtml(e.nombre || 'Ejemplo') + '</div>' +
      '<div class="ej-card-meta">' + lineas + ' líneas</div>' +
      '<span class="ej-card-badge">TXT</span>' +
    '</div>'
  }).join('')

  return '<div class="ia-block"><h3 class="ia-h3">Voz de marca</h3>' +
    '<div class="ej-zone">' +
      '<div class="ej-zone-top"><span class="ej-zone-title">Ejemplos</span>' +
        '<label class="ej-add">+ Agregar<input type="file" accept=".docx,.txt,.md" multiple style="display:none" onchange="ajCargarEjemplo(this)"></label></div>' +
      (cards
        ? '<div class="ej-grid">' + cards + '</div>'
        : '<p class="ia-suave" style="margin:2px 0 0">Sube guiones o captions tuyos que funcionaron (.docx, .txt o .md). La IA imita ese estilo sin copiar los datos.</p>') +
    '</div>' +
  '</div>'
}

function _ajVozGuardar(arr) {
  ajGuardar({ vozMarca: JSON.stringify(arr) }, null)
}

function ajCargarEjemplo(inp) {
  var files = Array.prototype.slice.call(inp.files || [])
  if (!files.length) return
  var arr = _ajVozParse(store.cfg.vozMarca)
  var pendientes = files.length, agregados = 0

  function fin() {
    if (--pendientes > 0) return
    inp.value = ''
    if (agregados) {
      _ajVozGuardar(arr)
      showToast('✓ ' + agregados + (agregados === 1 ? ' ejemplo agregado' : ' ejemplos agregados'))
    }
  }

  files.forEach(function(f) {
    function listo(texto) {
      texto = String(texto || '').trim()
      if (texto) { arr.push({ nombre: f.name.replace(/\.(docx|txt|md)$/i, ''), texto: texto }); agregados++ }
      else showToast(f.name + ': vacío o no se pudo leer', 'error')
      fin()
    }
    if (/\.docx$/i.test(f.name)) {
      if (typeof mammoth === 'undefined') { showToast('No se pudo leer el .docx — recarga la página', 'error'); listo(''); return }
      f.arrayBuffer()
        .then(function(buf) { return mammoth.extractRawText({ arrayBuffer: buf }) })
        .then(function(r) { listo(r.value) })
        .catch(function() { listo('') })
    } else {
      f.text().then(listo).catch(function() { listo('') })
    }
  })
}

function ajQuitarEjemplo(i) {
  var arr = _ajVozParse(store.cfg.vozMarca)
  var nombre = (arr[i] || {}).nombre || 'este ejemplo'
  confirmModal('¿Quitar "' + nombre + '"?', function() {
    arr.splice(i, 1)
    _ajVozGuardar(arr)
    showToast('Ejemplo eliminado')
  }, { peligro: true, ok: 'Quitar' })
}

function ajVerEjemplo(i) {
  var arr = _ajVozParse(store.cfg.vozMarca)
  var e = arr[i]
  if (!e) return
  document.getElementById('modal-ejemplo').innerHTML =
    '<h2>' + escHtml(e.nombre || 'Ejemplo') + '</h2>' +
    '<p class="subtitle">La IA usa este texto como referencia de estilo.</p>' +
    '<textarea id="aj-ej-texto" rows="16" style="width:100%;box-sizing:border-box">' + escHtml(e.texto || '') + '</textarea>' +
    '<div class="modal-actions">' +
      '<button class="btn-secondary" onclick="closeModal(\'modal-ejemplo\')">Cerrar</button>' +
      '<button class="btn-primary" onclick="ajGuardarEjemplo(' + i + ')">Guardar cambios</button>' +
    '</div>'
  openModal('modal-ejemplo')
}

function ajGuardarEjemplo(i) {
  var arr = _ajVozParse(store.cfg.vozMarca)
  if (!arr[i]) return
  arr[i].texto = document.getElementById('aj-ej-texto').value || ''
  _ajVozGuardar(arr)
  closeModal('modal-ejemplo')
  showToast('✓ Ejemplo actualizado')
}

// ── Guardado común: el backend siempre devuelve la config completa ──
function ajGuardar(payload, aviso, antes) {
  api.saveConfig(payload).then(function(res) {
    if (!res || res.ok === false) { showToast((res && res.error) || 'No se pudo guardar', 'error'); return }
    if (antes) antes()
    store.cfg = res
    renderAjustes()
    if (aviso) showToast(aviso)
  })
}
