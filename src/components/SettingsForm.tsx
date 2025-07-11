import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { apiService } from '@/services/api';

export const SettingsForm = () => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Por favor ingresa un URL válido');
      return;
    }

    try {
      setIsSaving(true);
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user?.id) {
        throw new Error('Usuario no encontrado');
      }

      const response = await apiService.updateWebhook(user.id, webhookUrl);
      
      if (!response) {
        throw new Error('No se recibió respuesta del servidor');
      }
      
      // Actualizar el usuario en localStorage
      const updatedUser = { ...user, webhookUrl };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast.success('Webhook actualizado correctamente');
    } catch (error) {
      console.error('Error updating webhook:', error);
      toast.error('Error al actualizar el webhook');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            URL del Webhook
          </label>
          <Input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://example.com/webhook"
          />
          <p className="text-sm text-gray-500 mt-1">
            Ingresa la URL del webhook que recibirá las respuestas del chat
          </p>
        </div>
        
        <Button 
          onClick={handleSave}
          disabled={isSaving || !webhookUrl.trim()}
          className="bg-primary-500 hover:bg-primary-600"
        >
          {isSaving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  );
};