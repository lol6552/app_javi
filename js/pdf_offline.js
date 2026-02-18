// ==========================================================================
// frontend/js/pdf_offline.js - Generación de PDFs en el navegador
// ==========================================================================
// Permite generar PDFs de Partes, Ofertas y Facturas sin conexión al backend.
// Usa las librerías jsPDF y jsPDF-AutoTable.
// ==========================================================================

const { jsPDF } = window.jspdf;

/**
 * Genera y descarga el PDF de un Parte de Trabajo.
 * 
 * @param {Object} parte - Datos del parte
 * @param {Object} cliente - Datos del cliente
 */
function generarPDFParteOffline(parte, cliente) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- CABECERA ---
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('PARTE DE TRABAJO', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Nº Parte: ${parte.numero || 'BORRADOR'}`, pageWidth - 20, 30, { align: 'right' });
    doc.text(`Fecha: ${parte.fecha_realizacion}`, pageWidth - 20, 35, { align: 'right' });

    // --- DATOS DEL CLIENTE ---
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 45, pageWidth - 40, 25, 'F');

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('Datos del Cliente:', 25, 52);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`${cliente.nombre || ''} ${cliente.apellido || ''}`, 25, 58);
    doc.text(`DNI/NIF: ${cliente.dni || '-'}`, 25, 63);
    doc.text(`Dirección: ${cliente.direccion || '-'}`, 25, 68);

    let yPos = 85;

    // --- DESCRIPCIÓN ---
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Descripción del trabajo:', 20, yPos);
    yPos += 7;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    const splitDesc = doc.splitTextToSize(parte.descripcion || '', pageWidth - 40);
    doc.text(splitDesc, 20, yPos);
    yPos += (splitDesc.length * 5) + 10;

    // --- MATERIALES (TABLA) ---
    const columnas = ['Concepto', 'Cant.', 'Precio', 'Total'];
    const filas = (parte.materiales || []).map(m => [
        m.concepto,
        m.cantidad.toString(),
        `${m.precio_unidad.toFixed(2)} €`,
        `${m.total.toFixed(2)} €`
    ]);

    doc.autoTable({
        startY: yPos,
        head: [columnas],
        body: filas,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] },
        styles: { fontSize: 9 },
        margin: { left: 20, right: 20 }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // --- TOTALES ---
    doc.setFontSize(10);

    // Alineamos a la derecha
    const xLabel = pageWidth - 60;
    const xValue = pageWidth - 20;

    doc.text('Mano de obra:', xLabel, yPos, { align: 'right' });
    doc.text(`${((parte.horas * parte.precio_hora) || 0).toFixed(2)} €`, xValue, yPos, { align: 'right' });
    yPos += 5;

    if (parte.desplazamiento > 0) {
        doc.text('Desplazamiento:', xLabel, yPos, { align: 'right' });
        doc.text(`${parte.desplazamiento.toFixed(2)} €`, xValue, yPos, { align: 'right' });
        yPos += 5;
    }

    doc.text('Materiales:', xLabel, yPos, { align: 'right' });
    doc.text(`${(parte.total_materiales || 0).toFixed(2)} €`, xValue, yPos, { align: 'right' });
    yPos += 5;

    // Línea separadora
    doc.line(xLabel - 10, yPos - 2, xValue, yPos - 2);

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', xLabel, yPos + 2, { align: 'right' });
    doc.text(`${(parte.total || 0).toFixed(2)} €`, xValue, yPos + 2, { align: 'right' });

    // --- PIE DE PÁGINA / FIRMAS ---
    yPos += 30;

    if (yPos > 250) {
        doc.addPage();
        yPos = 40;
    }

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Firma del Técnico', 40, yPos);
    doc.text('Firma del Cliente', pageWidth - 80, yPos);

    doc.line(40, yPos + 25, 90, yPos + 25);
    doc.line(pageWidth - 80, yPos + 25, pageWidth - 30, yPos + 25);

    // --- GUARDAR ---
    doc.save(`Parte_${parte.numero || 'Borrador'}.pdf`);
}
