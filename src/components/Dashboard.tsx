import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import { toast } from 'sonner';

interface DashboardProps {
  user: { id: string; name: string };
}

export const Dashboard = ({ user }: DashboardProps) => {
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalHours: 0,
    totalEarnings: 0,
    pendingJobs: 0,
    weeklyProgress: 0,
    jobDistribution: {} as Record<string, number>
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [showAllReports, setShowAllReports] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        
        const [statsData, jobsData] = await Promise.all([
          apiService.getDashboardStats(user.id),
          apiService.getRecentJobs(user.id, showAllReports ? 100 : 5)
        ]);

        setStats(statsData);
        setRecentJobs(jobsData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Error al cargar los datos del dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id, showAllReports]);

  const handleReportApproval = async (reportId: string) => {
    try {
      await apiService.approveReport(reportId);
      // Actualizar el dashboard después de aprobar el reporte
      const [statsData, jobsData] = await Promise.all([
        apiService.getDashboardStats(user.id),
        apiService.getRecentJobs(user.id, showAllReports ? 100 : 5)
      ]);
      setStats(statsData);
      setRecentJobs(jobsData);
    } catch (error) {
      console.error('Error approving report:', error);
      toast.error('Error al aprobar el reporte');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatJobType = (type: string) => {
    const types: Record<string, string> = {
      'dj': 'DJ',
      'promoter': 'Promotor',
      'face-painter': 'Pinta Caritas',
      'bartender': 'Bartender',
      'security': 'Seguridad',
      'photographer': 'Fotógrafo',
      'waiter': 'Mesero',
      'coordinator': 'Coordinador'
    };
    return types[type] || type;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'Aprobado';
      case 'rejected':
        return 'Rechazado';
      case 'pending':
      default:
        return 'Pendiente';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  // Aseguramos que el progreso esté en rango válido
  const progressPercentage = Math.min(Math.max(stats.weeklyProgress || 0, 0), 100);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">¡Hola, {user.name}! 👋</h1>
        <p className="text-gray-600 mt-2">Aquí tienes un resumen de tu actividad reciente</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Trabajos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalJobs}</div>
            <p className="text-xs text-gray-500 mt-1">Trabajos registrados</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-secondary-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Horas Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalHours}h</div>
            <p className="text-xs text-gray-500 mt-1">Horas trabajadas</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ingresos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalEarnings)}</div>
            <p className="text-xs text-gray-500 mt-1">Ganancias estimadas</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-orange-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Trabajos Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.pendingJobs}</div>
            <p className="text-xs text-gray-500 mt-1">Para aprobación</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso Semanal</CardTitle>
          <CardDescription>Progreso basado en horas trabajadas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progreso semanal</span>
              <span>{progressPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Job Distribution */}
      {Object.keys(stats.jobDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Trabajos</CardTitle>
            <CardDescription>Tipos de trabajos realizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.jobDistribution).map(([jobType, count]) => (
                <div key={jobType} className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">{formatJobType(jobType)}</p>
                    <p className="text-xs text-gray-500">{count} trabajo{count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Trabajos Recientes</CardTitle>
              <CardDescription>Tus últimos reportes de trabajo</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllReports(!showAllReports)}
            >
              {showAllReports ? 'Ver últimos 5' : 'Ver todos'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay trabajos recientes para mostrar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Tipo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Evento</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Fecha</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Horas</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Estado</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => (
                    <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs font-medium">
                          {formatJobType(job.jobType)}
                        </span>
                      </td>
                      <td className="py-3 px-4">{job.eventName}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(job.eventDate).toLocaleDateString('es-MX')}
                      </td>
                      <td className="py-3 px-4">{job.hoursWorked}h</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {getStatusText(job.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(job.calculatedAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
