# ==============================================================================
# DOCKERFILE - Frontend (nginx + archivos estáticos)
# ==============================================================================
# Construye una imagen ligera de nginx que sirve el frontend SPA
# y actúa como proxy inverso hacia el backend para las peticiones /api/*.
# ==============================================================================

FROM nginx:alpine

LABEL maintainer="Javier Aranguren"
LABEL description="Frontend SPA - nginx + proxy inverso"
LABEL version="2.0"

# Copiar archivos del frontend
COPY frontend/ /usr/share/nginx/html/

# En Docker, usamos config.docker.js como config.js
# Esto cambia API_BASE_URL de "http://localhost:5000/api" a "/api"
# porque nginx hace proxy inverso y no necesitamos CORS
COPY frontend/js/config.docker.js /usr/share/nginx/html/js/config.js

# Copiar configuración de nginx (proxy inverso para /api)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
