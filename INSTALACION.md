# Radar de Referentes — guía de instalación

Esta guía es para **entregar una copia**. Toma unos 10 minutos por cliente.

Cada copia es independiente: su propia hoja, su propio backend, sus propias
llaves. Ni tú ni los demás compradores ven sus datos.

---

## Qué recibe el cliente

| Pieza | Qué es | Dónde vive |
|---|---|---|
| **La hoja** | El Google Sheet con sus columnas | Drive del cliente |
| **El backend** | `Backend.gs`, publicado como App Web | Cuenta Google del cliente |
| **La app** | Esta carpeta, en Netlify | Netlify (tuyo o del cliente) |

---

## Paso 1 · La hoja

1. Abre la hoja plantilla y haz **Archivo → Hacer una copia**.
2. Pásale la copia al cliente, o créala directamente en su cuenta.

La hoja debe tener estas columnas en la **fila 1**:

```
Referente | Views | Likes | Comentarios | #hashtag | # de Post |
Fecha de publicación | País | Plataforma | (vacía) | Tema |
Transcripción | Traducción | Copy / Guion | Caption | Carrusel |
Videos 10s | Pieza / Video | Estado
```

Notas:

- El orden **no importa**: el backend busca cada columna por su nombre. Si mueves
  una de lugar o agregas otra, todo sigue funcionando.
- La columna sin título entre `Plataforma` y `Tema` se respeta y se deja en blanco.
- La primera vez que la app lea la hoja, **agrega solas dos columnas al final**:
  `Caption original` (el texto que publicó el referente) e `ID` (la que permite
  editar una fila sin equivocarse si alguien reordena o borra filas a mano).
  No las borres.
- Si la hoja está vacía, el backend escribe los encabezados solo.

La app también crea sola, la primera vez que se usan, **dos pestañas más**:

| Pestaña | Para qué |
|---|---|
| `Cuentas_RS` | Tus cuentas propias (red, @usuario, nombre, activa) |
| `Metricas_RS` | Una fila por medición de seguidores — de ahí sale la variación |

No hay que crearlas ni configurarlas a mano.

---

## Paso 2 · El backend

1. En la hoja: **Extensiones → Apps Script**.
2. Borra lo que haya y pega **todo** el contenido de `apps-script/Backend.gs`.
3. Guarda (💾).
4. **Implementar → Nueva implementación**.
5. Engranaje ⚙️ → **Aplicación web**.
6. Configura así:
   - **Ejecutar como:** Yo (el dueño de la hoja)
   - **Quién tiene acceso:** **Cualquier usuario**
7. **Implementar**. Google pide autorización la primera vez: **Permitir**.
   Si aparece "Google no ha verificado esta aplicación", entra por
   *Configuración avanzada → Ir a (nombre del proyecto)*. Es normal: el script
   es del propio cliente, no de un tercero.
8. Copia la **URL de la aplicación web**. Termina en `/exec`.

> **Sobre "Cualquier usuario":** el frontend vive en Netlify y Google no permite
> su login entre dominios distintos, así que el App Web tiene que estar abierto.
> Por eso la app se protege con su propia clave de acceso (paso 4). Sin esa clave,
> quien llegue a la URL no puede leer ni escribir nada.

---

## Paso 3 · La app en Netlify

1. Abre `js/config.js` y pega la URL del paso 2:

   ```js
   BACKEND_URL: 'https://script.google.com/macros/s/AKfy…/exec',
   ```

2. Sube la carpeta a Netlify (arrastrarla a **Sites → Add new site → Deploy manually**
   es suficiente; no necesita build).
3. Entrégale la URL al cliente.

Cada cliente necesita **su propio sitio de Netlify**, porque `config.js` apunta a
su backend. En el plan gratuito puedes tener varios sitios sin costo.

---

## Paso 4 · Primera entrada

1. El cliente abre la URL. Como el script todavía no tiene clave, la app le pide
   **crear una**. Esa clave queda guardada en su Apps Script.
2. Entra a **Ajustes** y pega sus llaves:
   - **Apify** — https://console.apify.com/account/integrations
   - **Claude** — https://console.anthropic.com/settings/keys
   - **OpenAI**: https://platform.openai.com/api-keys
     Es la que transcribe el audio cuando el post no trae subtítulos (casi
     todo Instagram). Sin ella, esos posts quedan sin transcripción. También
     sirve como alternativa a Claude para generar los textos.
3. En **Prompt central** ajusta el tono de su marca, y en **Voz de marca** sube
   guiones o captions suyos que ya funcionaron (`.docx`, `.txt` o `.md`).

Las llaves se guardan en las Propiedades del Apps Script. **Nunca llegan al
navegador**: la app solo pregunta si están puestas o no.

---

## Cómo se usa

1. Pega el enlace de un post de Instagram, TikTok o YouTube.
2. **Analizar**. Apify trae views, likes, comentarios, hashtags, fecha,
   plataforma y transcripción. La IA devuelve Tema, Traducción, Copy/Guion,
   Caption, Carrusel y Videos 10s.
3. Todo cae como una fila en la hoja. Se puede editar desde la app y volver a
   generar con **Regenerar**.

---

## Problemas frecuentes

**"No hay conexión con el backend"**
La `BACKEND_URL` está mal o la implementación no quedó como *Cualquier usuario*.
Vuelve al paso 2 y crea una **implementación nueva** (editar una existente no
siempre actualiza el código publicado).

**Cambié el `Backend.gs` y la app sigue igual**
Apps Script sirve la última **implementación**, no el último guardado. Ve a
**Implementar → Administrar implementaciones → ✏️ → Versión: Nueva**.

**"Sin transcripción"**
YouTube casi siempre trae subtítulos, TikTok a veces, **Instagram nunca**.
Cuando no vienen, el backend descarga el video y transcribe el audio con
OpenAI, así que revisa que esa llave esté puesta en Ajustes. Si aun así falla
(video de más de 25 MB, sin voz, o el enlace del video vencido), el motivo
queda en Apps Script → **Ejecuciones**. En ese caso abre la fila, pega la
transcripción a mano y usa **Regenerar**.

**Apify responde 401 o 403**
El token está mal, o la cuenta se quedó sin saldo.

**Apify responde pero sin datos**
El post es privado, fue borrado, o el actor cambió de formato. En
**Ajustes → Actores de Apify** se puede cambiar por otro del store de Apify.

**La IA no devuelve un JSON válido**
Suele ser un prompt central que pide otro formato. Los prompts por pieza
describen *qué* generar; el formato JSON lo pone el backend y no hay que tocarlo.

**Todo se volvió lento**
Es la hoja de cálculo: cada acción cuesta entre 1 y 3 segundos. La app carga
todo de una sola vez al abrir para que solo se note al analizar y al guardar.
Por encima de unas 2.000 filas conviene archivar las viejas en otra pestaña.

---

## Actualizar una copia ya entregada

- **Cambió el frontend:** vuelve a subir la carpeta a Netlify (con su
  `BACKEND_URL` correcta).
- **Cambió el backend:** pega el nuevo `Backend.gs` y crea una **implementación
  nueva** en la hoja de ese cliente.

Cada copia se actualiza por separado. Es el costo de que sean independientes.
