// ============================================================
// STORE — estado en memoria.
// ============================================================
// La hoja se lee COMPLETA una sola vez al abrir la app. Después todo se
// filtra y ordena en memoria, y los cambios se guardan de a uno. Es lo que
// evita que la app se sienta lenta, porque cada ida y vuelta al Apps Script
// cuesta uno o dos segundos.
// ============================================================

var store = {
  filas: [],      // referentes analizados
  cuentas: [],    // mis cuentas de redes
  metricas: [],   // histórico de seguidores
  cfg: null,

  _subs: {},

  on: function(evento, fn) {
    (this._subs[evento] = this._subs[evento] || []).push(fn)
  },
  emit: function(evento, dato) {
    (this._subs[evento] || []).forEach(function(fn) { fn(dato) })
  },

  set: function(filas) {
    this.filas = filas || []
    this.emit('change:filas', this.filas)
  },

  porId: function(id) {
    return this.filas.find(function(f) { return String(f.id) === String(id) }) || null
  },

  // Reemplaza una fila con lo que devolvió el backend (fuente de verdad).
  reemplazar: function(fila) {
    if (!fila) return
    var i = this.filas.findIndex(function(f) { return String(f.id) === String(fila.id) })
    if (i >= 0) this.filas[i] = fila
    else this.filas.unshift(fila)
    this.emit('change:filas', this.filas)
  },

  quitar: function(id) {
    this.filas = this.filas.filter(function(f) { return String(f.id) !== String(id) })
    this.emit('change:filas', this.filas)
  },

  setCuentas: function(cuentas) {
    this.cuentas = cuentas || []
    this.emit('change:cuentas', this.cuentas)
  },
  setMetricas: function(metricas) {
    this.metricas = metricas || []
    this.emit('change:metricas', this.metricas)
  },
  cuentaPorId: function(id) {
    return this.cuentas.find(function(c) { return String(c.id) === String(id) }) || null
  },

  // Última y penúltima medición de una cuenta (seguidores + variación).
  ultimaMetrica: function(cuentaId) {
    var ms = this.metricas.filter(function(m) { return String(m.cuenta_id) === String(cuentaId) })
      .sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha) })
    return { actual: ms[0] || null, previa: ms[1] || null }
  },

  // Seguidores por red: suma de la última medición de cada cuenta de esa red.
  seguidoresPorRed: function(red) {
    var self = this, total = 0, prev = 0
    this.cuentas.filter(function(c) { return c.red === red }).forEach(function(c) {
      var m = self.ultimaMetrica(c.id)
      if (m.actual) total += Number(m.actual.seguidores) || 0
      if (m.previa) prev += Number(m.previa.seguidores) || 0
    })
    return { total: total, previa: prev }
  },

  // Totales de los referentes analizados.
  resumen: function() {
    var t = { total: this.filas.length, views: 0, likes: 0, comentarios: 0, publicados: 0 }
    this.filas.forEach(function(f) {
      t.views += Number(f.views) || 0
      t.likes += Number(f.likes) || 0
      t.comentarios += Number(f.comentarios) || 0
      if (f.estado === 'Publicado') t.publicados++
    })
    return t
  }
}
