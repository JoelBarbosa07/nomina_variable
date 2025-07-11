import { Workbook } from 'exceljs';

export async function generateExcel(data: any[]) {
  console.log('📥 Datos recibidos para Excel:', JSON.stringify(data, null, 2));
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error('❌ Datos inválidos para generar Excel');
    return new ArrayBuffer(0);
  }

  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Reportes');
  console.log('📄 Hoja de cálculo creada correctamente');

  // Encabezados
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Usuario', key: 'user', width: 25 },
    { header: 'Evento', key: 'event', width: 30 },
    { header: 'Fecha', key: 'date', width: 15 },
    { header: 'Estado', key: 'status', width: 15 },
    { header: 'Monto', key: 'amount', width: 15 }
  ];

  // Agregar datos
  data.forEach((userGroup, index) => {
    console.log(`➡️ Procesando usuario ${index + 1}:`, userGroup.user?.name || 'Desconocido');
    
    if (!userGroup.reports || !Array.isArray(userGroup.reports)) {
      console.error('❌ Reportes inválidos para el usuario:', userGroup.user?.name);
      return;
    }

    let totalAmount = 0;
    
    userGroup.reports.forEach((report, reportIndex) => {
      console.log(`📝 Procesando reporte ${reportIndex + 1}:`, report.eventName);
      
      if (!report || !report.id || !report.eventName || !report.eventDate || !report.status || !report.calculatedAmount) {
        console.error('❌ Reporte inválido:', report);
        return;
      }
      const amount = parseFloat(report.calculatedAmount || 0);
      if (report.status === 'approved') {
        totalAmount += amount;
      }
      
      worksheet.addRow({
        id: report.id,
        user: userGroup.user.name,
        event: report.eventName,
        date: report.eventDate.toLocaleDateString(),
        status: report.status,
        amount: `$${amount.toFixed(2)}`
      });
    });

    // Agregar fila de total
    console.log('💰 Total calculado para el usuario:', totalAmount);
    
    if (totalAmount > 0) {
      console.log('➕ Agregando fila de total');
      worksheet.addRow({
        id: '',
        user: '',
        event: 'Total a Pagar',
        date: '',
        status: '',
        amount: `$${totalAmount.toFixed(2)}`
      });
    }
  });

  // Estilos
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2980B9' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
    }
  });

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}