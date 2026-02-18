// ==========================================================================
// frontend/js/sync.js - Sistema de sincronización offline
// ==========================================================================
// Gestiona una cola de operaciones fallidas en localStorage.
// Cuando el backend vuelve a estar disponible, replaya las operaciones
// pendientes automáticamente.
//
// Funciones principales:
//   agregarACola(metodo, ruta, datos) → Guarda operación pendiente
//   sincronizarCola()                 → Envía cola al backend
//   verificarConexion()               → Comprueba si el backend responde
//   actualizarIndicadorSync()         → Actualiza badge visual
// ==========================================================================


// Clave de localStorage donde guardamos la cola
const SYNC_STORAGE_KEY = 'cola_sync';

// Intervalo de verificación de conexión (milisegundos)
const SYNC_CHECK_INTERVAL = 30000; // 30 segundos

// Variable para saber si estamos online con el backend
let backendOnline = true;

// Variable para evitar sincronización doble simultánea
let sincronizandoAhora = false;


// ==========================================================================
// GESTIÓN DE LA COLA EN LOCALSTORAGE
// ==========================================================================

/**
 * Lee la cola de operaciones pendientes desde localStorage.
 *
 * Retorna:
 *   Array: Lista de operaciones pendientes
 */
function leerCola() {
    try {
        const datos = localStorage.getItem(SYNC_STORAGE_KEY);
        return datos ? JSON.parse(datos) : [];
    } catch (e) {
        console.error('Error al leer cola sync:', e);
        return [];
    }
}


/**
 * Guarda la cola de operaciones en localStorage.
 *
 * Parámetros:
 *   cola (Array): Lista de operaciones a guardar
 */
function guardarCola(cola) {
    try {
        localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(cola));
    } catch (e) {
        console.error('Error al guardar cola sync:', e);
    }
}


/**
 * Añade una operación fallida a la cola de sincronización.
 * Se llama desde api.js cuando una petición de escritura falla por red.
 *
 * Parámetros:
 *   metodo (string): Método HTTP (POST, PUT, DELETE, PATCH)
 *   ruta (string): Ruta de la API (ej: '/clientes/')
 *   datos (Object|null): Body JSON de la petición
 */
function agregarACola(metodo, ruta, datos) {
    const cola = leerCola();

    cola.push({
        metodo: metodo,
        ruta: `/api${ruta}`,  // Añadimos /api porque el backend espera ruta completa
        datos: datos || null,
        timestamp: new Date().toISOString()
    });

    guardarCola(cola);
    actualizarIndicadorSync();

    console.log(`[SYNC] Operación encolada: ${metodo} ${ruta} (${cola.length} pendientes)`);
}


/**
 * Obtiene el número de operaciones pendientes.
 *
 * Retorna:
 *   number: Cantidad de operaciones en cola
 */
function contarPendientes() {
    return leerCola().length;
}


// ==========================================================================
// SINCRONIZACIÓN
// ==========================================================================

/**
 * Intenta sincronizar todas las operaciones pendientes con el backend.
 * Envía la cola completa a POST /api/sync y procesa los resultados.
 *
 * Si la sincronización es exitosa, limpia la cola.
 * Si falla parcialmente, mantiene solo las operaciones fallidas.
 */
