# Umbral — comunidad de historias de terror

Sitio estático para GitHub Pages + Supabase: biblioteca, envío anónimo o con cuenta, panel de moderación, likes por cuenta y videos de YouTube integrados.

## Configuración de Supabase
1. Crea un proyecto en https://supabase.com/dashboard.
2. Abre SQL Editor y ejecuta todo `database/schema.sql`.
3. En Project Settings → API, copia Project URL y la publishable key (o anon key legacy).
4. Pega esos dos valores en `assets/js/config.js`. Nunca uses `service_role` ni una secret key en el navegador.
5. En Authentication → URL Configuration, añade la URL final de GitHub Pages a Site URL y Redirect URLs.

## Convertirte en administrador
1. Publica el sitio y crea una cuenta en `cuenta.html`.
2. En SQL Editor ejecuta `select id,email from auth.users where email='TU_CORREO';`.
3. Copia tu UUID y ejecuta `insert into public.admin_users(user_id) values ('UUID_COPIADO');`.
4. Inicia sesión y abre `admin.html`. La autorización se valida en la base de datos.

## Publicar en GitHub Pages
1. Extrae el ZIP y sube el CONTENIDO de esta carpeta a la raíz del repositorio: `index.html` debe quedar en la raíz.
2. El workflow `.github/workflows/pages.yml` despliega automáticamente al hacer push a `main`. En GitHub → Settings → Pages selecciona GitHub Actions como Build and deployment source si te lo solicita.
3. Espera a que el workflow termine y copia la URL publicada.
4. Añade esa URL a Supabase Auth → URL Configuration.

## Añadir videos de YouTube
En SQL Editor, una vez configurada la base de datos:
```sql
insert into public.videos(title,description,youtube_url,is_published)
values ('Título de la narración','Descripción breve','https://www.youtube.com/watch?v=VIDEO_ID',true);
```

## Cómo funciona
- Envíos anónimos y con cuenta se guardan como `pending` y no se muestran públicamente.
- Usuarios con cuenta pueden consultar sus propios envíos asociados a su UUID.
- Solo IDs incluidos en `admin_users` pueden cambiar el estado por `moderate_story`.
- Solo historias `published` y videos `is_published=true` aparecen en las secciones públicas.
- Likes requieren sesión y cada cuenta solo puede votar una vez por historia/video.

## Antes de abrir al público
La inserción anónima tiene validaciones SQL y un campo honeypot, pero NO es protección antispam completa. Para una campaña pública, se recomienda mover el envío a una Supabase Edge Function con Cloudflare Turnstile y rate limiting. No publiques nunca la clave `service_role`.
`privacidad.html` es un borrador: completa el responsable, correo, retención y requisitos legales aplicables. Prueba el flujo completo en móvil y escritorio antes de anunciar el sitio.
