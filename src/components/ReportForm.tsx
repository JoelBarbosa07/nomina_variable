import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';

export const ReportForm = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    jobType: string;
    eventName: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    description: string;
    hourlyRate: string;
    fixedRate: string;
    paymentType: string;
  }>({
    jobType: '',
    eventName: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    description: '',
    hourlyRate: '',
    fixedRate: '',
    paymentType: 'hourly'
  });

  const jobTypes: { id: string; name: string; rate: number }[] = [
    { id: 'dj', name: 'DJ', rate: 75 },
    { id: 'promoter', name: 'Promotor', rate: 50 },
    { id: 'face-painter', name: 'Pinta Caritas', rate: 45 },
    { id: 'bartender', name: 'Bartender', rate: 60 },
    { id: 'security', name: 'Seguridad', rate: 40 },
    { id: 'photographer', name: 'Fotógrafo', rate: 80 },
    { id: 'waiter', name: 'Mesero', rate: 35 },
    { id: 'coordinator', name: 'Coordinador', rate: 90 },
    { id: 'other', name: 'Otro', rate: 0 }
  ];

  const [showOtherJobType, setShowOtherJobType] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Obtener el ID de usuario del localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user?.id;
      
      if (!userId) {
        toast.error('Debes iniciar sesión para enviar un reporte');
        navigate('/login');
        return;
      }

      // Calcular horas trabajadas
      const startTime = new Date(`${formData.date} ${formData.startTime}`);
      const endTime = new Date(`${formData.date} ${formData.endTime}`);
      const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      // Calcular monto
      const selectedJobType = jobTypes.find(job => job.id === formData.jobType);
      const amount = formData.paymentType === 'hourly' 
        ? hoursWorked * (parseFloat(formData.hourlyRate) || selectedJobType?.rate || 0)
        : parseFloat(formData.fixedRate) || 0;

      const reportData = {
        userId: userId,
        jobType: formData.jobType === 'other' ? formData.eventName : formData.jobType,
        eventName: formData.jobType === 'other' ? 'Otro' : formData.eventName,
        eventDate: `${formData.date}T00:00:00Z`,
        startTime: `${formData.date}T${formData.startTime}:00Z`,
        endTime: `${formData.date}T${formData.endTime}:00Z`,
        location: formData.location,
        description: formData.description,
        paymentType: formData.paymentType,
        hourlyRate: parseFloat(formData.hourlyRate) || 0,
        fixedRate: parseFloat(formData.fixedRate) || 0,
        hoursWorked: hoursWorked,
        calculatedAmount: amount
      };

      // Enviar datos al backend usando el servicio API
      await apiService.createWorkReport({
        ...reportData,
        customJobType: formData.jobType === 'other' ? formData.eventName : undefined
      });
      
      // Si no hay error, la creación fue exitosa
      toast.success('Reporte enviado exitosamente');
      
      // Limpiar formulario
      setFormData({
        jobType: '',
        eventName: '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        description: '',
        hourlyRate: '',
        fixedRate: '',
        paymentType: 'hourly'
      });

    } catch (error: any) {
      console.error('Error al enviar el reporte:', error);
      toast.error('Error al enviar el reporte');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-llenar tarifa cuando se selecciona tipo de trabajo
    if (name === 'jobType') {
      const selectedJob = jobTypes.find(job => job.id === value);
      if (selectedJob) {
        setFormData(prev => ({
          ...prev,
          hourlyRate: selectedJob.rate.toString(),
          eventName: value === 'other' ? '' : prev.eventName
        }));
      }
      setShowOtherJobType(value === 'other');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reportar Trabajo</h1>
        <p className="text-gray-600 mt-2">Registra los detalles de tu trabajo realizado</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información del Trabajo */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Información del Trabajo</CardTitle>
              <CardDescription>Detalles básicos del evento y trabajo realizado</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jobType">Tipo de Trabajo *</Label>
                <select
                  id="jobType"
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-200 rounded-md"
                  required
                >
                  <option value="">Seleccionar tipo</option>
                  {jobTypes.map(job => (
                    <option key={job.id} value={job.id}>
                      {job.name} {job.id !== 'other' ? `($${job.rate}/hora)` : ''}
                    </option>
                  ))}
                </select>
                {showOtherJobType && (
                  <div className="mt-2">
                    <Label htmlFor="otherJobType">Especificar tipo de trabajo</Label>
                    <Input
                      id="otherJobType"
                      name="otherJobType"
                      value={formData.jobType === 'other' ? formData.eventName : ''}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          eventName: e.target.value
                        }));
                      }}
                      placeholder="Especifica el tipo de trabajo"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="eventName">Nombre del Evento *</Label>
                <Input
                  id="eventName"
                  name="eventName"
                  value={formData.eventName}
                  onChange={handleInputChange}
                  placeholder="Ej: Boda López-García"
                  required
                />
              </div>

              <div>
                <Label htmlFor="date">Fecha del Evento *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Ej: Salón de eventos El Jardín"
                />
              </div>

              <div>
                <Label htmlFor="startTime">Hora de Inicio *</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="endTime">Hora de Fin *</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Información de Pago */}
          <Card>
            <CardHeader>
              <CardTitle>Información de Pago</CardTitle>
              <CardDescription>Configura el tipo y monto del pago</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tipo de Pago</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentType"
                      value="hourly"
                      checked={formData.paymentType === 'hourly'}
                      onChange={handleInputChange}
                    />
                    <span>Por Hora</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentType"
                      value="fixed"
                      checked={formData.paymentType === 'fixed'}
                      onChange={handleInputChange}
                    />
                    <span>Tarifa Fija</span>
                  </label>
                </div>
              </div>

              {formData.paymentType === 'hourly' ? (
                <div>
                  <Label htmlFor="hourlyRate">Tarifa por Hora ($)</Label>
                  <Input
                    id="hourlyRate"
                    name="hourlyRate"
                    type="number"
                    value={formData.hourlyRate}
                    onChange={handleInputChange}
                    placeholder="75.00"
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="fixedRate">Tarifa Fija ($)</Label>
                  <Input
                    id="fixedRate"
                    name="fixedRate"
                    type="number"
                    value={formData.fixedRate}
                    onChange={handleInputChange}
                    placeholder="300.00"
                  />
                </div>
              )}

              {/* Cálculo estimado */}
              {formData.startTime && formData.endTime && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-60">Estimación:</p>
                  <p className="font-medium text-gray-900">
                    {(() => {
                      const start = new Date(`${formData.date} ${formData.startTime}`);
                      const end = new Date(`${formData.date} ${formData.endTime}`);
                      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                      const rate = formData.paymentType === 'hourly' 
                        ? parseFloat(formData.hourlyRate) || 0
                        : parseFloat(formData.fixedRate) || 0;
                      const amount = formData.paymentType === 'hourly' ? hours * rate : rate;
                      
                      return `${hours.toFixed(1)} horas × $${rate} = $${amount.toFixed(2)}`;
                    })()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Descripción */}
          <Card>
            <CardHeader>
              <CardTitle>Descripción del Trabajo</CardTitle>
              <CardDescription>Detalles adicionales sobre el trabajo realizado</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe las actividades realizadas, equipos utilizados, incidencias, etc."
                rows={6}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-primary-500 hover:bg-primary-600"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Reporte'}
          </Button>
        </div>
      </form>
    </div>
  );
};
