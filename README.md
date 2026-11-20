# MentAtlas

El contenido publicado se edita desde Pages CMS. Cada país tiene su archivo en content/countries. La portada, metodología, referencias y visibilidad del editor están en content/site.json. Los porcentajes de partida y las series generadas son ilustrativos. Registra los datos documentados indicando fuente, año y población.

## Publicación

En GitHub, selecciona Settings → Pages → Source → GitHub Actions. El flujo pages.yml compila y publica cada cambio de main. En Pages CMS inicia sesión, instala o autoriza su aplicación para LeirBaGMC/PageLove, selecciona main e invita a los editores. El sitio enlaza al editor desde Administración.

Para la exposición, desactiva Mostrar acceso a Administración en el formulario de portada. Retira también los permisos de colaboradores en Pages CMS y de escritura en GitHub si quieres impedir ediciones directas. Los cambios pasan al sitio después del despliegue. Para desarrollo local usa npm ci y npm run dev.
