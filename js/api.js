// ==========================================================================
// frontend/js/api.js - Módulo centralizado de comunicación con el backend
// ==========================================================================
// Todas las llamadas fetch() al backend pasan por aquí.
// Esto centraliza el manejo de errores, cabeceras y la URL base.
//
// Si una operación de escritura falla por red, se encola automáticamente
// en localStorage para sincronizarla cuando vuelva la conexión.
//
// Funciones disponibles:
//   apiGet(ruta)           → GET  /api/ruta
//   apiPost(ruta, datos)   → POST /api/ruta  con JSON body
//   apiPut(ruta, datos)    → PUT  /api/ruta  con JSON body
//   apiDelete(ruta)        → DELETE /api/ruta
//   apiRequest(ruta, m, d) → Petición genérica (PATCH, etc.)
// ==========================================================================

/**
 * Realiza una petición GET al backend.
 * Las lecturas NO se encolan (no tiene sentido leer datos offline).
 *
 * Parámetros:
 *   ruta (string): Ruta relativa al API_BASE_URL (ej: '/clientes')
 *
 * Retorna:
 *   Object: Respuesta JSON del servidor {ok, data, mensaje/error}
 */
async function apiGet(ruta) {
    try {
        const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        // Parseamos la respuesta como JSON
        const datos = await respuesta.json();
        return datos;

    } catch (error) {
        // Error de red (servidor no disponible, sin conexión, etc.)
        console.error(`Error en GET ${ruta}:`, error);
        return {
            ok: false,
            error: 'No se pudo conectar con el servidor. ¿Está encendido el backend?'
        };
    }
}


/**
 * Realiza una petición POST al backend con datos JSON.
 * Si falla por red, encola la operación para sincronizar después.
 *
 * Parámetros:
 *   ruta (string): Ruta relativa al API_BASE_URL
 *   datos (Object): Objeto JavaScript que se enviará como JSON
 *
 * Retorna:
 *   Object: Respuesta JSON del servidor
 */
async function apiPost(ruta, datos) {
    try {
        const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();
        return resultado;

    } catch (error) {
        console.error(`Error en POST ${ruta}:`, error);

        // Encolar para sincronización offline
        if (typeof agregarACola === 'function') {
            agregarACola('POST', ruta, datos);
            return {
                ok: true,
                offline: true,
                mensaje: '⏳ Guardado offline. Se sincronizará cuando vuelva la conexión.'
            };
        }

        return {
            ok: false,
            error: 'No se pudo conectar con el servidor. ¿Está encendido el backend?'
        };
    }
}


/**
 * Realiza una petición PUT al backend con datos JSON.
 * Si falla por red, encola la operación para sincronizar después.
 *
 * Parámetros:
 *   ruta (string): Ruta relativa al API_BASE_URL
 *   datos (Object): Objeto JavaScript que se enviará como JSON
 *
 * Retorna:
 *   Object: Respuesta JSON del servidor
 */
async function apiPut(ruta, datos) {
    try {
        const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();
        return resultado;

    } catch (error) {
        console.error(`Error en PUT ${ruta}:`, error);

        // Encolar para sincronización offline
        if (typeof agregarACola === 'function') {
            agregarACola('PUT', ruta, datos);
            return {
                ok: true,
                offline: true,
                mensaje: '⏳ Guardado offline. Se sincronizará cuando vuelva la conexión.'
            };
        }

        return {
            ok: false,
            error: 'No se pudo conectar con el servidor. ¿Está encendido el backend?'
        };
    }
}


/**
 * Realiza una petición DELETE al backend.
 * Si falla por red, encola la operación para sincronizar después.
 *
 * Parámetros:
 *   ruta (string): Ruta relativa al API_BASE_URL
 *
 * Retorna:
 *   Object: Respuesta JSON del servidor
 */
async function apiDelete(ruta) {
    try {
        const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        });

        const resultado = await respuesta.json();
        return resultado;

    } catch (error) {
        console.error(`Error en DELETE ${ruta}:`, error);

        // Encolar para sincronización offline
        if (typeof agregarACola === 'function') {
            agregarACola('DELETE', ruta, null);
            return {
                ok: true,
                offline: true,
                mensaje: '⏳ Eliminación encolada. Se sincronizará cuando vuelva la conexión.'
            };
        }

        return {
            ok: false,
            error: 'No se pudo conectar con el servidor. ¿Está encendido el backend?'
        };
    }
}


/**
 * Realiza una petición genérica al backend (para métodos como PATCH).
 * Si falla por red, encola la operación para sincronizar después.
 *
 * Parámetros:
 *   ruta (string): Ruta relativa al API_BASE_URL
 *   metodo (string): Método HTTP (GET, POST, PUT, PATCH, DELETE)
 *   datos (Object, opcional): Datos a enviar como JSON
 *
 * Retorna:
 *   Object: Respuesta JSON del servidor
 */
async function apiRequest(ruta, metodo, datos = null) {
    try {
        const opciones = {
            method: metodo,
            headers: {
                'Accept': 'application/json'
            }
        };

        // Si hay datos, los enviamos como JSON en el body
        if (datos !== null) {
            opciones.headers['Content-Type'] = 'application/json';
            opciones.body = JSON.stringify(datos);
        }

        const respuesta = await fetch(`${API_BASE_URL}${ruta}`, opciones);
        const resultado = await respuesta.json();
        return resultado;

    } catch (error) {
        console.error(`Error en ${metodo} ${ruta}:`, error);

        // Solo encolamos métodos de escritura (no GET)
        if (metodo !== 'GET' && typeof agregarACola === 'function') {
            agregarACola(metodo, ruta, datos);
            return {
                ok: true,
                offline: true,
                mensaje: '⏳ Operación encolada. Se sincronizará cuando vuelva la conexión.'
            };
        }

        return {
            ok: false,
            error: 'No se pudo conectar con el servidor. ¿Está encendido el backend?'
        };
    }
}
