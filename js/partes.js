// ==========================================================================
// frontend/js/partes.js - Módulo CRUD de Partes de Trabajo
// ==========================================================================
// Maneja la lista de partes, formulario de crear/editar (con control horario,
// desplazamiento y partidas de materiales), y eliminación.
//
// Se comunica con:
//   GET    /api/partes/         → Lista
//   GET    /api/partes/<id>     → Obtener uno (con partidas)
//   POST   /api/partes/         → Crear
//   PUT    /api/partes/<id>     → Editar
//   DELETE /api/partes/<id>     → Eliminar
// ==========================================================================


// ==========================================================================
// LISTA DE PARTES
// ==========================================================================

/**
 * Carga y muestra la lista de partes de trabajo con búsqueda y filtros de fecha.
 *
 * Parámetros:
 *   termino (string): Texto de búsqueda
 *   fechaDesde (string): Fecha mínima (AAAA-MM-DD)
 *   fechaHasta (string): Fecha máxima (AAAA-MM-DD)
 */
async function cargarListaPartes(termino = '', fechaDesde = '', fechaHasta = '') {
    const contenido = document.getElementById('content-area');
    contenido.innerHTML = '<div class="loading-spinner"><span>⏳ Cargando partes...</span></div>';

    // Construir URL con parámetros
    let params = [];
    if (termino) params.push(`q=${encodeURIComponent(termino)}`);
    if (fechaDesde) params.push(`fecha_desde=${encodeURIComponent(fechaDesde)}`);
    if (fechaHasta) params.push(`fecha_hasta=${encodeURIComponent(fechaHasta)}`);
    let url = '/partes/' + (params.length > 0 ? '?' + params.join('&') : '');

    const respuesta = await apiGet(url);

    if (!respuesta.ok) {
        contenido.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Error al cargar los partes</h3>
                <p>${respuesta.error || 'Error desconocido'}</p>
                <button class="btn btn-primary" onclick="cargarListaPartes()">🔄 Reintentar</button>
            </div>
        `;
        return;
    }

    const partes = respuesta.data;

    // ====================================================================
    // RENDERIZAR HTML
    // ====================================================================
    let html = '';

    // ---- Cabecera con buscador, filtros de fecha y botón "Nuevo" ----
    html += `
    <div class="section-header">
        <div class="section-info">
            <p class="section-description">
                Partes de trabajo realizados. Total: <strong>${partes.length}</strong> parte${partes.length !== 1 ? 's' : ''}.
            </p>
        </div>

        <div class="search-container">
            <div class="search-form partes-search-form">
                <div class="search-input-wrapper">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="busqueda-partes" value="${termino}"
                        placeholder="Buscar por cliente o número..." class="search-input">
                    ${termino ? '<button class="search-clear" onclick="cargarListaPartes()" title="Limpiar">✕</button>' : ''}
                </div>

                <div class="date-filters">
                    <input type="date" id="fecha-desde-partes" value="${fechaDesde}"
                        class="date-filter-input" title="Fecha desde">
                    <span class="date-separator">→</span>
                    <input type="date" id="fecha-hasta-partes" value="${fechaHasta}"
                        class="date-filter-input" title="Fecha hasta">
                </div>

                <button class="btn btn-secondary" onclick="buscarPartes()">Buscar</button>
            </div>
        </div>

        <div class="section-actions">
            <a href="#/partes/nuevo" class="btn btn-primary">
                <span class="btn-icon">➕</span>
                Nuevo Parte
            </a>
        </div>
    </div>`;

    // ---- Tabla de partes o mensaje vacío ----
    if (partes.length > 0) {
        html += `
        <div class="table-container">
            <table class="data-table" id="tabla-partes">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Horas</th>
                        <th>Total</th>
                        <th class="actions-column">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${partes.map(p => `
                    <tr>
                        <td><span class="offer-code">${p.numero}</span></td>
                        <td>
                            <div class="client-name">
                                <span class="name-initial">${p.cliente_nombre[0]}${p.cliente_nombre.split(' ').pop()[0]}</span>
                                <span>${p.cliente_nombre}</span>
                            </div>
                        </td>
                        <td>${p.fecha_display}</td>
                        <td><span class="badge badge-info">${p.horas_trabajo}h</span></td>
                        <td><span class="amount">${p.total.toFixed(2)} €</span></td>
                        <td class="actions-column">
                            <div class="action-buttons">
                                <button class="btn btn-small btn-pdf" title="Generar PDF"
                                    onclick="window.open(API_BASE_URL + '/pdfs/parte/${p.id}', '_blank')">📄</button>
                                <a href="#/partes/editar/${p.id}" class="btn btn-small btn-edit" title="Editar">✏️</a>
                                <button class="btn btn-small btn-delete" title="Eliminar"
                                    onclick="eliminarParte(${p.id}, '${p.numero}')"
                                    ${p.tiene_facturas ? 'disabled' : ''}>🗑️</button>
                            </div>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    } else {
        html += `
        <div class="empty-state">
            <div class="empty-icon">🔧</div>
            <h3>No hay partes de trabajo registrados</h3>
            <p>Comienza registrando tu primer parte de trabajo.</p>
            <a href="#/partes/nuevo" class="btn btn-primary btn-large">➕ Crear primer parte</a>
        </div>`;
    }

    contenido.innerHTML = html;

    // Configurar Enter en búsqueda
    const inputBusqueda = document.getElementById('busqueda-partes');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarPartes();
        });
    }
}


/**
 * Lee los filtros y recarga la lista.
 */
function buscarPartes() {
    const termino = document.getElementById('busqueda-partes').value.trim();
    const fechaDesde = document.getElementById('fecha-desde-partes').value;
    const fechaHasta = document.getElementById('fecha-hasta-partes').value;
    cargarListaPartes(termino, fechaDesde, fechaHasta);
}


// ==========================================================================
// FORMULARIO DE PARTES (CREAR / EDITAR)
// ==========================================================================

/**
 * Carga el formulario para crear o editar un parte de trabajo.
 * Incluye: datos generales, control horario, desplazamiento,
 * partidas de materiales y cálculo en tiempo real.
 *
 * Parámetros:
 *   id (number, opcional): ID del parte a editar
 */
async function cargarFormularioParte(id = null) {
    const contenido = document.getElementById('content-area');
    const esEdicion = id !== null;

    contenido.innerHTML = '<div class="loading-spinner"><span>⏳ Cargando formulario...</span></div>';

    // Cargamos clientes y (si edición) el parte en paralelo
    const [respClientes, respParte] = await Promise.all([
        apiGet('/clientes/'),
        esEdicion ? apiGet(`/partes/${id}`) : Promise.resolve(null)
    ]);

    if (!respClientes.ok) {
        mostrarNotificacion('Error al cargar la lista de clientes', 'error');
        window.location.hash = '#/partes';
        return;
    }

    let parte = null;
    if (esEdicion) {
        if (!respParte.ok) {
            mostrarNotificacion(respParte.error || 'Parte no encontrado', 'error');
            window.location.hash = '#/partes';
            return;
        }
        parte = respParte.data;
    }

    const clientes = respClientes.data;
    const hoy = new Date().toISOString().split('T')[0];

    // ====================================================================
    // RENDERIZAR HTML DEL FORMULARIO
    // ====================================================================
    let html = '';

    html += `<div class="breadcrumb"><a href="#/partes">← Volver a partes</a></div>`;

    html += `
    <div class="form-container">
        <form id="formulario-parte" onsubmit="guardarParte(event, ${id})">

            <!-- SECCIÓN: Datos generales -->
            <fieldset class="form-section">
                <legend>📋 Datos del Parte</legend>
                <div class="form-row">
                    <div class="form-group">
                        <label for="fecha_realizacion">Fecha *</label>
                        <input type="date" id="fecha_realizacion" name="fecha_realizacion"
                            value="${parte ? parte.fecha_realizacion : hoy}" required>
                    </div>
                    <div class="form-group">
                        <label for="cliente_id">Cliente *</label>
                        <select id="cliente_id" name="cliente_id" required>
                            <option value="">-- Seleccionar cliente --</option>
                            ${clientes.map(c => `
                                <option value="${c.id}" ${parte && parte.cliente_id === c.id ? 'selected' : ''}>
                                    ${c.apellido}, ${c.nombre} (${c.dni})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group full-width">
                    <label for="descripcion">Descripción del trabajo *</label>
                    <textarea id="descripcion" name="descripcion" rows="3"
                        placeholder="Descripción del trabajo realizado..."
                        required>${parte ? (parte.descripcion || '') : ''}</textarea>
                </div>
            </fieldset>

            <!-- SECCIÓN: Control horario -->
            <fieldset class="form-section">
                <legend>⏰ Control Horario</legend>
                <div class="form-row">
                    <div class="form-group">
                        <label for="hora_inicio">Hora Inicio *</label>
                        <input type="time" id="hora_inicio" name="hora_inicio"
                            value="${parte ? parte.hora_inicio : '09:00'}" required>
                    </div>
                    <div class="form-group">
                        <label for="hora_fin">Hora Fin *</label>
                        <input type="time" id="hora_fin" name="hora_fin"
                            value="${parte ? parte.hora_fin : '14:00'}" required>
                    </div>
                    <div class="form-group">
                        <label for="horas_trabajo_display">Horas Trabajadas</label>
                        <input type="text" id="horas_trabajo_display" readonly
                            value="${parte ? parte.horas_trabajo + 'h' : '5.00h'}"
                            class="readonly-field">
                    </div>
                    <div class="form-group">
                        <label for="precio_hora_trabajo">Precio/Hora (€) *</label>
                        <input type="number" id="precio_hora_trabajo" step="0.01" min="0"
                            value="${parte ? parte.precio_hora_trabajo : '35.00'}" required>
                    </div>
                </div>
            </fieldset>

            <!-- SECCIÓN: Desplazamiento -->
            <fieldset class="form-section">
                <legend>🚗 Desplazamiento (opcional)</legend>
                <div class="form-row">
                    <div class="form-group">
                        <label for="horas_desplazamiento">Horas Desplazamiento</label>
                        <input type="number" id="horas_desplazamiento" step="0.01" min="0"
                            value="${parte ? parte.horas_desplazamiento : '0'}">
                    </div>
                    <div class="form-group">
                        <label for="precio_hora_desplazamiento">Precio/Hora Despl. (€)</label>
                        <input type="number" id="precio_hora_desplazamiento" step="0.01" min="0"
                            value="${parte ? parte.precio_hora_desplazamiento : '0'}">
                    </div>
                </div>
            </fieldset>

            <!-- SECCIÓN: Materiales (partidas) -->
            <fieldset class="form-section">
                <legend>🧱 Materiales Utilizados (opcional)</legend>
                <table class="partidas-table" id="partidas-table-partes">
                    <thead>
                        <tr>
                            <th class="col-descripcion">DESCRIPCIÓN</th>
                            <th class="col-cantidad">CANTIDAD</th>
                            <th class="col-precio">PRECIO</th>
                            <th class="col-total">TOTAL</th>
                            <th class="col-acciones"></th>
                        </tr>
                    </thead>
                    <tbody id="partidas-body-partes">
                        ${parte && parte.partidas && parte.partidas.length > 0
            ? parte.partidas.map(p => crearFilaPartidaParteHTML(p.descripcion, p.cantidad, p.precio, p.total)).join('')
            : crearFilaPartidaParteHTML('', 1, '', 0)
        }
                    </tbody>
                </table>
                <button type="button" class="btn-add-row" onclick="agregarFilaPartidaParte()">➕ Añadir material</button>
            </fieldset>

            <!-- SECCIÓN: Resumen de totales -->
            <fieldset class="form-section">
                <legend>💰 Resumen Económico</legend>
                <div class="totals-summary">
                    <div class="totals-row">
                        <span class="totals-label">Subtotal Trabajo</span>
                        <span class="totals-value" id="subtotal-trabajo-display">0.00 €</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">Subtotal Desplazamiento</span>
                        <span class="totals-value" id="subtotal-desplazamiento-display">0.00 €</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">Subtotal Materiales</span>
                        <span class="totals-value" id="subtotal-materiales-display">0.00 €</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">Subtotal General</span>
                        <span class="totals-value" id="subtotal-general-display">0.00 €</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">IVA (${IVA_PORCENTAJE}%)</span>
                        <span class="totals-value" id="iva-parte-display">0.00 €</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">TOTAL</span>
                        <span class="totals-value" id="total-parte-display">0.00 €</span>
                    </div>
                </div>
            </fieldset>

            <!-- BOTONES -->
            <div class="form-actions">
                <a href="#/partes" class="btn btn-secondary">← Cancelar</a>
                <button type="submit" class="btn btn-primary" id="btn-guardar-parte">
                    <span class="btn-icon">💾</span>
                    ${esEdicion ? 'Actualizar Parte' : 'Guardar Parte'}
                </button>
            </div>
        </form>
    </div>`;

    contenido.innerHTML = html;

    // Adjuntar listeners a campos que afectan los cálculos
    ['hora_inicio', 'hora_fin', 'precio_hora_trabajo',
        'horas_desplazamiento', 'precio_hora_desplazamiento'].forEach(campo => {
            document.getElementById(campo).addEventListener('input', calcularTotalesParte);
        });

    // Adjuntar listeners a partidas de materiales existentes
    document.querySelectorAll('#partidas-body-partes .partida-row').forEach(fila => {
        adjuntarListenersPartidaParte(fila);
    });

    // Calcular totales iniciales
    calcularTotalesParte();
}


// ==========================================================================
// PARTIDAS DE MATERIALES
// ==========================================================================

/**
 * Genera el HTML de una fila de material.
 */
function crearFilaPartidaParteHTML(desc, cantidad, precio, total) {
    return `
    <tr class="partida-row">
        <td><input type="text" name="partida_descripcion" value="${desc}"
                placeholder="Material utilizado"></td>
        <td><input type="number" name="partida_cantidad" value="${cantidad}"
                step="0.01" min="0.01" placeholder="1" class="cantidad-input"></td>
        <td><input type="number" name="partida_precio" value="${precio}"
                step="0.01" min="0" placeholder="0.00" class="precio-input"></td>
        <td><input type="text" class="partida-total-input" value="${(total || 0).toFixed(2)} €" readonly></td>
        <td><button type="button" class="btn-remove-row" onclick="eliminarFilaPartidaParte(this)">✕</button></td>
    </tr>`;
}

function agregarFilaPartidaParte() {
    const tbody = document.getElementById('partidas-body-partes');
    const temp = document.createElement('tbody');
    temp.innerHTML = crearFilaPartidaParteHTML('', 1, '', 0);
    const nuevaFila = temp.firstElementChild;
    tbody.appendChild(nuevaFila);
    adjuntarListenersPartidaParte(nuevaFila);
}

function eliminarFilaPartidaParte(boton) {
    const tbody = document.getElementById('partidas-body-partes');
    const filas = tbody.querySelectorAll('.partida-row');
    if (filas.length > 1) {
        boton.closest('tr').remove();
        calcularTotalesParte();
    } else {
        // Si solo hay 1, la vaciamos en vez de eliminar
        const fila = filas[0];
        fila.querySelector('input[name="partida_descripcion"]').value = '';
        fila.querySelector('.cantidad-input').value = '1';
        fila.querySelector('.precio-input').value = '';
        fila.querySelector('.partida-total-input').value = '0.00 €';
        calcularTotalesParte();
    }
}

function adjuntarListenersPartidaParte(fila) {
    const precioInput = fila.querySelector('.precio-input');
    const cantidadInput = fila.querySelector('.cantidad-input');
    precioInput.addEventListener('input', () => {
        calcularTotalFilaParte(fila);
    });
    cantidadInput.addEventListener('input', () => {
        calcularTotalFilaParte(fila);
    });
}

function calcularTotalFilaParte(fila) {
    const precio = parseFloat(fila.querySelector('.precio-input').value) || 0;
    const cantidad = parseFloat(fila.querySelector('.cantidad-input').value) || 0;
    const total = precio * cantidad;
    fila.querySelector('.partida-total-input').value = total.toFixed(2) + ' €';
    calcularTotalesParte();
}


// ==========================================================================
// CÁLCULO DE TOTALES
// ==========================================================================

/**
 * Recalcula todos los totales del parte: trabajo, desplazamiento,
 * materiales, subtotal, IVA y total.
 */
function calcularTotalesParte() {
    // ---- Horas de trabajo ----
    const horaInicioStr = document.getElementById('hora_inicio').value;
    const horaFinStr = document.getElementById('hora_fin').value;
    const precioHoraTrabajo = parseFloat(document.getElementById('precio_hora_trabajo').value) || 0;

    let horasTrabajo = 0;
    if (horaInicioStr && horaFinStr) {
        const [hi, mi] = horaInicioStr.split(':').map(Number);
        const [hf, mf] = horaFinStr.split(':').map(Number);
        const minutosInicio = hi * 60 + mi;
        const minutosFin = hf * 60 + mf;
        if (minutosFin > minutosInicio) {
            horasTrabajo = (minutosFin - minutosInicio) / 60;
        }
    }
    document.getElementById('horas_trabajo_display').value = horasTrabajo.toFixed(2) + 'h';

    // ---- Desplazamiento ----
    const horasDesplazamiento = parseFloat(document.getElementById('horas_desplazamiento').value) || 0;
    const precioHoraDesplazamiento = parseFloat(document.getElementById('precio_hora_desplazamiento').value) || 0;

    // ---- Materiales ----
    let materialesImporte = 0;
    document.querySelectorAll('#partidas-body-partes .partida-row').forEach(fila => {
        const precio = parseFloat(fila.querySelector('.precio-input').value) || 0;
        const cantidad = parseFloat(fila.querySelector('.cantidad-input').value) || 0;
        materialesImporte += precio * cantidad;
    });

    // ---- Subtotales ----
    const subtotalTrabajo = horasTrabajo * precioHoraTrabajo;
    const subtotalDesplazamiento = horasDesplazamiento * precioHoraDesplazamiento;
    const subtotalGeneral = subtotalTrabajo + subtotalDesplazamiento + materialesImporte;
    const iva = subtotalGeneral * (IVA_PORCENTAJE / 100);
    const total = subtotalGeneral + iva;

    // ---- Actualizar displays ----
    document.getElementById('subtotal-trabajo-display').textContent = subtotalTrabajo.toFixed(2) + ' €';
    document.getElementById('subtotal-desplazamiento-display').textContent = subtotalDesplazamiento.toFixed(2) + ' €';
    document.getElementById('subtotal-materiales-display').textContent = materialesImporte.toFixed(2) + ' €';
    document.getElementById('subtotal-general-display').textContent = subtotalGeneral.toFixed(2) + ' €';
    document.getElementById('iva-parte-display').textContent = iva.toFixed(2) + ' €';
    document.getElementById('total-parte-display').textContent = total.toFixed(2) + ' €';
}


// ==========================================================================
// GUARDAR PARTE (CREAR / EDITAR)
// ==========================================================================

/**
 * Envía los datos del formulario al backend.
 *
 * Parámetros:
 *   evento (Event): Evento del formulario
 *   id (number|null): ID del parte (null si es creación)
 */
async function guardarParte(evento, id) {
    evento.preventDefault();

    const boton = document.getElementById('btn-guardar-parte');
    boton.disabled = true;
    boton.textContent = '⏳ Guardando...';

    // Recoger partidas de materiales del DOM
    const partidas = [];
    document.querySelectorAll('#partidas-body-partes .partida-row').forEach(fila => {
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

    const datos = {
        cliente_id: parseInt(document.getElementById('cliente_id').value),
        fecha_realizacion: document.getElementById('fecha_realizacion').value,
        descripcion: document.getElementById('descripcion').value.trim(),
        hora_inicio: document.getElementById('hora_inicio').value,
        hora_fin: document.getElementById('hora_fin').value,
        precio_hora_trabajo: parseFloat(document.getElementById('precio_hora_trabajo').value) || 0,
        horas_desplazamiento: parseFloat(document.getElementById('horas_desplazamiento').value) || 0,
        precio_hora_desplazamiento: parseFloat(document.getElementById('precio_hora_desplazamiento').value) || 0,
        partidas: partidas
    };

    // Validación frontend mínima
    if (!datos.cliente_id || !datos.fecha_realizacion || !datos.descripcion) {
        mostrarNotificacion('Cliente, fecha y descripción son obligatorios', 'error');
        boton.disabled = false;
        boton.innerHTML = `<span class="btn-icon">💾</span> ${id ? 'Actualizar Parte' : 'Guardar Parte'}`;
        return;
    }

    if (!datos.hora_inicio || !datos.hora_fin) {
        mostrarNotificacion('Las horas de inicio y fin son obligatorias', 'error');
        boton.disabled = false;
        boton.innerHTML = `<span class="btn-icon">💾</span> ${id ? 'Actualizar Parte' : 'Guardar Parte'}`;
        return;
    }

    // Enviar al backend
    let respuesta;
    if (id) {
        respuesta = await apiPut(`/partes/${id}`, datos);
    } else {
        respuesta = await apiPost('/partes/', datos);
    }

    if (respuesta.ok) {
        mostrarNotificacion(respuesta.mensaje, 'success');
        window.location.hash = '#/partes';
    } else {
        mostrarNotificacion(respuesta.error || 'Error al guardar el parte', 'error');
        boton.disabled = false;
        boton.innerHTML = `<span class="btn-icon">💾</span> ${id ? 'Actualizar Parte' : 'Guardar Parte'}`;
    }
}


// ==========================================================================
// ELIMINAR PARTE
// ==========================================================================

/**
 * Elimina un parte de trabajo después de confirmación.
 *
 * Parámetros:
 *   id (number): ID del parte
 *   numero (string): Número del parte (para el mensaje)
 */
async function eliminarParte(id, numero) {
    if (!confirm(`¿Estás seguro de eliminar el parte ${numero}?`)) {
        return;
    }

    const respuesta = await apiDelete(`/partes/${id}`);

    if (respuesta.ok) {
        mostrarNotificacion(respuesta.mensaje, 'success');
        cargarListaPartes();
    } else {
        mostrarNotificacion(respuesta.error || 'Error al eliminar', 'error');
    }
}
