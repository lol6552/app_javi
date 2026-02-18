// ==========================================================================
// frontend/js/ofertas.js - Módulo CRUD de Ofertas/Presupuestos
// ==========================================================================
// Maneja la lista de ofertas, formulario de crear/editar (con partidas
// dinámicas), cambio de estado y eliminación.
//
// Se comunica con:
//   GET    /api/ofertas/              → Lista
//   GET    /api/ofertas/<id>          → Obtener una (con partidas)
//   POST   /api/ofertas/              → Crear
//   PUT    /api/ofertas/<id>          → Editar
//   DELETE /api/ofertas/<id>          → Eliminar
//   PATCH  /api/ofertas/<id>/estado   → Cambiar estado
// ==========================================================================

// Variable global para el % de IVA (se carga desde /api/config)
let IVA_PORCENTAJE = 21;

// Cargar IVA desde el backend al inicio
(async function () {
    try {
        const resp = await apiGet('/config');
        if (resp.ok && resp.data.iva_porcentaje) {
            IVA_PORCENTAJE = resp.data.iva_porcentaje;
        }
    } catch (e) {
        // Si falla, usamos el valor por defecto (21)
    }
})();


// ==========================================================================
// LISTA DE OFERTAS
// ==========================================================================

/**
 * Carga y muestra la lista de ofertas con búsqueda y filtro por estado.
 *
 * Parámetros:
 *   termino (string, opcional): Texto de búsqueda
 *   estado (string, opcional): Filtro de estado (pendiente, aceptada, rechazada)
 */