async function sincronizarCola() {
    const cola = leerCola();

    // Si no hay operaciones pendientes, no hacer nada
    if (cola.length === 0) return;

    // Evitar doble sincronización
    if (sincronizandoAhora) return;
    sincronizandoAhora = true;

    console.log(`[SYNC] Sincronizando ${cola.length} operaciones pendientes...`);

    try {
        const respuesta = await fetch(`${API_BASE_URL}/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ operaciones: cola })
        });

        const resultado = await respuesta.json();

        if (resultado.ok) {
            // Mostrar resumen al usuario
            if (resultado.exitosas > 0) {
                mostrarNotificacion(
                    `✅ Sincronización completada: ${resultado.exitosas}/${resultado.total} operaciones exitosas`,
                    'success'
                );
            }

            // Si hay fallidas, mantenerlas en la cola para reintentar
            if (resultado.fallidas > 0) {
                // Filtrar solo las que fallaron (misma posición en el array)
                const colaRestante = [];
                resultado.resultados.forEach((res, indice) => {
                    if (!res.ok && cola[indice]) {
                        colaRestante.push(cola[indice]);
                    }
                });
                guardarCola(colaRestante);

                mostrarNotificacion(
                    `⚠️ ${resultado.fallidas} operaciones no pudieron sincronizarse`,
                    'warning'
                );
            } else {
                // Todo fue bien, limpiar la cola
                guardarCola([]);
            }

            backendOnline = true;

        } else {
            // El endpoint respondió con error general
            console.error('[SYNC] Error en sincronización:', resultado.error);
        }

    } catch (error) {
        // No hay conexión todavía
        console.log('[SYNC] Backend no disponible, reintentando más tarde...');
        backendOnline = false;
    }

    sincronizandoAhora = false;
    actualizarIndicadorSync();
}


// ==========================================================================
// VERIFICACIÓN DE CONEXIÓN
// ==========================================================================

/**
 * Comprueba si el backend está disponible haciendo GET /api/config.
 * Si hay conexión y hay operaciones pendientes, lanza sincronización.
 */
async function verificarConexion() {
    try {
        const respuesta = await fetch(`${API_BASE_URL}/config`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (respuesta.ok) {
            // El backend responde → estamos online
            if (!backendOnline) {
                console.log('[SYNC] Conexión restaurada con el backend');
                backendOnline = true;
                actualizarIndicadorSync();

                // Si hay operaciones pendientes, sincronizar ahora
                if (contarPendientes() > 0) {
                    sincronizarCola();
                }
            }
            backendOnline = true;
        } else {
            backendOnline = false;
        }
    } catch (error) {
        // Backend no responde
        if (backendOnline) {
            console.log('[SYNC] Conexión perdida con el backend');
        }
        backendOnline = false;
    }

    actualizarIndicadorSync();
}


// ==========================================================================
// INDICADOR VISUAL
// ==========================================================================

/**
 * Actualiza el indicador visual de estado de conexión y cola pendiente
 * en la barra de navegación.
 */
function actualizarIndicadorSync() {
    const indicador = document.getElementById('sync-indicator');
    if (!indicador) return;

    const pendientes = contarPendientes();

    if (!backendOnline) {
        // Sin conexión
        indicador.innerHTML = `<span class="sync-offline">🔴 Offline</span>`;
        indicador.title = 'Sin conexión con el servidor';
        indicador.style.display = 'flex';
    } else if (pendientes > 0) {
        // Online pero con operaciones pendientes
        indicador.innerHTML = `
            <span class="sync-pending" onclick="sincronizarCola()">
                🟡 ${pendientes} pendiente${pendientes !== 1 ? 's' : ''}
            </span>`;
        indicador.title = `${pendientes} operaciones por sincronizar. Click para sincronizar ahora.`;
        indicador.style.display = 'flex';
    } else {
        // Todo bien, online sin pendientes
        indicador.innerHTML = `<span class="sync-online">🟢</span>`;
        indicador.title = 'Conectado al servidor';
        indicador.style.display = 'flex';
    }
}


// ==========================================================================
// EXPORTAR / IMPORTAR COLA (para Netlify ↔ local)
// ==========================================================================

/**
 * Exporta la cola de operaciones pendientes como un archivo JSON descargable.
 * Se usa cuando el usuario está en Netlify (fuera de casa) y quiere
 * llevarse los datos para importarlos en el PC de casa.
 *
 * Genera un archivo: sync_data_YYYY-MM-DD.json
 */
function exportarCola() {
    const cola = leerCola();

    if (cola.length === 0) {
        alert('No hay operaciones pendientes para exportar.');
        return;
    }

    // Crear objeto con metadatos
    const exportacion = {
        version: '1.0',
        fecha_exportacion: new Date().toISOString(),
        total_operaciones: cola.length,
        operaciones: cola
    };

    // Convertir a JSON con formato legible
    const json = JSON.stringify(exportacion, null, 2);

    // Crear blob y enlace de descarga
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Nombre del archivo con fecha
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `sync_data_${fecha}.json`;

    // Simular click en un enlace de descarga
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    // Liberar memoria
    URL.revokeObjectURL(url);

    alert(`✅ Exportado: ${cola.length} operaciones → ${nombreArchivo}\n\nAhora abre http://localhost en tu PC y usa "📥 Importar" para sincronizar.`);
    console.log(`[SYNC] Cola exportada: ${cola.length} operaciones → ${nombreArchivo}`);
}


/**
 * Importa un archivo JSON con operaciones pendientes y las sincroniza
 * con el backend.
 * Se usa cuando el usuario llega a casa y quiere enviar los datos
 * que guardó con el Chromebook en Netlify.
 *
 * Abre un selector de archivos → lee el JSON → envía a POST /api/sync
 */
function importarCola() {
    // Crear input de archivo invisible
    const inputArchivo = document.createElement('input');
    inputArchivo.type = 'file';
    inputArchivo.accept = '.json';

    inputArchivo.addEventListener('change', async (evento) => {
        const archivo = evento.target.files[0];
        if (!archivo) return;

        try {
            // Leer contenido del archivo
            const texto = await archivo.text();
            const datos = JSON.parse(texto);

            // Validar estructura
            if (!datos.operaciones || !Array.isArray(datos.operaciones)) {
                alert('❌ Archivo inválido: no contiene operaciones de sincronización.');
                return;
            }

            if (datos.operaciones.length === 0) {
                alert('El archivo no contiene operaciones pendientes.');
                return;
            }

            // Confirmar con el usuario
            const confirmar = confirm(
                `📥 Archivo: ${archivo.name}\n` +
                `📅 Exportado: ${datos.fecha_exportacion || 'desconocida'}\n` +
                `📝 Operaciones: ${datos.operaciones.length}\n\n` +
                `¿Importar y sincronizar estas operaciones con el backend?`
            );

            if (!confirmar) return;

            // Enviar al backend via POST /api/sync
            const respuesta = await fetch(`${API_BASE_URL}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ operaciones: datos.operaciones })
            });

            const resultado = await respuesta.json();

            if (resultado.ok) {
                let mensaje = `✅ Importación completada:\n`;
                mensaje += `  Total: ${resultado.total}\n`;
                mensaje += `  Exitosas: ${resultado.exitosas}\n`;
                if (resultado.fallidas > 0) {
                    mensaje += `  ⚠️ Fallidas: ${resultado.fallidas}\n`;
                    // Mostrar detalles de las que fallaron
                    resultado.resultados.forEach((r, i) => {
                        if (!r.ok) mensaje += `    → ${r.ruta}: ${r.error}\n`;
                    });
                }
                alert(mensaje);

                // Recargar la vista actual para mostrar los nuevos datos
                if (typeof window.dispatchEvent === 'function') {
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                }
            } else {
                alert(`❌ Error al sincronizar: ${resultado.error}`);
            }

        } catch (error) {
            if (error instanceof SyntaxError) {
                alert('❌ El archivo no es un JSON válido.');
            } else {
                alert(`❌ Error: ${error.message}\n\n¿Está encendido el backend?`);
            }
        }
    });

    // Abrir selector de archivos
    inputArchivo.click();
}


/**
 * Muestra una notificación temporal en pantalla.
 * Es un fallback simple si no existe un sistema de notificaciones en la app.
 *
 * Parámetros:
 *   mensaje (string): Texto a mostrar
 *   tipo (string): Tipo de notificación ('success', 'warning', 'error')
 */
function mostrarNotificacion(mensaje, tipo = 'info') {
    console.log(`[NOTIF] (${tipo}) ${mensaje}`);

    // Crear elemento de notificación
    const notif = document.createElement('div');
    notif.className = `sync-notificacion sync-notif-${tipo}`;
    notif.textContent = mensaje;

    document.body.appendChild(notif);

    // Eliminar después de 5 segundos
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 300);
    }, 5000);
}


// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

/**
 * Arranca el sistema de sincronización:
 * - Comprueba conexión inicial
 * - Activa polling periódico
 * - Escucha eventos online/offline del navegador
 */
(function inicializarSync() {
    // Verificación inicial después de 2 segundos (dar tiempo a que cargue todo)
    setTimeout(() => {
        verificarConexion();
    }, 2000);

    // Polling periódico
    setInterval(verificarConexion, SYNC_CHECK_INTERVAL);

    // Eventos del navegador para cambios de conectividad
    window.addEventListener('online', () => {
        console.log('[SYNC] Navegador reporta: ONLINE');
        verificarConexion();
    });

    window.addEventListener('offline', () => {
        console.log('[SYNC] Navegador reporta: OFFLINE');
        backendOnline = false;
        actualizarIndicadorSync();
    });

    console.log('[SYNC] Sistema de sincronización offline inicializado');
})();

