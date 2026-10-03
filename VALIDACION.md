# Comprobación de la entrega

Fecha: 3 de octubre de 2026.

Se completaron **19 comprobaciones funcionales** con Playwright en Chromium, sin errores de JavaScript. Los casos usaron respuestas controladas para reproducir fallos y condiciones específicas; las vistas previas usan una instantánea real del catálogo y las imágenes de TMDB obtenida durante esta tarea.

| Área | Resultado |
| --- | --- |
| Inicio y destacados | Secciones, selección manual y enlaces correctos. |
| Sincronización | Actualizar la biblioteca en otra pestaña mantiene el video del mismo perfil. |
| Datos existentes | Migración de perfiles, listas, historial y progreso; renombrar conserva la biblioteca. |
| Favoritos | Película y serie con el mismo ID siguen separadas; funciona Deshacer, incluso dentro de la ficha. |
| Catálogo | Géneros de películas y series, orden, paginación y recuperación de errores. |
| Búsqueda | Consulta posterior prevalece, estado vacío y retorno a la vista anterior. |
| Fichas | Sinopsis expandible, enlaces directos, apertura y cierre con teclado. |
| Reproductor | URL y carga del iframe, limpieza al cerrar, selección de episodios y respaldo de pantalla completa. |
| Progreso | Se ignoran reproducciones breves y se retiran títulos completados del historial. |
| Perfiles | Creación, validación de nombres, aislamiento de listas y eliminación con confirmación. |
| Diseño adaptable | Sin desbordamiento de página en 320, 390, 768, 1024, 1440 y 1920 px. |
| Accesibilidad | Sin infracciones detectadas por axe en inicio y ficha para las reglas WCAG A/AA y 2.1 AA ejecutadas. |
| Sin conexión | El service worker permite recargar la aplicación y mostrar la lista guardada. |
| Estructura | JavaScript válido, 99 IDs HTML únicos, referencias al DOM verificadas y sin eventos HTML inline. |

Las pruebas de reproducción usaron un iframe controlado: **no certifican la disponibilidad ni la reproducción real del proveedor externo**. Tampoco reemplazan una evaluación manual integral de accesibilidad ni pruebas en dispositivos físicos con Safari o Android. Los permisos y la reproducción deben comprobarse en los navegadores de uso final.
