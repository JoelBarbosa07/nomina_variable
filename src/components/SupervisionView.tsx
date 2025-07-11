import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const SupervisionView = () => {
  const [groupedReports, setGroupedReports] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/supervision-reports');
        setGroupedReports(res.data); // Asumimos que ya viene agrupado por userId
      } catch (error) {
        toast.error('Error cargando reportes');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleApprove = async (reportId: string) => {
    try {
      await axios.patch(`/api/work-reports/${reportId}/approve`);
      setGroupedReports(prev =>
        prev.map(group => ({
          ...group,
          reports: group.reports.map(report =>
            report.id === reportId
              ? { ...report, status: 'approved', approvedAt: new Date().toISOString() }
              : report
          ),
          pendingCount: group.reports.filter(r => r.status === 'pending').length
        }))
      );
      toast.success('Reporte aprobado exitosamente');
    } catch (error) {
      toast.error('Error al aprobar reporte');
      console.error(error);
    }
  };

  const handleReject = async (reportId: string) => {
    try {
      await axios.patch(`/api/work-reports/${reportId}/reject`);
      setGroupedReports(prev =>
        prev.map(group => ({
          ...group,
          reports: group.reports.map(report =>
            report.id === reportId
              ? { ...report, status: 'rejected', rejectedAt: new Date().toISOString() }
              : report
          ),
          pendingCount: group.reports.filter(r => r.status === 'pending').length
        }))
      );
      toast.success('Reporte rechazado');
    } catch (error) {
      toast.error('Error al rechazar reporte');
      console.error(error);
    }
  };

  const filteredGroups = groupedReports
    .filter(group => {
      if (typeof filter === 'string' && ['all', 'pending', 'approved', 'rejected'].includes(filter)) {
        return group.reports.some(report => {
          if (filter === 'pending') return report.status === 'pending';
          if (filter === 'approved') return report.status === 'approved';
          if (filter === 'rejected') return report.status === 'rejected';
          return true;
        });
      }
      return group.userId === filter;
    })
    .map(group => ({
      ...group,
      reports: group.reports.filter(report => {
        if (typeof filter === 'string' && ['all', 'pending', 'approved', 'rejected'].includes(filter)) {
          if (filter === 'pending') return report.status === 'pending';
          if (filter === 'approved') return report.status === 'approved';
          if (filter === 'rejected') return report.status === 'rejected';
          return true;
        }
        return true;
      })
    }))
    .filter(group => group.reports.length > 0);

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado'
    };

    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getJobTypeName = (jobType: string) => {
    const jobTypes = {
      'dj': 'DJ',
      'promoter': 'Promotor',
      'face-painter': 'Pinta Caritas',
      'bartender': 'Bartender',
      'security': 'Seguridad',
      'photographer': 'Fotógrafo',
      'waiter': 'Mesero',
      'coordinator': 'Coordinador'
    };
    return jobTypes[jobType as keyof typeof jobTypes] || jobType;
  };

  const stats = {
    total: groupedReports.reduce((sum, group) => sum + group.reports.length, 0),
    pending: groupedReports.reduce((sum, group) =>
      sum + group.reports.filter(r => r.status === 'pending').length, 0),
    approved: groupedReports.reduce((sum, group) =>
      sum + group.reports.filter(r => r.status === 'approved').length, 0),
    rejected: groupedReports.reduce((sum, group) =>
      sum + group.reports.filter(r => r.status === 'rejected').length, 0),
    totalAmount: groupedReports.reduce((sum, group) =>
      sum + group.reports
        .filter(r => r.status === 'approved')
        .reduce((groupSum, r) => groupSum + parseFloat(r.calculatedAmount || 0), 0), 0)
  };

  const generatePDF = async () => {
    try {
      const userId = filter !== 'all' ? filter : undefined;
      const response = await axios.get('/api/supervision-reports', {
        params: { userId }
      });
      
      console.log('📥 Datos recibidos:', response.data);
      
      if (!response.data || !Array.isArray(response.data)) {
        console.error('❌ Datos no válidos:', response.data);
        throw new Error('Datos no válidos para generar el PDF');
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Reporte de Supervisión', 15, 20);

      // Fecha de generación
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 15, 30);

      let currentY = 40;

      // Procesar cada grupo de usuario
      for (let i = 0; i < response.data.length; i++) {
        const userGroup = response.data[i];
        
        if (!userGroup || !userGroup.reports || !Array.isArray(userGroup.reports)) {
          console.error('❌ Estructura de usuario no válida:', userGroup);
          continue;
        }

        console.log(`👤 Procesando usuario: ${userGroup.user?.name || 'Desconocido'}`);
        
        // Título del usuario
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Usuario: ${userGroup.user?.name || 'Desconocido'}`, 15, currentY);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Email: ${userGroup.user?.email || 'Sin email'}`, 15, currentY + 5);
        
        currentY += 15;

        // Preparar datos de la tabla
        const tableData = userGroup.reports.map((report: any) => {
          if (!report) {
            console.error('❌ Reporte no válido:', report);
            return ['', '', '', '', '', ''];
          }

          return [
            report.id?.substring(0, 8) + '...' || 'N/A',
            report.eventName || 'Sin nombre',
            report.eventDate ? new Date(report.eventDate).toLocaleDateString() : 'Sin fecha',
            getJobTypeName(report.jobType) || 'N/A',
            report.status || 'Sin estado',
            `$${parseFloat(report.calculatedAmount || 0).toFixed(2)}`
          ];
        });

        // Calcular totales
        const totalApproved = userGroup.reports
          .filter((r: any) => r.status === 'approved')
          .reduce((sum: number, r: any) => sum + parseFloat(r.calculatedAmount || 0), 0);

        const totalPending = userGroup.reports
          .filter((r: any) => r.status === 'pending')
          .reduce((sum: number, r: any) => sum + parseFloat(r.calculatedAmount || 0), 0);

        // Crear tabla
        autoTable(doc, {
          head: [['ID', 'Evento', 'Fecha', 'Tipo', 'Estado', 'Monto']],
          body: tableData,
          startY: currentY,
          styles: {
            cellPadding: 2,
            fontSize: 8,
            valign: 'middle',
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.1
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9,
            lineWidth: 0.1
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          margin: { left: 15, right: 15 }
        });

        // Obtener posición Y después de la tabla
        const finalY = (doc as any).lastAutoTable.finalY || currentY + 20;
        
        // Agregar resumen del usuario
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Aprobado: $${totalApproved.toFixed(2)}`, 15, finalY + 10);
        doc.text(`Total Pendiente: $${totalPending.toFixed(2)}`, 15, finalY + 15);
        doc.text(`Reportes: ${userGroup.reports.length}`, 15, finalY + 20);

        currentY = finalY + 35;

        // Agregar nueva página si es necesario
        if (currentY > 250 && i < response.data.length - 1) {
          doc.addPage();
          currentY = 20;
        }
      }

      // Resumen general
      const grandTotalApproved = response.data.reduce((sum: number, userGroup: any) => {
        return sum + userGroup.reports
          .filter((r: any) => r.status === 'approved')
          .reduce((userSum: number, r: any) => userSum + parseFloat(r.calculatedAmount || 0), 0);
      }, 0);

      const grandTotalPending = response.data.reduce((sum: number, userGroup: any) => {
        return sum + userGroup.reports
          .filter((r: any) => r.status === 'pending')
          .reduce((userSum: number, r: any) => userSum + parseFloat(r.calculatedAmount || 0), 0);
      }, 0);

      // Agregar nueva página para resumen si es necesario
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen General', 15, currentY);
      
      doc.setFontSize(12);
      doc.text(`Total General Aprobado: $${grandTotalApproved.toFixed(2)}`, 15, currentY + 15);
      doc.text(`Total General Pendiente: $${grandTotalPending.toFixed(2)}`, 15, currentY + 25);
      doc.text(`Usuarios: ${response.data.length}`, 15, currentY + 35);

      // Descargar PDF
      const pdfBlob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'reporte-supervision.pdf';
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('PDF generado exitosamente');
    } catch (error) {
      toast.error('Error generando el PDF');
      console.error('Error detallado:', error);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Panel de Supervisión</h1>
        <p className="text-gray-600 mt-2">Revisa y gestiona los reportes de trabajo</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-gray-900">{stats.total}</div><p className="text-sm text-gray-600">Total Reportes</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-yellow-600">{stats.pending}</div><p className="text-sm text-gray-600">Pendientes</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-green-600">{stats.approved}</div><p className="text-sm text-gray-600">Aprobados</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-red-600">{stats.rejected}</div><p className="text-sm text-gray-600">Rechazados</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-primary-600">${stats.totalAmount.toFixed(2)}</div><p className="text-sm text-gray-600">Total Aprobado</p></CardContent></Card>
      </div>

      {/* Filters and Export */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                {[{ value: 'all', label: 'Todos' },{ value: 'pending', label: 'Pendientes' },{ value: 'approved', label: 'Aprobados' },{ value: 'rejected', label: 'Rechazados' }].map(option => (
              <Button
                key={option.value}
                variant={filter === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Filtrar por usuario</label>
                <select
                  className="w-full p-2 border rounded"
                  onChange={(e) => {
                    const userId = e.target.value;
                    setFilter(userId === 'all' ? 'all' : userId);
                  }}
                >
                  <option value="all">Todos los usuarios</option>
                  {groupedReports.map(group => (
                    <option key={group.userId} value={group.userId}>
                      {group.user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Exportar Reportes</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={generatePDF}
              >
                Exportar a PDF
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const userId = filter !== 'all' ? filter : undefined;
                    const url = `/api/supervision-reports?format=excel${userId ? `&userId=${userId}` : ''}`;
                    
                    const response = await fetch(url);
                    if (!response.ok) {
                      throw new Error('Error al obtener el archivo Excel');
                    }
                    
                    const blob = await response.blob();
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = 'reporte-supervision.xlsx';
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(downloadUrl);
                    
                    toast.success('Excel generado exitosamente');
                  } catch (error) {
                    console.error('Error descargando Excel:', error);
                    toast.error('Error al descargar el archivo Excel');
                  }
                }}
              >
                Exportar a Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports grouped by user */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center p-8">Cargando reportes...</div>
        ) : filteredGroups.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><p className="text-gray-500">No hay reportes para mostrar</p></CardContent></Card>
        ) : (
          filteredGroups.map(group => (
            <div key={group.userId} className="space-y-4">
              <h3 className="text-xl font-semibold">{group.user.name}</h3>
              {group.reports.map(report => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{report.eventName}</CardTitle>
                        <CardDescription>
                          {getJobTypeName(report.jobType)} • {report.date} • {report.location}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(report.status)}
                        <span className="text-lg font-bold text-primary-600">${report.calculatedAmount}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div><p className="text-sm text-gray-600">Horario</p><p className="font-medium">{report.startTime} - {report.endTime}</p></div>
                      <div><p className="text-sm text-gray-600">Horas Trabajadas</p><p className="font-medium">{report.hoursWorked}h</p></div>
                      <div><p className="text-sm text-gray-600">Tipo de Pago</p><p className="font-medium">{report.paymentType === 'hourly' ? `$${report.hourlyRate}/hora` : `$${report.fixedRate} fijo`}</p></div>
                    </div>
                    {report.description && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Descripción</p>
                        <p className="text-sm bg-gray-50 p-3 rounded">{report.description}</p>
                      </div>
                    )}
                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(report.id)}>Aprobar</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(report.id)}>Rechazar</Button>
                      </div>
                    )}
                    {report.status !== 'pending' && (
                      <div className="text-sm text-gray-500">
                        {report.status === 'approved' && report.approvedAt && `Aprobado el ${new Date(report.approvedAt).toLocaleDateString()}`}
                        {report.status === 'rejected' && report.rejectedAt && `Rechazado el ${new Date(report.rejectedAt).toLocaleDateString()}`}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};