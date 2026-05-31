# CineNova

CineNova es una aplicación web estática tipo catálogo de streaming. Usa TMDb para obtener información de películas y series, y guarda perfiles, favoritos y continuidad en `localStorage` del navegador.

## Cómo ejecutarlo localmente

No requiere `npm` ni instalación de dependencias.

```bash
python -m http.server 8000
```

Luego abre:

```text
http://localhost:8000
```

También puedes usar la extensión **Live Server** de Visual Studio Code.

## Archivos principales

| Archivo | Función |
|---|---|
| `index.html` | Interfaz, estilos y lógica principal de la app. |
| `manifest.json` | Configuración PWA para instalar la app. |
| `sw.js` | Service Worker con caché básico de archivos estáticos. |
| `icon.png` | Ícono limpio usado por la PWA. |

## Mejoras aplicadas en esta versión

- Se corrigió la persistencia del perfil activo para usar `localStorage` de forma consistente.
- Se agregó `icon.png` y se corrigió el `manifest.json` para evitar problemas con nombres de archivo con espacios o caracteres especiales.
- Se mejoró el Service Worker con caché básico para archivos estáticos.
- Se creó un helper `fetchTMDB()` para centralizar las llamadas a TMDb y manejar errores HTTP.
- Se agregaron toasts visuales para mensajes de usuario en vez de usar solo `alert()`.
- Se deshabilitó visualmente el botón de descarga, aclarando que la app no almacena archivos propios.
- Se agregó sanitización básica de textos insertados con `innerHTML` para reducir riesgos de HTML no deseado.
- Se mejoraron estados vacíos y mensajes de error en búsqueda, carruseles y géneros.
- Se agregó cierre del modal con la tecla `Escape`.
- Se añadió documentación básica del proyecto.

## Importante

La app depende de servicios externos. TMDb entrega metadatos, imágenes y datos de catálogo. El reproductor usado por iframe es externo. Esta plantilla no incluye backend, usuarios reales ni almacenamiento propio de videos.

Antes de publicar una versión pública, revisa el origen del reproductor y asegúrate de usar fuentes autorizadas para el contenido audiovisual.
