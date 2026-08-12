// ============================================================
// Helpers compartidos: íconos, formato, modales y toasts.
// Recorte del utils.js del CRM con solo lo que esta app usa.
// ============================================================

var ICON_PATHS = {
  trash:    '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  copy:     '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  link:     '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  plus:     '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  refresh:  '<path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/>',
  eye:      '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  play:     '<polygon points="5 3 19 12 5 21 5 3"/>',
  heart:    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8Z"/>',
  message:  '<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
  radar:    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  sparkles: '<path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9Z"/><path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9Z"/>'
}

function icon(name, size) {
  size = size || 16
  return '<svg class="ic ic-' + name + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON_PATHS[name] || '') + '</svg>'
}

// Logo de marca de la red (mismo del CRM). Cae a un punto gris si no reconoce.
function redIcon(red, size) {
  size = size || 18
  var svg
  if (red === 'instagram') {
    svg = '<defs><radialGradient id="igg" cx="30%" cy="107%" r="135%">' +
        '<stop offset="0%" stop-color="#fdf497"/><stop offset="8%" stop-color="#fdf497"/>' +
        '<stop offset="45%" stop-color="#fd5949"/><stop offset="62%" stop-color="#d6249f"/>' +
        '<stop offset="100%" stop-color="#285AEB"/></radialGradient></defs>' +
      '<rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="url(#igg)"/>' +
      '<rect x="5" y="5" width="14" height="14" rx="4.5" fill="none" stroke="#fff" stroke-width="1.7"/>' +
      '<circle cx="12" cy="12" r="3.6" fill="none" stroke="#fff" stroke-width="1.7"/>' +
      '<circle cx="17.1" cy="6.9" r="1.15" fill="#fff"/>'
  } else if (red === 'tiktok') {
    svg = '<circle cx="12" cy="12" r="11" fill="#000"/>' +
      '<path d="M16.2 6c.4 1.1 1.3 2 2.5 2.2v2.3c-1.1 0-2.2-.4-3.1-1v4.4a4.6 4.6 0 1 1-4.6-4.6c.25 0 .49.02.72.06v2.4a2.25 2.25 0 1 0 1.55 2.14V5.2h2.3c0 .27.03.54.08.8z" fill="#fff"/>'
  } else if (red === 'youtube') {
    svg = '<rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#FF0000"/>' +
      '<path d="M10 8.6l6.2 3.4L10 15.4z" fill="#fff"/>'
  } else {
    return '<span class="rf-dot"></span>'
  }
  return '<svg class="rf-brand" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true">' + svg + '</svg>'
}

function escHtml(str) {
  return String(str === null || str === undefined ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// 876600 → "876.6K"
function fmtCompact(n) {
  n = Number(n) || 0
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

function formatDate(str) {
  if (!str) return '—'
  var d = new Date(str)
  if (isNaN(d)) return String(str)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Solo deja pasar enlaces http/https: neutraliza javascript: y data:.
function safeUrl(url) {
  url = String(url || '').trim()
  return /^https?:\/\//i.test(url) ? url : ''
}

function showToast(msg, type) {
  var el = document.createElement('div')
  el.className = 'toast ' + (type || 'success')
  el.textContent = msg
  document.getElementById('toast-container').appendChild(el)
  setTimeout(function() { el.remove() }, 4000)
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden')
  var b = document.getElementById('modal-backdrop')
  b.classList.remove('hidden')
  b.onclick = function() { closeModal(id) }
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden')
  document.getElementById('modal-backdrop').classList.add('hidden')
}

function confirmModal(mensaje, onYes, opts) {
  opts = opts || {}
  document.getElementById('modal-confirm').innerHTML =
    '<h2>' + escHtml(opts.titulo || 'Confirmar') + '</h2>' +
    '<p class="subtitle" style="margin-bottom:20px">' + escHtml(mensaje) + '</p>' +
    '<div class="modal-actions">' +
      '<button class="btn-secondary" onclick="closeModal(\'modal-confirm\')">Cancelar</button>' +
      '<button class="btn-primary" id="confirm-yes"' + (opts.peligro ? ' style="background:var(--red)"' : '') + '>' +
        escHtml(opts.ok || 'Sí, continuar') + '</button>' +
    '</div>'
  openModal('modal-confirm')
  document.getElementById('confirm-yes').onclick = function() { closeModal('modal-confirm'); onYes() }
}

// Copia texto al portapapeles, con respaldo para navegadores viejos.
function copiarTexto(txt, aviso) {
  function ok() { showToast(aviso || '✓ Copiado') }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(ok).catch(function() { copiaManual_(txt, ok) })
  } else {
    copiaManual_(txt, ok)
  }
}
function copiaManual_(txt, ok) {
  var ta = document.createElement('textarea')
  ta.value = txt
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy'); ok() } catch (e) { showToast('No se pudo copiar', 'error') }
  ta.remove()
}
