import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function generatePDF(data: any[]) {
  console.log('📥 Datos recibidos para el PDF:', JSON.stringify(data, null, 2));

  if (!data || data.length === 0) {
    console.error('❌ No se recibieron datos para generar el PDF');
    return new ArrayBuffer(0);
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Título
  doc.setFontSize(18);
  doc.text('Reporte de Supervisión', 15, 20);

  // Resumen general
  const totalApproved = data.reduce((sum, group) => {
    return sum + group.reports
      .filter(r => r.status === 'approved')
      .reduce((s, r) => s + Number(r.calculatedAmount || 0), 0);
  }, 0);

  const totalPending = data.reduce((sum, group) => {
    return sum + group.reports
      .filter(r => r.status !== 'approved')
      .reduce((s, r) => s + Number(r.calculatedAmount || 0), 0);
  }, 0);

  const totalUsers = data.length;

  doc.setFontSize(12);
  doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 15, 28);
  doc.text(`Resumen General`, 15, 36);
  doc.text(`Total General Aprobado: $${totalApproved.toFixed(2)}`, 15, 42);
  doc.text(`Total General Pendiente: $${totalPending.toFixed(2)}`, 15, 48);
  doc.text(`Usuarios: ${totalUsers}`, 15, 54);

  let currentY = 60;

  for (const userGroup of data) {
    const userName = userGroup.user?.name || 'Usuario desconocido';
    const userEmail = userGroup.user?.email || 'N/A';
    const reports = userGroup.reports || [];

    if (reports.length === 0) continue;

    // Mostrar nombre del usuario
    doc.setFontSize(13);
    doc.text(`👤 ${userName} (${userEmail})`, 15, currentY);
    currentY += 6;

    // Preparar las filas para el usuario
    const userRows = reports.map(report => {
      return [
        report.id?.substring(0, 8) || 'N/A',
        report.eventName,
        new Date(report.eventDate).toLocaleDateString(),
        report.status,
        `$${Number(report.calculatedAmount || 0).toFixed(2)}`
      ];
    });

    const totalByUser = reports
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + Number(r.calculatedAmount || 0), 0);

    userRows.push([
      '', 'Total Aprobado', '', '', `$${totalByUser.toFixed(2)}`
    ]);

    // Renderizar la tabla del usuario
    autoTable(doc, {
      head: [['ID', 'Evento', 'Fecha', 'Estado', 'Monto']],
      body: userRows,
      startY: currentY,
      margin: { horizontal: 15 },
      styles: {
        fontSize: 10,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontStyle: 'bold'
      },
      didDrawPage: (data) => {
        currentY = data.cursor.y + 10;
      }
    });

    currentY += 10;

    // Salto de página si estamos cerca del final
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
  }

  return doc.output('arraybuffer');
}
