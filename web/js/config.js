// ============================================================
// CONFIGURACIÓN
// ============================================================
// Normalmente NO hay que tocar nada aquí: la app le pide la URL del Apps
// Script al usuario la primera vez y la recuerda en su navegador. Por eso un
// solo sitio publicado le sirve a todos los compradores — cada uno conecta su
// propia hoja desde la misma app.
// ============================================================

var CONFIG = {
  // Déjalo vacío para que la app pregunte. Llénalo solo si quieres una copia
  // amarrada a una hoja fija, donde el usuario no pueda cambiarla.
  BACKEND_URL: '',   // ej: 'https://script.google.com/macros/s/AKfy.../exec'

  ESTADOS: [
    { id: 'Pendiente',     color: '#6366f1' },
    { id: 'En producción', color: '#f59e0b' },
    { id: 'Grabado',       color: '#8b5cf6' },
    { id: 'Editado',       color: '#06b6d4' },
    { id: 'Publicado',     color: '#10b981' },
    { id: 'Descartado',    color: '#6b7280' }
  ],

  PLATAFORMAS: [
    { id: 'Instagram', red: 'instagram' },
    { id: 'TikTok',    red: 'tiktok' },
    { id: 'YouTube',   red: 'youtube' }
  ],

  // Redes en las que puedes tener cuentas propias.
  REDES: [
    { id: 'instagram', label: 'Instagram' },
    { id: 'tiktok',    label: 'TikTok' },
    { id: 'youtube',   label: 'YouTube' }
  ]
}

function estadoInfo(id) {
  return (CONFIG.ESTADOS || []).find(function(e) { return e.id === id }) ||
    { id: id || 'Pendiente', color: '#6b7280' }
}

// 'Instagram' → 'instagram', para elegir el logo.
function redDePlataforma(plataforma) {
  var p = (CONFIG.PLATAFORMAS || []).find(function(x) {
    return String(x.id).toLowerCase() === String(plataforma || '').toLowerCase()
  })
  return p ? p.red : ''
}
