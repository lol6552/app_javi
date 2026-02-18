// ==========================================================================
// frontend/js/facturas.js - Módulo CRUD de Facturas
// ==========================================================================
// Maneja la lista de facturas, formulario de crear/editar con partidas,
// y los 3 modos de creación: manual, desde oferta, desde parte.
//
// Se comunica con:
//   GET    /api/facturas/                        → Lista
//   GET    /api/facturas/<id>                    → Obtener con partidas
//   POST   /api/facturas/                        → Crear
//   PUT    /api/facturas/<id>                    → Editar
//   DELETE /api/facturas/<id>                    → Eliminar
//   GET    /api/facturas/precarga/oferta/<id>    → Pre-cargar datos
//   GET    /api/facturas/precarga/parte/<id>     → Pre-cargar datos
// ==========================================================================


// ==========================================================================
// LISTA DE FACTURAS
// ==========================================================================

/**
 * Carga y muestra la lista de facturas con búsqueda, filtros de fecha
 * y filtro por forma de pago.
 */
async function cargarListaFacturas(termino = '', fechaDesde = '', fechaHasta = '', formaPago = '') {
    const contenido = document.getElementById('content-area');
    contenido.innerHTML = '<div class="loading-spinner"><span>⏳ Cargando facturas...</span></div>';

    // Construir URL con parámetros
    let params = [];
    if (termino) params.push(`q=${encodeURIComponent(termino)}`);
    if (fechaDesde) params.push(`fecha_desde=${encodeURIComponent(fechaDesde)}`);
    if (fechaHasta) params.push(`fecha_hasta=${encodeURIComponent(fechaHasta)}`);
    if (formaPago) params.push(`forma_pago=${encodeURIComponent(formaPago)}`);
    let url = '/facturas/' + (params.length > 0 ? '?' + params.join('&') : '');

    const respuesta = await apiGet(url);

    if (!respuesta.ok) {
        contenido.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Error al cargar las facturas</h3>
                <p>${respuesta.error || 'Error desconocido'}</p>
                <button class="btn btn-primary" onclick="cargarListaFacturas()">🔄 Reintentar</button>
            </div>`;
        return;
    }

    const facturas = respuesta.data;

    // ====================================================================
    // RENDERIZAR HTML
    // ====================================================================
    let html = '';

    // ---- Cabecera con filtros y botones ----
    html += `
    <div class="section-header">
        <div class="section-info">
            <p class="section-description">
                Facturas emitidas. Total: <strong>${facturas.length}</strong> factura${facturas.length !== 1 ? 's' : ''}.
            </p>
        </div>

        <div class="search-container">
            <div class="search-form partes-search-form">
                <div class="search-input-wrapper">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="busqueda-facturas" value="${termino}"
                        placeholder="Buscar por cliente o número..." class="search-input">
                    ${termino ? '<button class="search-clear" onclick="cargarListaFacturas()" title="Limpiar">✕</button>' : ''}
                </div>

                <div class="date-filters">
                    <input type="date" id="fecha-desde-facturas" value="${fechaDesde}"
                        class="date-filter-input" title="Fecha desde">
                    <span class="date-separator">→</span>
                    <input type="date" id="fecha-hasta-facturas" value="${fechaHasta}"
                        class="date-filter-input" title="Fecha hasta">
                </div>

                <select id="forma-pago-filtro" class="date-filter-input" title="Forma de pago">
                    <option value="">Todas las formas</option>
                    <option value="transferencia" ${formaPago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                    <option value="bizum" ${formaPago === 'bizum' ? 'selected' : ''}>Bizum</option>
                    <option value="efectivo" ${formaPago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                </select>

                <button class="btn btn-secondary" onclick="buscarFacturas()">Buscar</button>
            </div>
        </div>

        <div class="section-actions">
            <a href="#/facturas/nueva" class="btn btn-primary">
                <span class="btn-icon">➕</span>
                Nueva Factura
            </a>
        </div>
    </div>`;

    // ---- Tabla o mensaje vacío ----
    if (facturas.length > 0) {
        html += `
        <div class="table-container">
            <table class="data-table" id="tabla-facturas">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Origen</th>
                        <th>Total</th>
                        <th>Pago</th>
                        <th class="actions-column">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${facturas.map(f => `
                    <tr>
                        <td><span class="offer-code">${f.numero}</span></td>
                        <td>
                            <div class="client-name">
                                <span class="name-initial">${f.cliente_nombre[0]}${f.cliente_nombre.split(' ').pop()[0]}</span>
                                <span>${f.cliente_nombre}</span>
                            </div>
                        </td>
                        <td>${f.fecha_display}</td>
                        <td><span class="badge ${obtenerClaseOrigen(f.origen)}">${f.origen_detalle}</span></td>
                        <td><span class="amount">${f.total.toFixed(2)} €</span></td>
                        <td><span class="badge badge-pago-${f.forma_pago}">${capitalizarPago(f.forma_pago)}</span></td>
                        <td class="actions-column">
                            <div class="action-buttons">
                                <button class="btn btn-small btn-pdf" title="Generar PDF"
                                    onclick="window.open(API_BASE_URL + '/pdfs/factura/${f.id}', '_blank')">📄</button>
                                <a href="#/facturas/editar/${f.id}" class="btn btn-small btn-edit" title="Editar">✏️</a>
                                <button class="btn btn-small btn-delete" title="Eliminar"
                                    onclick="eliminarFactura(${f.id}, '${f.numero}')">🗑️</button>
                            </div>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    } else {
        html += `
        <div class="empty-state">
            <div class="empty-icon">📄</div>
            <h3>No hay facturas registradas</h3>
            <p>Comienza creando tu primera factura.</p>
            <a href="#/facturas/nueva" class="btn btn-primary btn-large">➕ Crear primera factura</a>
        </div>`;
    }

    contenido.innerHTML = html;

    // Enter en búsqueda
    const inputBusqueda = document.getElementById('busqueda-facturas');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarFacturas();
        });
    }
}


/**
 * Funciones auxiliares para la lista.
 */
function buscarFacturas() {
    const termino = document.getElementById('busqueda-facturas').value.trim();
    const fechaDesde = document.getElementById('fecha-desde-facturas').value;
    const fechaHasta = document.getElementById('fecha-hasta-facturas').value;
    const formaPago = document.getElementById('forma-pago-filtro').value;
    cargarListaFacturas(termino, fechaDesde, fechaHasta, formaPago);
}

function obtenerClaseOrigen(origen) {
    const clases = {
        'oferta': 'badge-info',
        'parte': 'badge-info',
        'manual': 'badge-secondary'
    };
    return clases[origen] || 'badge-secondary';
}

function capitalizarPago(pago) {
    const nombres = {
        'transferencia': 'Transferencia',
        'bizum': 'Bizum',
        'efectivo': 'Efectivo'
    };
    return nombres[pago] || pago;
}


// ==========================================================================
// FORMULARIO DE FACTURA (CREAR / EDITAR)
// ==========================================================================

/**
 * Carga el formulario para crear o editar una factura.
 * Soporta 3 modos: manual, desde oferta, desde parte.
 *
 * Parámetros:
 *   id (number|null): ID de la factura a editar (null = crear)
 *   origen (object|null): {tipo:'oferta'|'parte', id:X} para pre-cargar
 */
async function cargarFormularioFactura(id = null, origen = null) {
    const contenido = document.getElementById('content-area');
    const esEdicion = id !== null;

    contenido.innerHTML = '<div class="loading-spinner"><span>⏳ Cargando formulario...</span></div>';

    // Cargar clientes + datos del documento (si edición o precarga)
    const [respClientes, respFactura, respPrecarga] = await Promise.all([
        apiGet('/clientes/'),
        esEdicion ? apiGet(`/facturas/${id}`) : Promise.resolve(null),
        origen ? apiGet(`/facturas/precarga/${origen.tipo}/${origen.id}`) : Promise.resolve(null)
    ]);

    if (!respClientes.ok) {
        mostrarNotificacion('Error al cargar la lista de clientes', 'error');
        window.location.hash = '#/facturas';
        return;
    }

    let factura = null;
    if (esEdicion) {
        if (!respFactura.ok) {
            mostrarNotificacion(respFactura.error || 'Factura no encontrada', 'error');
            window.location.hash = '#/facturas';
            return;
        }
        factura = respFactura.data;
    }

    // Datos de precarga (desde oferta o parte)
    let precarga = null;
    if (respPrecarga && respPrecarga.ok) {
        precarga = respPrecarga.data;
    }

    const clientes = respClientes.data;
    const hoy = new Date().toISOString().split('T')[0];

    // Determinar valores iniciales
    const clienteId = factura ? factura.cliente_id : (precarga ? precarga.cliente_id : '');
    const descripcion = factura ? (factura.descripcion || '') : (precarga ? precarga.descripcion : '');
    const formaPago = factura ? factura.forma_pago : (precarga ? precarga.forma_pago : '');
    const fecha = factura ? factura.fecha : hoy;
    const partidas = factura ? factura.partidas : (precarga ? precarga.partidas : []);

    // IDs de vínculo (oferta o parte)
    const ofertaId = factura ? factura.oferta_id : (precarga ? precarga.oferta_id || null : null);
    const parteId = factura ? factura.parte_id : (precarga ? precarga.parte_id || null : null);

    // ====================================================================
    // RENDERIZAR HTML DEL FORMULARIO
    // ====================================================================
    let html = '';

    html += `<div class="breadcrumb"><a href="#/facturas">← Volver a facturas</a></div>`;

    // Banner de origen si aplica
    if (precarga && precarga.origen) {
        html += `
        <div class="alert alert-info">
            📎 Creando factura desde <strong>${precarga.origen.tipo === 'oferta' ? 'Oferta' : 'Parte'} ${precarga.origen.numero}</strong>
        </div>`;
    }

    html += `
    <div class="form-container">
        <form id="formulario-factura" onsubmit="guardarFactura(event, ${id})">

            <!-- Campos ocultos para vínculo -->
            <input type="hidden" id="oferta_id" value="${ofertaId || ''}">
            <input type="hidden" id="parte_id" value="${parteId || ''}">

            <!-- SECCIÓN: Datos generales -->
            <fieldset class="form-section">
                <legend>📄 Datos de la Factura</legend>
                <div class="form-row">
                    <div class="form-group">
                        <label for="fecha">Fecha *</label>
                        <input type="date" id="fecha" name="fecha"
                            value="${fecha}" required>
                    </div>
                    <div class="form-group">
                        <label for="cliente_id_factura">Cliente *</label>
                        <select id="cliente_id_factura" name="cliente_id" required>
                            <option value="">-- Seleccionar cliente --</option>
                            ${clientes.map(c => `
                                <option value="${c.id}" ${clienteId === c.id ? 'selected' : ''}>
                                    ${c.apellido}, ${c.nombre} (${c.dni})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group full-width">
                    <label for="descripcion_factura">Descripción (opcional)</label>
                    <textarea id="descripcion_factura" name="descripcion" rows="2"
                        placeholder="Notas adicionales...">${descripcion}</textarea>
                </div>
            </fieldset>

            <!-- SECCIÓN: Forma de pago -->
            <fieldset class="form-section">
                <legend>💳 Forma de Pago *</legend>
                <div class="payment-methods">
                    <label class="payment-method-option">
                        <input type="radio" name="forma_pago" value="transferencia"
                            ${formaPago === 'transferencia' ? 'checked' : ''} required>
                        <span>🏦 Transferencia bancaria</span>
                    </label>
                    <label class="payment-method-option">
                        <input type="radio" name="forma_pago" value="bizum"
                            ${formaPago === 'bizum' ? 'checked' : ''}>
                        <span>📱 Bizum</span>
                    </label>
                    <label class="payment-method-option">
                        <input type="radio" name="forma_pago" value="efectivo"
                            ${formaPago === 'efectivo' ? 'checked' : ''}>
                        <span>💵 Efectivo</span>
                    </label>
                </div>
            </fieldset>

            <!-- SECCIÓN: Conceptos/Partidas -->
            <fieldset class="form-section">
                <legend>📋 Conceptos / Partidas</legend>
                <table class="partidas-table" id="partidas-table-facturas">
                    <thead>
                        <tr>
                            <th class="col-descripcion">DESCRIPCIÓN</th>
                            <th class="col-cantidad">CANTIDAD</th>
                            <th class="col-precio">PRECIO</th>
                            <th class="col-total">TOTAL</th>
                            <th class="col-acciones"></th>
                        </tr>
                    </thead>
                    <tbody id="partidas-body-facturas">
                        ${partidas && partidas.length > 0
            ? partidas.map(p => crearFilaPartidaFacturaHTML(p.descripcion, p.cantidad, p.precio, p.total)).join('')
            : crearFilaPartidaFacturaHTML('', 1, '', 0)
        }
                    </tbody>
                </table>
                <button type="button" class="btn-add-row" onclick="agregarFilaPartidaFactura()">➕ Añadir concepto</button>
            </fieldset>

            <!-- SECCIÓN: Resumen de totales -->
            <fieldset class="form-section">
                <legend>💰 Resumen Económico</legend>
                <div class="totals-summary">
                    <div class="totals-row">
                        <span class="totals-label">Subtotal</span>
                        <span class="totals-value" id="subtotal-factura-display">0.00 €</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">IVA (${IVA_PORCENTAJE}%)</span>
                        <span class="totals-value" id="iva-factura-display">0.00 €</span>
                    </div>
                    <div class="totals-row total-row">
                        <span class="totals-label">TOTAL</span>
                        <span class="totals-value" id="total-factura-display">0.00 €</span>
                    </div>
                </div>
            </fieldset>

            <!-- BOTONES -->
            <div class="form-actions">
                <a href="#/facturas" class="btn btn-secondary">← Cancelar</a>
                <button type="submit" class="btn btn-primary" id="btn-guardar-factura">
                    <span class="btn-icon">💾</span>
                    ${esEdicion ? 'Actualizar Factura' : 'Guardar Factura'}
                </button>
            </div>
        </form>
    </div>`;

    contenido.innerHTML = html;

    // Adjuntar listeners a partidas existentes
    document.querySelectorAll('#partidas-body-facturas .partida-row').forEach(fila => {
        adjuntarListenersPartidaFactura(fila);
    });

    // Calcular totales iniciales
    calcularTotalesFactura();
}


// ==========================================================================
// PARTIDAS DE FACTURA
// ==========================================================================

/**
 * Genera el HTML de una fila de concepto/partida.
 */
function crearFilaPartidaFacturaHTML(desc, cantidad, precio, total) {
    return `
    <tr class="partida-row">
        <td><input type="text" name="partida_descripcion" value="${desc || ''}"
                placeholder="Concepto o material"></td>
        <td><input type="number" name="partida_cantidad" value="${cantidad || 1}"
                step="0.01" min="0.01" placeholder="1" class="cantidad-input"></td>
        <td><input type="number" name="partida_precio" value="${precio || ''}"
                step="0.01" min="0" placeholder="0.00" class="precio-input"></td>
        <td><input type="text" class="partida-total-input" value="${(total || 0).toFixed(2)} €" readonly></td>
        <td><button type="button" class="btn-remove-row" onclick="eliminarFilaPartidaFactura(this)">✕</button></td>
    </tr>`;
}

function agregarFilaPartidaFactura() {
    const tbody = document.getElementById('partidas-body-facturas');
    const temp = document.createElement('tbody');
    temp.innerHTML = crearFilaPartidaFacturaHTML('', 1, '', 0);
    const nuevaFila = temp.firstElementChild;
    tbody.appendChild(nuevaFila);
    adjuntarListenersPartidaFactura(nuevaFila);
}

function eliminarFilaPartidaFactura(boton) {
    const tbody = document.getElementById('partidas-body-facturas');
    const filas = tbody.querySelectorAll('.partida-row');
    if (filas.length > 1) {
        boton.closest('tr').remove();
        calcularTotalesFactura();
    } else {
        // Vaciar la única fila
        const fila = filas[0];
        fila.querySelector('input[name="partida_descripcion"]').value = '';
        fila.querySelector('.cantidad-input').value = '1';
        fila.querySelector('.precio-input').value = '';
        fila.querySelector('.partida-total-input').value = '0.00 €';
        calcularTotalesFactura();
    }
}

function adjuntarListenersPartidaFactura(fila) {
    fila.querySelector('.precio-input').addEventListener('input', () => {
        calcularTotalFilaFactura(fila);
    });
    fila.querySelector('.cantidad-input').addEventListener('input', () => {
        calcularTotalFilaFactura(fila);
    });
}

function calcularTotalFilaFactura(fila) {
    const precio = parseFloat(fila.querySelector('.precio-input').value) || 0;
    const cantidad = parseFloat(fila.querySelector('.cantidad-input').value) || 0;
    const total = precio * cantidad;
    fila.querySelector('.partida-total-input').value = total.toFixed(2) + ' €';
    calcularTotalesFactura();
}


// ==========================================================================
// CÁLCULO DE TOTALES
// ==========================================================================

/**
 * Recalcula subtotal, IVA y total de la factura.
 */
function calcularTotalesFactura() {
    let subtotal = 0;

    document.querySelectorAll('#partidas-body-facturas .partida-row').forEach(fila => {
        const precio = parseFloat(fila.querySelector('.precio-input').value) || 0;
        const cantidad = parseFloat(fila.querySelector('.cantidad-input').value) || 0;
        subtotal += precio * cantidad;
    });

    const iva = subtotal * (IVA_PORCENTAJE / 100);
    const total = subtotal + iva;

    document.getElementById('subtotal-factura-display').textContent = subtotal.toFixed(2) + ' €';
    document.getElementById('iva-factura-display').textContent = iva.toFixed(2) + ' €';
    document.getElementById('total-factura-display').textContent = total.toFixed(2) + ' €';
}


// ==========================================================================
// GUARDAR FACTURA
// ==========================================================================

/**
 * Envía los datos del formulario al backend.
 *
 * Parámetros:
 *   evento (Event): Evento del formulario
 *   id (number|null): ID de la factura (null si es creación)
 */
async function guardarFactura(evento, id) {
    evento.preventDefault();

    const boton = document.getElementById('btn-guardar-factura');
    boton.disabled = true;
    boton.textContent = '⏳ Guardando...';

    // Recoger forma de pago
    const formaPagoRadio = document.querySelector('input[name="forma_pago"]:checked');
    if (!formaPagoRadio) {
        mostrarNotificacion('Debes seleccionar una forma de pago', 'error');
        boton.disabled = false;
        boton.innerHTML = `<span class="btn-icon">💾</span> ${id ? 'Actualizar Factura' : 'Guardar Factura'}`;
        return;
    }

    // Recoger partidas del DOM
    const partidas = [];
    document.querySelectorAll('#partidas-body-facturas .partida-row').forEach(fila => {
        const desc = fila.querySelector('input[name="partida_descripcion"]').value.trim();
        const cantidad = fila.querySelector('.cantidad-input').value;
        const precio = fila.querySelector('.precio-input').value;
        if (desc) {
            partidas.push({
                descripcion: desc,
                cantidad: parseFloat(cantidad) || 1,
                precio: parseFloat(precio) || 0
            });
        }
    });

    if (partidas.length === 0) {
        mostrarNotificacion('La factura debe tener al menos un concepto', 'error');
        boton.disabled = false;
        boton.innerHTML = `<span class="btn-icon">💾</span> ${id ? 'Actualizar Factura' : 'Guardar Factura'}`;
        return;
    }

    const ofertaId = document.getElementById('oferta_id').value;
    const parteId = document.getElementById('parte_id').value;

    const datos = {
        cliente_id: parseInt(document.getElementById('cliente_id_factura').value),
        fecha: document.getElementById('fecha').value,
        descripcion: document.getElementById('descripcion_factura').value.trim(),
        forma_pago: formaPagoRadio.value,
        oferta_id: ofertaId ? parseInt(ofertaId) : null,
        parte_id: parteId ? parseInt(parteId) : null,
        partidas: partidas
    };

    // Validación frontend mínima
    if (!datos.cliente_id || !datos.fecha) {
        mostrarNotificacion('Cliente y fecha son obligatorios', 'error');
        boton.disabled = false;
        boton.innerHTML = `<span class="btn-icon">💾</span> ${id ? 'Actualizar Factura' : 'Guardar Factura'}`;
        return;
    }

    // Enviar al backend
    let respuesta;
    if (id) {
        respuesta = await apiPut(`/facturas/${id}`, datos);
    } else {
        respuesta = await apiPost('/facturas/', datos);
    }

    if (respuesta.ok) {
        mostrarNotificacion(respuesta.mensaje, 'success');
        window.location.hash = '#/facturas';
    } else {
        mostrarNotificacion(respuesta.error || 'Error al guardar la factura', 'error');
        boton.disabled = false;
        boton.innerHTML = `<span class="btn-icon">💾</span> ${id ? 'Actualizar Factura' : 'Guardar Factura'}`;
    }
}


// ==========================================================================
// ELIMINAR FACTURA
// ==========================================================================

/**
 * Elimina una factura después de confirmación.
 *
 * Parámetros:
 *   id (number): ID de la factura
 *   numero (string): Número de factura (para el mensaje)
 */
async function eliminarFactura(id, numero) {
    if (!confirm(`¿Estás seguro de eliminar la factura ${numero}?`)) {
        return;
    }

    const respuesta = await apiDelete(`/facturas/${id}`);

    if (respuesta.ok) {
        mostrarNotificacion(respuesta.mensaje, 'success');
        cargarListaFacturas();
    } else {
        mostrarNotificacion(respuesta.error || 'Error al eliminar', 'error');
    }
}
