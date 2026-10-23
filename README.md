# Umbral — relatos de lo inexplicable

Sitio estático en español para GitHub Pages, conectado a Supabase.

## Archivos
- `index.html`: portada.
- `historias.html`: biblioteca y filtros.
- `historia.html`: lectura individual.
- `enviar.html`: envío anónimo de relatos.
- `cuenta.html`: registro e inicio de sesión.
- `admin.html`: moderación para usuarios autorizados.
- `videos.html`: integración de YouTube.
- `normas.html`, `privacidad.html`: páginas informativas.
- `styles.css`, `app.js`, `config.js`: diseño, lógica y configuración.
- `schema.sql`: SQL de referencia para revisar la estructura existente.

## Publicar
1. Sube todos los archivos de esta carpeta a la raíz de tu repositorio GitHub (rama `main`).
2. En Settings → Pages, elige Deploy from a branch, `main`, `/(root)`.
3. Espera a que GitHub Pages termine el despliegue y recarga el sitio.

## Supabase
`config.js` contiene una publishable key para el frontend. Nunca publiques una clave `sb_secret_` ni `service_role`.
El sitio depende de las tablas `stories` y `admin_users` y de las políticas RLS existentes. No ejecutes un SQL destructivo sin revisar primero el esquema actual.

### Importante sobre administración
La página `admin.html` no crea administradores. El usuario debe estar autorizado previamente en `public.admin_users`. No agregues credenciales de administrador al JavaScript público.

### Pruebas antes de anunciar la web
- Enviar un relato de prueba con más de 80 caracteres y consentimiento marcado.
- Confirmar en Supabase que queda en estado `pending`.
- Autorizar una cuenta administradora de forma segura y probar moderación.
- Publicar un relato de prueba y confirmar que aparece en la biblioteca.
- Revisar las páginas en móvil y escritorio.
