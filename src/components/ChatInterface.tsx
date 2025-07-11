
import { useState, useRef, useEffect } from 'react';
import { SettingsForm } from './SettingsForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "¡Hola! Soy tu asistente de EventoNómina. Puedo ayudarte con consultas sobre tus reportes, pagos y más. ¿En qué puedo asistirte hoy?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState(localStorage.getItem('personalNotes') || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const apiEndpoint = user.webhookUrl || localStorage.getItem('apiEndpoint');
      const token = localStorage.getItem('authToken');

      if (!apiEndpoint) {
        throw new Error('Endpoint de API no configurado');
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'demo-token'}`
        },
        body: JSON.stringify({
          message: inputMessage
        })
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta de la API');
      }

      const data = await response.json();
      
      const botMessage: Message = {
        id: Date.now() + 1,
        text: data.output || 'Lo siento, no pude procesar tu mensaje.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      // Respuesta simulada para demostración
      const simulatedResponse = getSimulatedResponse(inputMessage);
      
      const botMessage: Message = {
        id: Date.now() + 1,
        text: simulatedResponse,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      
      if (error instanceof Error && error.message !== 'Endpoint de API no configurado') {
        toast.error('Usando respuesta simulada. Configura tu API en Configuración.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getSimulatedResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('pago') || lowerMessage.includes('dinero') || lowerMessage.includes('sueldo')) {
      return "Según tus reportes recientes, has generado $2,850 este mes. Tienes 3 reportes pendientes de aprobación. ¿Te gustaría que revise algún pago específico?";
    }
    
    if (lowerMessage.includes('trabajo') || lowerMessage.includes('evento') || lowerMessage.includes('hora')) {
      return "Has trabajado 48 horas esta semana en 12 eventos diferentes. Tu trabajo más reciente fue como DJ en la Boda González por 6 horas. ¿Necesitas ayuda para reportar un nuevo trabajo?";
    }
    
    if (lowerMessage.includes('reporte') || lowerMessage.includes('reportar')) {
      return "Para crear un nuevo reporte, ve a la sección 'Reportar Trabajo' y completa los detalles del evento. Recuerda incluir: tipo de trabajo, nombre del evento, fecha, horarios y descripción.";
    }
    
    if (lowerMessage.includes('estado') || lowerMessage.includes('aprobado') || lowerMessage.includes('pendiente')) {
      return "Tienes 3 reportes pendientes de aprobación y 9 reportes aprobados este mes. Los reportes aprobados suman un total de $2,850. ¿Quieres que revise algún reporte específico?";
    }
    
    return "Entiendo que necesitas ayuda. Puedo asistirte con: consultar tus pagos, revisar reportes de trabajo, calcular horas trabajadas, o ayudarte a entender el proceso de aprobación. ¿Sobre qué te gustaría saber más?";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const saveNotes = () => {
    localStorage.setItem('personalNotes', notes);
    toast.success('Notas guardadas exitosamente');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Chat & Notas Personales</h1>
        <p className="text-gray-600 mt-2">Consulta con tu asistente o guarda notas importantes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Interface */}
        <Card className="flex flex-col h-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💬 Asistente Virtual
              <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">En línea</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 max-h-64">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.isUser
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.isUser ? 'text-primary-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                disabled={isLoading}
              />
              <Button 
                onClick={sendMessage} 
                disabled={isLoading || !inputMessage.trim()}
                className="bg-primary-500 hover:bg-primary-600"
              >
                Enviar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Personal Notes */}
        <Card className="h-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📝 Notas Personales
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-full">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribe tus notas personales aquí... 

Ejemplos:
- Recordar llevar equipo extra para el evento del sábado
- Confirmar horario con cliente para el próximo trabajo
- Revisar contrato de trabajo mensual"
              className="flex-1 resize-none mb-4"
              rows={8}
            />
            <Button 
              onClick={saveNotes}
              className="bg-secondary-500 hover:bg-secondary-600"
            >
              Guardar Notas
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Configuración del Webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Consultas Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              "¿Cuánto he ganado este mes?",
              "¿Cuáles son mis reportes pendientes?",
              "¿Cómo reportar un nuevo trabajo?",
              "¿Cuál es mi promedio de horas?"
            ].map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInputMessage(question)}
                className="text-left justify-start h-auto py-2 px-3"
              >
                {question}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
