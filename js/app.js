// ==========================================================================
// frontend/js/app.js - Router SPA y lógica general de la aplicación
// ==========================================================================
// Este archivo maneja:
// 1. Router basado en hash (ej: #/clientes, #/clientes/nuevo)
// 2. Sistema de notificaciones (reemplaza los flash de Flask)
// 3. Actualización del menú lateral (link activo)
// 4. Fecha en el header
// ==========================================================================


// ==========================================================================
// ROUTER SPA (Single Page Application)
// ==========================================================================
// El router lee el hash de la URL (lo que viene después del #)
// y carga la página correspondiente en el #content-area.
//
// Rutas disponibles:
//   #/dashboard         → Dashboard con estadísticas
//   #/clientes          → Lista de clientes
//   #/clientes/nuevo    → Formulario nuevo cliente
//   #/clientes/editar/5 → Formulario editar cliente ID=5
// ==========================================================================

/**
 * Función principal del router.
 * Lee el hash actual y llama a la función correspondiente.
 */
function navegarA() {
    // Obtenemos el hash actual (ej: "#/clientes/nuevo" → "/clientes/nuevo")
    const hash = window.location.hash.slice(1) || '/dashboard';

    // Dividimos la ruta en partes (ej: "/clientes/editar/5" → ["", "clientes", "editar", "5"])
    const partes = hash.split('/');
    const seccion = partes[1] || 'dashboard';   // "clientes", "ofertas", etc.
    const accion = partes[2] || 'lista';          // "nuevo", "editar", "lista"
    const id = partes[3] || null;                 // ID del recurso (si existe)

    // Actualizamos el menú lateral (marcamos el link activo)
    actualizarMenuActivo(seccion);

    // Según la sección, llamamos a la función correspondiente
    switch (seccion) {
        case 'dashboard':
            cargarDashboard();
            actualizarTitulo('Dashboard');
            break;

        case 'clientes':
            if (accion === 'nuevo') {
                cargarFormularioCliente();
                actualizarTitulo('Nuevo Cliente');
            } else if (accion === 'editar' && id) {
                cargarFormularioCliente(id);
                actualizarTitulo('Editar Cliente');
            } else {
                cargarListaClientes();
                actualizarTitulo('Gestión de Clientes');
            }
            break;

        case 'ofertas':
            if (accion === 'nueva') {
                cargarFormularioOferta();
                actualizarTitulo('Nueva Oferta');
            } else if (accion === 'editar' && id) {
                cargarFormularioOferta(id);
                actualizarTitulo('Editar Oferta');
            } else {
                cargarListaOfertas();
                actualizarTitulo('Gestión de Ofertas');
            }
            break;

        // === Secciones futuras (Fase 3, 4) ===
        case 'partes':
            if (accion === 'nuevo') {
                cargarFormularioParte();
                actualizarTitulo('Nuevo Parte de Trabajo');
            } else if (accion === 'editar' && id) {
                cargarFormularioParte(id);
                actualizarTitulo('Editar Parte de Trabajo');
            } else {
                cargarListaPartes();
                actualizarTitulo('Partes de Trabajo');
            }
            break;

        // === Facturas (Fase 4) ===
        case 'facturas':
            if (accion === 'nueva') {
                cargarFormularioFactura();
                actualizarTitulo('Nueva Factura');
            } else if (accion === 'editar' && id) {
                cargarFormularioFactura(id);
                actualizarTitulo('Editar Factura');
            } else if (accion === 'desde-oferta' && id) {
                cargarFormularioFactura(null, { tipo: 'oferta', id: id });
                actualizarTitulo('Nueva Factura desde Oferta');
            } else if (accion === 'desde-parte' && id) {
                cargarFormularioFactura(null, { tipo: 'parte', id: id });
                actualizarTitulo('Nueva Factura desde Parte');
            } else {
                cargarListaFacturas();
                actualizarTitulo('Gestión de Facturas');
            }
            break;

        default:
            cargarDashboard();
            actualizarTitulo('Dashboard');
            break;
    }
}


