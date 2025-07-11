import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Configurar Axios con la URL base del backend
const api = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true
});

interface AuthFormProps {
  onLogin: (userData: any) => void;
}

export const AuthForm = ({ onLogin }: AuthFormProps) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'employee'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isLogin) {
        // Lógica de login
        const response = await api.post('/api/auth/login', {
          email: formData.email,
          password: formData.password
        });

        const userData = response.data;
        localStorage.setItem('user', JSON.stringify(userData));
        onLogin(userData);
        toast.success('Inicio de sesión exitoso');
        navigate('/');
      } else {
        // Lógica de registro
        const response = await api.post('/api/auth/register', {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role
        });

        const userData = response.data;
        localStorage.setItem('user', JSON.stringify(userData));
        onLogin(userData);
        toast.success('Registro exitoso');
        navigate('/');
      }
    } catch (error) {
      console.error('Error en autenticación:', error);
      toast.error('Error en autenticación');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xl">EN</span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {isLogin ? 'Iniciar Sesión' : 'Registro'}
          </CardTitle>
          <CardDescription>
            {isLogin ? 'Accede a tu cuenta de EventoNómina' : 'Crea tu cuenta en EventoNómina'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ingresa tu nombre completo"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@ejemplo.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
              />
            </div>

            {!isLogin && (
              <input
                type="hidden"
                name="role"
                value="employee"
                onChange={(e) => handleInputChange('role', e.target.value)}
              />
            )}
            
            <Button type="submit" className="w-full">
              {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
            </Button>
          </form>
          
          <div className="mt-6 text-center space-y-2">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium block w-full"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
            {isLogin && (
              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium block w-full"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
