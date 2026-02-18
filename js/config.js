// ==========================================================================
// frontend/js/config.netlify.js - Configuración para Netlify (100% offline)
// ==========================================================================
// En Netlify no hay backend — TODAS las operaciones van a localStorage.
// API_BASE_URL apunta a una URL que no existe, así todas las peticiones
// fallan por red y se encolan automáticamente en sync.js.
//
// Instrucciones:
//   1. Subir la carpeta frontend/ a GitHub
//   2. En Netlify, renombrar este archivo a config.js
//   3. O copiar su contenido sobre config.js antes de subir
// ==========================================================================

// URL inexistente a propósito → todas las peticiones fallan
// → api.js las encola en localStorage via agregarACola()
const API_BASE_URL = 'http://offline-no-backend/api';