// ==========================================================================
// FUNCIONES DEL MENÚ
// ==========================================================================

/**
 * Marca como "activo" el enlace del menú que corresponde
 * a la sección actual.
 *
 * Parámetros:
 *   seccion (string): Nombre de la sección ("dashboard", "clientes", etc.)
 */
function actualizarMenuActivo(seccion) {
    // Quitamos la clase "active" de todos los links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Añadimos "active" al link que corresponde a la sección actual
    const linkActivo = document.querySelector(`.nav-link[data-seccion="${seccion}"]`);
    if (linkActivo) {
        linkActivo.classList.add('active');
    }
}


/**
 * Actualiza el título de la página (en el header superior).
 *
 * Parámetros:
 *   titulo (string): Texto del título
 */
function actualizarTitulo(titulo) {
    document.getElementById('page-title').textContent = titulo;
    document.title = `${titulo} | Gestión Empresarial`;
}


// ==========================================================================
// SISTEMA DE NOTIFICACIONES
// ==========================================================================
// Reemplaza los flash() de Flask.
// Muestra mensajes temporales en la parte superior del contenido.

/**
 * Muestra un mensaje de notificación al usuario.
 *
 * Parámetros:
 *   mensaje (string): Texto del mensaje
 *   tipo (string): "success", "error" o "info"
 *   duracion (number): Milisegundos antes de desaparecer (por defecto 5000)
 */
function mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
    const contenedor = document.getElementById('flash-messages');

    // Icono según el tipo de notificación
    let icono = 'ℹ';
    if (tipo === 'success') icono = '✓';
    if (tipo === 'error') icono = '✗';

    // Creamos el elemento HTML de la notificación
    const notificacion = document.createElement('div');
    notificacion.className = `flash-message flash-${tipo}`;
    notificacion.innerHTML = `
        <span class="flash-icon">${icono}</span>
        <span class="flash-text">${mensaje}</span>
        <button class="flash-close" onclick="this.parentElement.remove()">×</button>
    `;

    // Añadimos al contenedor
    contenedor.appendChild(notificacion);

    // Eliminamos automáticamente después de la duración
    setTimeout(() => {
        if (notificacion.parentElement) {
            notificacion.remove();
        }
    }, duracion);
}


// ==========================================================================
// PÁGINA "PRÓXIMAMENTE"
// ==========================================================================

/**
 * Muestra un mensaje indicando que la sección aún no está migrada.
 *
 * Parámetros:
 *   seccion (string): Nombre de la sección
 */
function mostrarProximamente(seccion) {
    const nombres = {
        'ofertas': 'Ofertas',
        'partes': 'Partes de Trabajo',
        'facturas': 'Facturas'
    };

    const contenido = document.getElementById('content-area');
    contenido.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">🚧</div>
            <h3>${nombres[seccion] || seccion} — Próximamente</h3>
            <p>Esta sección se está migrando al nuevo sistema.</p>
            <p>Mientras tanto, puedes seguir usando la versión actual del monolito.</p>
        </div>
    `;

    actualizarTitulo(nombres[seccion] || seccion);
}


// ==========================================================================
// UTILIDADES
// ==========================================================================

/**
 * Muestra la fecha actual en el header.
 */
function actualizarFecha() {
    const hoy = new Date();
    const opciones = { day: '2-digit', month: '2-digit', year: 'numeric' };
    document.getElementById('header-date').textContent = hoy.toLocaleDateString('es-ES', opciones);
}


// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
// Cuando la página se carga por primera vez:
// 1. Mostramos la fecha actual
// 2. Navegamos a la ruta que indica el hash
// 3. Escuchamos cambios en el hash para navegar

// Evento: cuando la página se carga
document.addEventListener('DOMContentLoaded', () => {
    // Mostramos la fecha en el header
    actualizarFecha();

    // Navegamos a la ruta actual (o al dashboard si no hay hash)
    navegarA();
});

// Evento: cuando el hash de la URL cambia (usuario hace clic en un enlace)
window.addEventListener('hashchange', navegarA);
