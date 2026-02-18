// ==========================================================================
// frontend/js/dashboard.js - Lógica del dashboard
// ==========================================================================
// Carga las estadísticas desde la API y renderiza las gráficas y KPIs.
//
// Se comunica con:
//   GET /api/dashboard → Estadísticas, KPIs, facturación mensual
// ==========================================================================


/**
 * Carga el dashboard completo: KPIs, gráficas, estadísticas y alertas.
 *
 * Hace una petición GET /api/dashboard al backend y renderiza
 * todos los datos en el #content-area.
 */
async function cargarDashboard() {
    const contenido = document.getElementById('content-area');

    // Mostramos spinner de carga
    contenido.innerHTML = '<div class="loading-spinner"><span>⏳ Cargando dashboard...</span></div>';

    // Hacemos la petición al backend
    const respuesta = await apiGet('/dashboard');

    // Si hay error, mostramos mensaje
    if (!respuesta.ok) {
        contenido.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Error al cargar el dashboard</h3>
                <p>${respuesta.error || 'Error desconocido'}</p>
                <button class="btn btn-primary" onclick="cargarDashboard()">🔄 Reintentar</button>
            </div>
        `;
        return;
    }

    // Extraemos los datos de la respuesta
    const datos = respuesta.data;
    const estadisticas = datos.estadisticas;
    const kpis = datos.kpis;
    const estados_ofertas = datos.estados_ofertas;
    const facturacion_mensual = datos.facturacion_mensual;
    const facturas_vencidas = datos.facturas_vencidas;

    // ========================================================================
    // RENDERIZAR HTML DEL DASHBOARD
    // ========================================================================
    let html = '';

    // ---- SECCIÓN: KPIs Principales ----
    html += `
    <div class="kpi-row">
        <div class="kpi-card kpi-highlight">
            <span class="kpi-icon">💰</span>
            <div class="kpi-content">
                <span class="kpi-value">${kpis.total_mes_actual.toFixed(2)} €</span>
                <span class="kpi-label">Facturado este mes</span>
            </div>
        </div>
        <div class="kpi-card">
            <span class="kpi-icon">🎯</span>
            <div class="kpi-content">
                <span class="kpi-value">${estados_ofertas.tasa_conversion}%</span>
                <span class="kpi-label">Tasa de conversión</span>
            </div>
        </div>
        <div class="kpi-card">
            <span class="kpi-icon">📊</span>
            <div class="kpi-content">
                <span class="kpi-value">${kpis.ticket_medio.toFixed(2)} €</span>
                <span class="kpi-label">Ticket medio</span>
            </div>
        </div>
        <div class="kpi-card ${facturas_vencidas.length > 0 ? 'kpi-warning' : ''}">
            <span class="kpi-icon">⚠️</span>
            <div class="kpi-content">
                <span class="kpi-value">${facturas_vencidas.length}</span>
                <span class="kpi-label">Facturas vencidas (+30d)</span>
            </div>
        </div>
    </div>`;

    // ---- SECCIÓN: Gráficas ----
    html += `
    <div class="charts-row">
        <div class="chart-card">
            <h3>📈 Facturación Mensual</h3>
            <canvas id="chartFacturacion" height="200"></canvas>
        </div>
        <div class="chart-card chart-small">
            <h3>📊 Estado de Ofertas</h3>
            <canvas id="chartOfertas" height="200"></canvas>
            <div class="chart-legend">
                <span class="legend-item legend-pending">● Pendientes: ${estados_ofertas.pendientes}</span>
                <span class="legend-item legend-accepted">● Aceptadas: ${estados_ofertas.aceptadas}</span>
                <span class="legend-item legend-rejected">● Rechazadas: ${estados_ofertas.rechazadas}</span>
            </div>
        </div>
    </div>`;

    // ---- SECCIÓN: Tarjetas de estadísticas ----
    html += `
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon clients">👥</div>
            <div class="stat-content">
                <span class="stat-value">${estadisticas.total_clientes}</span>
                <span class="stat-label">Clientes</span>
            </div>
            <a href="#/clientes" class="stat-link">Ver todos →</a>
        </div>
        <div class="stat-card">
            <div class="stat-icon offers">📝</div>
            <div class="stat-content">
                <span class="stat-value">${estadisticas.total_ofertas}</span>
                <span class="stat-label">Ofertas</span>
            </div>
            <a href="#/ofertas" class="stat-link">Ver todas →</a>
        </div>
        <div class="stat-card">
            <div class="stat-icon parts">🔧</div>
            <div class="stat-content">
                <span class="stat-value">${estadisticas.total_partes}</span>
                <span class="stat-label">Partes de Trabajo</span>
            </div>
            <a href="#/partes" class="stat-link">Ver todos →</a>
        </div>
        <div class="stat-card">
            <div class="stat-icon invoices">📄</div>
            <div class="stat-content">
                <span class="stat-value">${estadisticas.total_facturas}</span>
                <span class="stat-label">Facturas</span>
            </div>
            <a href="#/facturas" class="stat-link">Ver todas →</a>
        </div>
    </div>`;

    // ---- SECCIÓN: Facturas vencidas ----
    if (facturas_vencidas.length > 0) {
        html += `
        <div class="alert-section">
            <h3>⚠️ Facturas Pendientes de Cobro (+30 días)</h3>
            <table class="alert-table">
                <thead>
                    <tr>
                        <th>Nº Factura</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Total</th>
                        <th>Días</th>
                    </tr>
                </thead>
                <tbody>
                    ${facturas_vencidas.slice(0, 5).map(f => `
                    <tr>
                        <td>${f.numero}</td>
                        <td>${f.cliente_nombre}</td>
                        <td>${f.fecha}</td>
                        <td><strong>${f.total.toFixed(2)} €</strong></td>
                        <td class="days-overdue">${f.dias_vencida}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            ${facturas_vencidas.length > 5 ? `<p class="alert-more">...y ${facturas_vencidas.length - 5} más. <a href="#/facturas">Ver todas</a></p>` : ''}
        </div>`;
    }

    // ---- SECCIÓN: Acciones rápidas ----
    html += `
    <div class="quick-actions">
        <h3>Acciones rápidas</h3>
        <div class="actions-grid">
            <a href="#/clientes/nuevo" class="action-button primary">
                <span class="action-icon">➕</span>
                <span class="action-text">Nuevo Cliente</span>
            </a>
            <a href="#/ofertas/nueva" class="action-button secondary">
                <span class="action-icon">📝</span>
                <span class="action-text">Nueva Oferta</span>
            </a>
            <a href="#/partes/nuevo" class="action-button secondary">
                <span class="action-icon">🔧</span>
                <span class="action-text">Nuevo Parte</span>
            </a>
            <a href="#/facturas/nueva" class="action-button secondary">
                <span class="action-icon">📄</span>
                <span class="action-text">Nueva Factura</span>
            </a>
        </div>
    </div>`;

    // Insertamos el HTML en el contenido
    contenido.innerHTML = html;

    // ========================================================================
    // RENDERIZAR GRÁFICAS CON CHART.JS
    // ========================================================================

    // Gráfica de barras: Facturación Mensual
    const ctxFacturacion = document.getElementById('chartFacturacion').getContext('2d');
    new Chart(ctxFacturacion, {
        type: 'bar',
        data: {
            labels: facturacion_mensual.etiquetas,
            datasets: [{
                label: 'Facturación (€)',
                data: facturacion_mensual.valores,
                backgroundColor: 'rgba(26, 51, 77, 0.8)',
                borderColor: 'rgba(26, 51, 77, 1)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return value + ' €';
                        }
                    }
                }
            }
        }
    });

    // Gráfica de donut: Estados de Ofertas
    const ctxOfertas = document.getElementById('chartOfertas').getContext('2d');
    new Chart(ctxOfertas, {
        type: 'doughnut',
        data: {
            labels: ['Pendientes', 'Aceptadas', 'Rechazadas'],
            datasets: [{
                data: [
                    estados_ofertas.pendientes,
                    estados_ofertas.aceptadas,
                    estados_ofertas.rechazadas
                ],
                backgroundColor: [
                    '#f59e0b', // Amarillo - Pendientes
                    '#10b981', // Verde - Aceptadas  
                    '#ef4444'  // Rojo - Rechazadas
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            cutout: '60%'
        }
    });
}
