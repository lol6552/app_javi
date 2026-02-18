// ==========================================================================
// frontend/js/clientes.js - Módulo CRUD de Clientes
// ==========================================================================
// Maneja la lista de clientes, formulario de crear/editar, búsqueda
// y eliminación.
//
// Se comunica con:
//   GET    /api/clientes         → Lista
//   GET    /api/clientes/<id>    → Obtener uno
//   POST   /api/clientes         → Crear
//   PUT    /api/clientes/<id>    → Editar
//   DELETE /api/clientes/<id>    → Eliminar
// ==========================================================================


// ==========================================================================
// LISTA DE CLIENTES
// ==========================================================================

/**
 * Carga y muestra la lista de clientes.
 * Incluye barra de búsqueda y tabla con acciones.
 *
 * Parámetros:
 *   termino (string, opcional): Término de búsqueda para filtrar
 */
async function cargarListaClientes(termino = '') {
    const contenido = document.getElementById('content-area');

    // Mostramos spinner de carga
    contenido.innerHTML = '<div class="loading-spinner"><span>⏳ Cargando clientes...</span></div>';

    // Construimos la URL con el parámetro de búsqueda
    let url = '/clientes/';
    if (termino) {
        url += `?q=${encodeURIComponent(termino)}`;
    }

    // Hacemos la petición al backend
    const respuesta = await apiGet(url);

    if (!respuesta.ok) {
        contenido.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Error al cargar los clientes</h3>
                <p>${respuesta.error || 'Error desconocido'}</p>
                <button class="btn btn-primary" onclick="cargarListaClientes()">🔄 Reintentar</button>
            </div>
        `;
        return;
    }

    const clientes = respuesta.data;

    // ====================================================================
    // RENDERIZAR HTML DE LA LISTA
    // ====================================================================
    let html = '';

    // ---- Cabecera con buscador y botón "Nuevo" ----
    html += `
    <div class="section-header">
        <div class="section-info">
            <p class="section-description">
                Gestiona tu base de datos de clientes. Total: <strong>${clientes.length}</strong> cliente${clientes.length !== 1 ? 's' : ''}.
            </p>
        </div>

        <!-- Barra de búsqueda -->
        <div class="search-container">
            <div class="search-form">
                <div class="search-input-wrapper">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="busqueda-clientes" value="${termino}"
                        placeholder="Buscar por nombre, código o teléfono..." class="search-input">
                    ${termino ? '<button class="search-clear" onclick="cargarListaClientes()" title="Limpiar búsqueda">✕</button>' : ''}
                </div>
                <button class="btn btn-secondary" onclick="buscarClientes()">Buscar</button>
            </div>
        </div>

        <div class="section-actions">
            <a href="#/clientes/nuevo" class="btn btn-primary">
                <span class="btn-icon">➕</span>
                Nuevo Cliente
            </a>
        </div>
    </div>`;

    // ---- Tabla de clientes o mensaje vacío ----
    if (clientes.length > 0) {
        html += `
        <div class="table-container">
            <table class="data-table" id="tabla-clientes">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>DNI</th>
                        <th>Teléfono</th>
                        <th>Localidad</th>
                        <th>Trabajo</th>
                        <th class="actions-column">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${clientes.map(c => `
                    <tr>
                        <td><span class="client-code">${c.codigo || 'CLI-' + c.id}</span></td>
                        <td>
                            <div class="client-name">
                                <span class="name-initial">${c.nombre[0]}${c.apellido[0]}</span>
                                <span>${c.nombre} ${c.apellido}</span>
                            </div>
                        </td>
                        <td>${c.dni}</td>
                        <td>
                            <a href="tel:${c.telefono}" class="phone-link">📞 ${c.telefono}</a>
                        </td>
                        <td>${c.localidad}</td>
                        <td>
                            ${c.trabajo_a_realizar
                ? `<span class="work-preview" title="${c.trabajo_a_realizar}">${c.trabajo_a_realizar.substring(0, 40)}${c.trabajo_a_realizar.length > 40 ? '...' : ''}</span>`
                : '<span class="no-data">Sin especificar</span>'}
                        </td>
                        <td class="actions-column">
                            <div class="action-buttons">
                                <a href="#/clientes/editar/${c.id}" class="btn btn-small btn-edit" title="Editar cliente">✏️</a>
                                <button class="btn btn-small btn-delete" title="Eliminar cliente"
                                    onclick="eliminarCliente(${c.id}, '${c.nombre} ${c.apellido}')"
                                    ${c.tiene_documentos ? 'disabled' : ''}>🗑️</button>
                            </div>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
    } else {
        html += `
        <div class="empty-state">
            <div class="empty-icon">👥</div>
            <h3>No hay clientes registrados</h3>
            <p>Comienza añadiendo tu primer cliente al sistema.</p>
            <a href="#/clientes/nuevo" class="btn btn-primary btn-large">➕ Crear primer cliente</a>
        </div>`;
    }

    // Insertamos el HTML
    contenido.innerHTML = html;

    // Configuramos el buscador para que funcione con Enter
    const inputBusqueda = document.getElementById('busqueda-clientes');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                buscarClientes();
            }
        });
        // Si hay término de búsqueda, enfocamos el input
        if (termino) {
            inputBusqueda.focus();
        }
    }
}


/**
 * Lee el valor del buscador y recarga la lista filtrada.
 */
function buscarClientes() {
    const input = document.getElementById('busqueda-clientes');
    const termino = input ? input.value.trim() : '';
    cargarListaClientes(termino);
}


// ==========================================================================
// FORMULARIO DE CLIENTES (CREAR / EDITAR)
// ==========================================================================

/**
 * Carga el formulario para crear o editar un cliente.
 *
 * Si se pasa un ID, carga los datos del cliente existente (modo edición).
 * Si no se pasa ID, muestra el formulario vacío (modo creación).
 *
 * Parámetros:
 *   id (number, opcional): ID del cliente a editar
 */
async function cargarFormularioCliente(id = null) {
    const contenido = document.getElementById('content-area');
    const esEdicion = id !== null;

    // Si es edición, primero cargamos los datos del cliente
    let cliente = null;
    if (esEdicion) {
        contenido.innerHTML = '<div class="loading-spinner"><span>⏳ Cargando cliente...</span></div>';

        const respuesta = await apiGet(`/clientes/${id}`);
        if (!respuesta.ok) {
            mostrarNotificacion(respuesta.error || 'Cliente no encontrado', 'error');
            window.location.hash = '#/clientes';
            return;
        }
        cliente = respuesta.data;
    }

    // ====================================================================
    // RENDERIZAR HTML DEL FORMULARIO
    // ====================================================================
    let html = '';

    // ---- Migas de pan ----
    html += `
    <div class="breadcrumb">
        <a href="#/clientes">← Volver a la lista</a>
    </div>`;

    // ---- Formulario ----
    html += `
    <div class="form-container">
        <form id="formulario-cliente" onsubmit="guardarCliente(event, ${id})">

            <!-- GRUPO: Datos personales -->
            <fieldset class="form-section">
                <legend>Datos Personales</legend>

                <div class="form-row">
                    <!-- Campo: Nombre -->
                    <div class="form-group">
                        <label for="nombre">Nombre *</label>
                        <input type="text" id="nombre" name="nombre"
                            value="${cliente ? cliente.nombre : ''}"
                            placeholder="Ej: Juan" required maxlength="100">
                    </div>

                    <!-- Campo: Apellido -->
                    <div class="form-group">
                        <label for="apellido">Apellido *</label>
                        <input type="text" id="apellido" name="apellido"
                            value="${cliente ? cliente.apellido : ''}"
                            placeholder="Ej: Pérez García" required maxlength="100">
                    </div>
                </div>

                <div class="form-row">
                    <!-- Campo: DNI -->
                    <div class="form-group">
                        <label for="dni">DNI/NIE *</label>
                        <input type="text" id="dni" name="dni"
                            value="${cliente ? cliente.dni : ''}"
                            placeholder="Ej: 12345678A" required maxlength="20">
                        <span class="form-hint">El DNI debe ser único para cada cliente</span>
                    </div>

                    <!-- Campo: Teléfono -->
                    <div class="form-group">
                        <label for="telefono">Teléfono *</label>
                        <input type="tel" id="telefono" name="telefono"
                            value="${cliente ? cliente.telefono : ''}"
                            placeholder="Ej: 612345678" required maxlength="20">
                    </div>
                </div>
            </fieldset>

            <!-- GRUPO: Dirección -->
            <fieldset class="form-section">
                <legend>Dirección</legend>

                <!-- Campo: Dirección completa -->
                <div class="form-group full-width">
                    <label for="direccion">Dirección *</label>
                    <input type="text" id="direccion" name="direccion"
                        value="${cliente ? cliente.direccion : ''}"
                        placeholder="Ej: C/ Mayor 15, 2ºB" required maxlength="200">
                </div>

                <div class="form-row">
                    <!-- Campo: Código Postal -->
                    <div class="form-group">
                        <label for="codigo_postal">Código Postal *</label>
                        <input type="text" id="codigo_postal" name="codigo_postal"
                            value="${cliente ? cliente.codigo_postal : ''}"
                            placeholder="Ej: 28001" required maxlength="10" pattern="[0-9]{5}">
                    </div>

                    <!-- Campo: Localidad -->
                    <div class="form-group">
                        <label for="localidad">Localidad *</label>
                        <input type="text" id="localidad" name="localidad"
                            value="${cliente ? cliente.localidad : ''}"
                            placeholder="Ej: Madrid" required maxlength="100">
                    </div>
                </div>
            </fieldset>

            <!-- GRUPO: Trabajo -->
            <fieldset class="form-section">
                <legend>Información del Trabajo</legend>

                <div class="form-group full-width">
                    <label for="trabajo_a_realizar">Trabajo a Realizar</label>
                    <textarea id="trabajo_a_realizar" name="trabajo_a_realizar"
                        placeholder="Describe el trabajo que el cliente necesita..."
                        rows="4">${cliente ? (cliente.trabajo_a_realizar || '') : ''}</textarea>
                    <span class="form-hint">Este campo es opcional. Puedes describirlo después.</span>
                </div>
            </fieldset>

            <!-- BOTONES DE ACCIÓN -->
            <div class="form-actions">
                <a href="#/clientes" class="btn btn-secondary">Cancelar</a>
                <button type="submit" class="btn btn-primary" id="btn-guardar">
                    <span class="btn-icon">💾</span>
                    ${esEdicion ? 'Guardar Cambios' : 'Guardar Cliente'}
                </button>
            </div>

        </form>
    </div>`;

    // ---- Metadata del cliente (solo en edición) ----
    if (cliente) {
        html += `
        <div class="client-metadata">
            <p>
                <strong>ID:</strong> ${cliente.id} |
                <strong>Código:</strong> ${cliente.codigo} |
                <strong>Registrado:</strong> ${cliente.fecha_creacion}
                ${cliente.tiene_documentos ? '| <span class="has-documents">⚠️ Este cliente tiene documentos asociados</span>' : ''}
            </p>
        </div>`;
    }

    // Insertamos el HTML
    contenido.innerHTML = html;
}


// ==========================================================================
// GUARDAR CLIENTE (CREAR / EDITAR)
// ==========================================================================

/**
 * Envía los datos del formulario al backend para crear o editar un cliente.
 *
 * Si se pasa un ID, hace PUT (editar). Si no, hace POST (crear).
 *
 * Parámetros:
 *   evento (Event): Evento del formulario (para prevenir el envío normal)
 *   id (number|null): ID del cliente a editar, o null para crear
 */
async function guardarCliente(evento, id) {
    // Prevenimos el envío normal del formulario (que recargaría la página)
    evento.preventDefault();

    // Deshabilitamos el botón para evitar doble clic
    const boton = document.getElementById('btn-guardar');
    boton.disabled = true;
    boton.textContent = '⏳ Guardando...';

    // Obtenemos los datos del formulario
    const datos = {
        nombre: document.getElementById('nombre').value.trim(),
        apellido: document.getElementById('apellido').value.trim(),
        dni: document.getElementById('dni').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        direccion: document.getElementById('direccion').value.trim(),
        codigo_postal: document.getElementById('codigo_postal').value.trim(),
        localidad: document.getElementById('localidad').value.trim(),
        trabajo_a_realizar: document.getElementById('trabajo_a_realizar').value.trim()
    };

    // Decidimos si es crear (POST) o editar (PUT)
    let respuesta;
    if (id) {
        respuesta = await apiPut(`/clientes/${id}`, datos);
    } else {
        respuesta = await apiPost('/clientes/', datos);
    }

    // Procesamos la respuesta
    if (respuesta.ok) {
        // Éxito: mostramos mensaje y volvemos a la lista
        mostrarNotificacion(respuesta.mensaje, 'success');
        window.location.hash = '#/clientes';
    } else {
        // Error: mostramos el error y reactivamos el botón
        mostrarNotificacion(respuesta.error || 'Error al guardar', 'error');
        boton.disabled = false;
        boton.innerHTML = `<span class="btn-icon">💾</span> ${id ? 'Guardar Cambios' : 'Guardar Cliente'}`;
    }
}


// ==========================================================================
// ELIMINAR CLIENTE
// ==========================================================================

/**
 * Elimina un cliente después de confirmación.
 *
 * Parámetros:
 *   id (number): ID del cliente a eliminar
 *   nombre (string): Nombre del cliente (para el mensaje de confirmación)
 */
async function eliminarCliente(id, nombre) {
    // Pedimos confirmación al usuario
    if (!confirm(`¿Estás seguro de eliminar a ${nombre}?`)) {
        return; // El usuario canceló
    }

    // Hacemos la petición DELETE
    const respuesta = await apiDelete(`/clientes/${id}`);

    if (respuesta.ok) {
        mostrarNotificacion(respuesta.mensaje, 'success');
        // Recargamos la lista de clientes
        cargarListaClientes();
    } else {
        mostrarNotificacion(respuesta.error || 'Error al eliminar', 'error');
    }
}
