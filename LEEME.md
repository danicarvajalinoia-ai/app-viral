# App Marketing · Radar de Referentes

## Estructura

| Carpeta | Qué es | ¿Se publica? |
|---|---|---|
| `web/` | La app (HTML, CSS, JS) | **Sí** — esto es lo que va a Netlify |
| `apps-script/` | El backend que se pega en la hoja del cliente | **No** |
| `INSTALACION.md` | Guía para entregar una copia | **No** |

`apps-script/` e `INSTALACION.md` se quedan fuera del sitio a propósito: son el
producto que vendes. Si se publicaran, cualquiera podría descargarlos desde la
URL del sitio.

## Publicar en Netlify

**Arrastra la carpeta `web`**, no la carpeta de arriba.

Si en vez de arrastrar conectas un repositorio de Git, el `netlify.toml` ya deja
configurado que solo se publique `web/`.

## Antes de publicar

Revisa que `web/js/config.js` tenga la `BACKEND_URL` del cliente. Si está vacía,
la app arranca en **modo demo**: datos de ejemplo, sin scraping ni IA.

Ese modo demo es útil a propósito — sirve para mostrarle la app a un comprador
antes de venderle.