async function cargarListaOfertas(termino = '', estado = '') {
    const contenido = document.getElementById('content-area');
    contenido.innerHTML = '<div class="loading-spinner"><span>⏳ Cargando ofertas...</span></div>';

    // Construimos la URL con los parámetros de búsqueda
    let params = [];
    if (termino) params.push(`q=${encodeURIComponent(termino)}`);
    if (estado) params.push(`estado=${encodeURIComponent(estado)}`);
    let url = '/ofertas/' + (params.length > 0 ? '?' + params.join('&') : '');

    const respuesta = await apiGet(url);

    if (!respuesta.ok) {
        contenido.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Error al cargar las ofertas</h3>
                <p>${respuesta.error || 'Error desconocido'}</p>
                <button class="btn btn-primary" onclick="cargarListaOfertas()">🔄 Reintentar</button>
            </div>
        `;
        return;
    }

    const ofertas = respuesta.data;

    // ====================================================================
    // RENDERIZAR HTML DE LA LISTA
    // ====================================================================
    let html = '';

    // ---- Cabecera con buscador, filtro y botón "Nueva" ----
    html += `
    <div class="section-header">
        <div class="section-info">
            <p class="section-description">
                Gestiona tus ofertas y presupuestos. Total: <strong>${ofertas.length}</strong> oferta${ofertas.length !== 1 ? 's' : ''}.
            </p>
        </div>

        <div class="search-container">
            <div class="search-form">
                <div class="search-input-wrapper">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="busqueda-ofertas" value="${termino}"
                        placeholder="Buscar por cliente o número..." class="search-input">
                    ${termino ? '<button class="search-clear" onclick="cargarListaOfertas()" title="Limpiar">✕</button>' : ''}
                </div>

                <select id="filtro-estado-ofertas" class="filter-select" onchange="filtrarOfertas()">
                    <option value="">Todos los estados</option>
                    <option value="pendiente" ${estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="aceptada" ${estado === 'aceptada' ? 'selected' : ''}>Aceptada</option>
                    <option value="rechazada" ${estado === 'rechazada' ? 'selected' : ''}>Rechazada</option>
                </select>

                <button class="btn btn-secondary" onclick="buscarOfertas()">Buscar</button>
            </div>
        </div>

        <div class="section-actions">
            <a href="#/ofertas/nueva" class="btn btn-primary">
                <span class="btn-icon">➕</span>
                Nueva Oferta
            </a>
        </div>
    </div>`;

    // ---- Tabla de ofertas o mensaje vacío ----
    if (ofertas.length > 0) {
        html += `
        <div class="table-container">
            <table class="data-table" id="tabla-ofertas">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th class="actions-column">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${ofertas.map(o => {
            // Icono según el estado
            let iconoEstado = '⏳';
            if (o.estado === 'aceptada') iconoEstado = '✅';
            if (o.estado === 'rechazada') iconoEstado = '❌';

            return `
                    <tr>
                        <td><span class="offer-code">${o.numero}</span></td>
                        <td>
                            <div class="client-name">
                                <span class="name-initial">${o.cliente_nombre[0]}${o.cliente_nombre.split(' ').pop()[0]}</span>
                                <span>${o.cliente_nombre}</span>
                            </div>
                        </td>
                        <td>${o.fecha_display}</td>
                        <td><span class="amount">${o.total.toFixed(2)} €</span></td>
                        <td>
                            <span class="badge badge-${o.estado}">
                                ${iconoEstado} ${o.estado.charAt(0).toUpperCase() + o.estado.slice(1)}
                            </span>
                        </td>
                        <td class="actions-column">
                            <div class="action-buttons">
                                <button class="btn btn-small btn-pdf" title="Generar PDF"
                                    onclick="window.open(API_BASE_URL + '/pdfs/oferta/${o.id}', '_blank')">📄</button>
                                <button class="btn btn-small btn-status" title="Cambiar estado"
                                    onclick="cambiarEstadoOferta(${o.id})">🔄</button>
                                <a href="#/ofertas/editar/${o.id}" class="btn btn-small btn-edit" title="Editar">✏️</a>
                                <button class="btn btn-small btn-delete" title="Eliminar"
                                    onclick="eliminarOferta(${o.id}, '${o.numero}')"
                                    ${o.tiene_facturas ? 'disabled' : ''}>🗑️</button>
                            </div>
                        </td>
                    </tr>`;
        }).join('')}
                </tbody>
            </table>
        </div>`;
    } else {
        html += `
        <div class="empty-state">
            <div class="empty-icon">📝</div>
            <h3>No hay ofertas registradas</h3>
            <p>Comienza creando tu primera oferta/presupuesto.</p>
            <a href="#/ofertas/nueva" class="btn btn-primary btn-large">➕ Crear primera oferta</a>
        </div>`;
    }

    contenido.innerHTML = html;

    // Configurar buscador con Enter
    const inputBusqueda = document.getElementById('busqueda-ofertas');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarOfertas();
        });
    }
}


/**
 * Lee el valor del buscador y el filtro de estado, y recarga la lista.
 */
function buscarOfertas() {
    const termino = document.getElementById('busqueda-ofertas').value.trim();
    const estado = document.getElementById('filtro-estado-ofertas').value;
    cargarListaOfertas(termino, estado);
}

/**
 * Recarga la lista aplicando solo el filtro de estado.
 */
function filtrarOfertas() {
    const termino = document.getElementById('busqueda-ofertas').value.trim();
    const estado = document.getElementById('filtro-estado-ofertas').value;
    cargarListaOfertas(termino, estado);
}


// ==========================================================================
// FORMULARIO DE OFERTAS (CREAR / EDITAR)
// ==========================================================================

/**
 * Carga el formulario para crear o editar una oferta.
 * Incluye tabla dinámica de partidas con cálculo en tiempo real.
 *
 * Si se pasa un ID, carga los datos existentes (modo edición).
 *
 * Parámetros:
 *   id (number, opcional): ID de la oferta a editar
 */
async function cargarFormularioOferta(id = null) {
    const contenido = document.getElementById('content-area');
    const esEdicion = id !== null;

    // Necesitamos la lista de clientes para el select
    contenido.innerHTML = '<div class="loading-spinner"><span>⏳ Cargando formulario...</span></div>';

    // Cargamos clientes y (si es edición) la oferta en paralelo
    const [respClientes, respOferta] = await Promise.all([
        apiGet('/clientes/'),
        esEdicion ? apiGet(`/ofertas/${id}`) : Promise.resolve(null)
    ]);

    if (!respClientes.ok) {
        mostrarNotificacion('Error al cargar la lista de clientes', 'error');
        window.location.hash = '#/ofertas';
        return;
    }

    let oferta = null;
    if (esEdicion) {
        if (!respOferta.ok) {
            mostrarNotificacion(respOferta.error || 'Oferta no encontrada', 'error');
            window.location.hash = '#/ofertas';
            return;
        }
        oferta = respOferta.data;
    }

    const clientes = respClientes.data;
    const hoy = new Date().toISOString().split('T')[0]; // AAAA-MM-DD

    // ====================================================================
    // RENDERIZAR HTML DEL FORMULARIO
    // ====================================================================
    let html = '';

    // ---- Migas de pan ----
    html += `<div class="breadcrumb"><a href="#/ofertas">← Volver a ofertas</a></div>`;

    html += `
    <div class="form-container">
        <form id="formulario-oferta" onsubmit="guardarOferta(event, ${id})">

            <!-- SECCIÓN: Información de la oferta -->
            <fieldset class="form-section">
                <legend>📋 Información de la Oferta</legend>
                <div class="form-row">
                    <div class="form-group">
                        <label for="fecha">Fecha *</label>
                        <input type="date" id="fecha" name="fecha"
                            value="${oferta ? oferta.fecha : hoy}" required>
                    </div>
                    <div class="form-group">
                        <label for="fecha_vencimiento">Fecha Vencimiento</label>
                        <input type="date" id="fecha_vencimiento" name="fecha_vencimiento"
                            value="${oferta && oferta.fecha_vencimiento ? oferta.fecha_vencimiento : ''}">
                    </div>
                    <div class="form-group">
                        <label for="cliente_id">Cliente *</label>
                        <select id="cliente_id" name="cliente_id" required>
                            <option value="">-- Seleccionar cliente --</option>
                            ${clientes.map(c => `
                                <option value="${c.id}" ${oferta && oferta.cliente_id === c.id ? 'selected' : ''}>
                                    ${c.apellido}, ${c.nombre} (${c.dni})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group full-width">
                    <label for="descripcion">Descripción general (opcional)</label>
                    <textarea id="descripcion" name="descripcion" rows="2"
                        placeholder="Descripción general del trabajo...">${oferta ? (oferta.descripcion || '') : ''}</textarea>
                </div>
            </fieldset>

            <!-- SECCIÓN: Partidas -->
            <fieldset class="form-section">
                <legend>📝 Partidas / Conceptos</legend>
                <table class="partidas-table" id="partidas-table">
                    <thead>
                        <tr>
                            <th class="col-descripcion">DESCRIPCIÓN</th>
                            <th class="col-precio">PRECIO</th>
                            <th class="col-cantidad">CANTIDAD</th>
                            <th class="col-total">TOTAL</th>
                            <th class="col-acciones"></th>
                        </tr>
                    </thead>
                    <tbody id="partidas-body">
                        ${oferta && oferta.partidas && oferta.partidas.length > 0
            ? oferta.partidas.map(p => crearFilaPartidaHTML(p.descripcion, p.precio, p.cantidad, p.total)).join('')
            : crearFilaPartidaHTML('', '', 1, 0)
        }
                    </tbody>
                </table>

                <button type="button" class="btn-add-row" onclick="agregarFilaPartida()">➕ Añadir partida</button>

                <!-- Resumen de totales -->
                <div class="totals-summary">
                    <div class="totals-row">
                        <span class="totals-label">Subtotal</span>
                        <span class="totals-value" id="subtotal-display">0.00 €</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">IVA (${IVA_PORCENTAJE}%)</span>
                        <span class="totals-value" id="iva-display">0.00 €</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">TOTAL</span>
                        <span class="totals-value" id="total-display">0.00 €</span>
                    </div>
                </div>
            </fieldset>

            <!-- SECCIÓN: Forma de pago -->
            <fieldset class="form-section">
                <legend>💳 Forma de Pago</legend>
                <div class="payment-methods">
                    <label class="payment-method-option">
                        <input type="radio" name="forma_pago" value="efectivo"
                            ${oferta && oferta.forma_pago === 'efectivo' ? 'checked' : ''}>
                        <span>💵 Efectivo</span>
                    </label>
                    <label class="payment-method-option">
                        <input type="radio" name="forma_pago" value="bizum"
                            ${oferta && oferta.forma_pago === 'bizum' ? 'checked' : ''}>
                        <span>📱 Bizum</span>
                    </label>
                    <label class="payment-method-option">
                        <input type="radio" name="forma_pago" value="transferencia"
                            ${oferta && oferta.forma_pago === 'transferencia' ? 'checked' : ''}>
                        <span>🏦 Transferencia</span>
                    </label>
                </div>
            </fieldset>

            <!-- BOTONES -->
            <div class="form-actions">
                <a href="#/ofertas" class="btn btn-secondary">← Cancelar</a>
                <button type="submit" class="btn btn-primary" id="btn-guardar-oferta">
                    <span class="btn-icon">💾</span>
                    ${esEdicion ? 'Actualizar Oferta' : 'Guardar Oferta'}
                </button>
            </div>
        </form>
    </div>`;

    contenido.innerHTML = html;

    // Inicializar listeners de las partidas y calcular totales
    document.querySelectorAll('.partida-row').forEach(fila => {
        adjuntarListenersPartida(fila);
    });
    calcularTotales();
}


// ==========================================================================
// PARTIDAS DINÁMICAS
// ==========================================================================

/**
 * Genera el HTML de una fila de partida.
 *
 * Parámetros:
 *   desc (string): Descripción
 *   precio (number): Precio unitario
 *   cantidad (number): Cantidad
 *   total (number): Total calculado
 *
 * Retorna:
 *   string: HTML de la fila <tr>
 */
function crearFilaPartidaHTML(desc, precio, cantidad, total) {
    return `
    <tr class="partida-row">
        <td><input type="text" name="partida_descripcion" value="${desc}"
                placeholder="Descripción del concepto" required></td>
        <td><input type="number" name="partida_precio" value="${precio}"
                step="0.01" min="0" placeholder="0.00" class="precio-input" required></td>
        <td><input type="number" name="partida_cantidad" value="${cantidad}"
                step="0.01" min="0.01" placeholder="1" class="cantidad-input" required></td>
        <td><input type="text" class="partida-total-input" value="${(total || 0).toFixed(2)} €" readonly></td>
        <td><button type="button" class="btn-remove-row" onclick="eliminarFilaPartida(this)">✕</button></td>
    </tr>`;
}


/**
 * Añade una nueva fila vacía a la tabla de partidas.
 */
function agregarFilaPartida() {
    const tbody = document.getElementById('partidas-body');
    const temp = document.createElement('tbody');
    temp.innerHTML = crearFilaPartidaHTML('', '', 1, 0);
    const nuevaFila = temp.firstElementChild;
    tbody.appendChild(nuevaFila);
    adjuntarListenersPartida(nuevaFila);
}


/**
 * Elimina una fila de partida (mínimo 1 fila).
 */
function eliminarFilaPartida(boton) {
    const filas = document.querySelectorAll('.partida-row');
    if (filas.length > 1) {
        boton.closest('tr').remove();
        calcularTotales();
    } else {
        alert('Debe haber al menos una partida');
    }
}


/**
 * Adjunta event listeners a los inputs de precio y cantidad de una fila.
 */
function adjuntarListenersPartida(fila) {
    const precioInput = fila.querySelector('.precio-input');
    const cantidadInput = fila.querySelector('.cantidad-input');
    precioInput.addEventListener('input', () => calcularTotalFila(fila));
    cantidadInput.addEventListener('input', () => calcularTotalFila(fila));
}


/**
 * Calcula el total de una fila individual y luego recalcula los totales generales.
 */
function calcularTotalFila(fila) {
    const precio = parseFloat(fila.querySelector('.precio-input').value) || 0;
    const cantidad = parseFloat(fila.querySelector('.cantidad-input').value) || 0;
    const total = precio * cantidad;
    fila.querySelector('.partida-total-input').value = total.toFixed(2) + ' €';
    calcularTotales();
}


/**
 * Recalcula subtotal, IVA y total sumando todas las partidas.
 */
function calcularTotales() {
    let subtotal = 0;
    document.querySelectorAll('.partida-row').forEach(fila => {
        const precio = parseFloat(fila.querySelector('.precio-input').value) || 0;
        const cantidad = parseFloat(fila.querySelector('.cantidad-input').value) || 0;
        subtotal += precio * cantidad;
    });

    const iva = subtotal * (IVA_PORCENTAJE / 100);
    const total = subtotal + iva;

    document.getElementById('subtotal-display').textContent = subtotal.toFixed(2) + ' €';
    document.getElementById('iva-display').textContent = iva.toFixed(2) + ' €';
    document.getElementById('total-display').textContent = total.toFixed(2) + ' €';
}


// ==========================================================================
// GUARDAR OFERTA (CREAR / EDITAR)
// ==========================================================================

/**
 * Envía los datos del formulario al backend para crear o editar una oferta.
 *
 * Parámetros:
 *   evento (Event): Evento del formulario
 *   id (number|null): ID de la oferta (null si es creación)
 */
async function guardarOferta(evento, id) {
    evento.preventDefault();

    const boton = document.getElementById('btn-guardar-oferta');
    boton.disabled = true;
    boton.textContent = '⏳ Guardando...';

    // Recoger los datos del formulario
    const formaPagoRadio = document.querySelector('input[name="forma_pago"]:checked');

    // Recoger las partidas del DOM
    const partidas = [];
    document.querySelectorAll('.partida-row').forEach(fila => {
        const desc = fila.querySelector('input[name="partida_descripcion"]').value.trim();
        const precio = fila.querySelector('.precio-input').value;
        const cantidad = fila.querySelector('.cantidad-input').value;
        if (desc) {
            partidas.push({
                descripcion: desc,
                precio: parseFloat(precio) || 0,
                cantidad: parseFloat(cantidad) || 1
            });
        }
    });

    const datos = {
        cliente_id: parseInt(document.getElementById('cliente_id').value),
        fecha: document.getElementById('fecha').value,
        fecha_vencimiento: document.getElementById('fecha_vencimiento').value || '',
        descripcion: document.getElementById('descripcion').value.trim(),
        forma_pago: formaPagoRadio ? formaPagoRadio.value : '',
        partidas: partidas
    };

    // Validación mínima en frontend
    if (!datos.cliente_id || !datos.fecha) {
        mostrarNotificacion('El cliente y la fecha son obligatorios', 'error');
        boton.disabled = false;
        boton.innerHTML = `<span class="btn-icon">💾</span> ${id ? 'Actualizar Oferta' : 'Guardar Oferta'}`;
        return;
    }

    if (partidas.length === 0) {
        mostrarNotificacion('Debe añadir al menos una partida', 'error');
        boton.disabled = false;
        boton.innerHTML = `<span class="btn-icon">💾</span> ${id ? 'Actualizar Oferta' : 'Guardar Oferta'}`;
        return;
    }

    // Enviar al backend
    let respuesta;
    if (id) {
        respuesta = await apiPut(`/ofertas/${id}`, datos);
    } else {
        respuesta = await apiPost('/ofertas/', datos);
    }

    if (respuesta.ok) {
        mostrarNotificacion(respuesta.mensaje, 'success');
        window.location.hash = '#/ofertas';
    } else {
        mostrarNotificacion(respuesta.error || 'Error al guardar la oferta', 'error');
        boton.disabled = false;
        boton.innerHTML = `<span class="btn-icon">💾</span> ${id ? 'Actualizar Oferta' : 'Guardar Oferta'}`;
    }
}


// ==========================================================================
// CAMBIAR ESTADO
// ==========================================================================

/**
 * Cambia el estado de una oferta ciclando entre pendiente → aceptada → rechazada.
 *
 * Parámetros:
 *   id (number): ID de la oferta
 */
async function cambiarEstadoOferta(id) {
    const respuesta = await apiRequest(`/ofertas/${id}/estado`, 'PATCH', {});

    if (respuesta.ok) {
        mostrarNotificacion(respuesta.mensaje, 'success');
        // Recargamos la lista manteniendo los filtros actuales
        const termino = document.getElementById('busqueda-ofertas')?.value.trim() || '';
        const estado = document.getElementById('filtro-estado-ofertas')?.value || '';
        cargarListaOfertas(termino, estado);
    } else {
        mostrarNotificacion(respuesta.error || 'Error al cambiar el estado', 'error');
    }
}


// ==========================================================================
// ELIMINAR OFERTA
// ==========================================================================

/**
 * Elimina una oferta después de confirmación.
 *
 * Parámetros:
 *   id (number): ID de la oferta
 *   numero (string): Número de la oferta (para el mensaje de confirmación)
 */
async function eliminarOferta(id, numero) {
    if (!confirm(`¿Estás seguro de eliminar la oferta ${numero}?`)) {
        return;
    }

    const respuesta = await apiDelete(`/ofertas/${id}`);

    if (respuesta.ok) {
        mostrarNotificacion(respuesta.mensaje, 'success');
        cargarListaOfertas();
    } else {
        mostrarNotificacion(respuesta.error || 'Error al eliminar', 'error');
    }
}
