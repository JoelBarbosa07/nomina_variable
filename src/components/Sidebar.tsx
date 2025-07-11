
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
  currentPage: string;
  onPageChange: (page: string) => void;
  user?: any;
}

export const Sidebar = ({ onLogout, currentPage, onPageChange, user }: SidebarProps) => {

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: ['employee', 'supervisor'] },
    { id: 'reports', label: 'Reportar Trabajo', icon: '📝', roles: ['employee', 'supervisor'] },
    { id: 'supervision', label: 'Supervisión', icon: '👥', roles: ['supervisor'] },
    { id: 'chat', label: 'Chat & Notas', icon: '💬', roles: ['employee', 'supervisor'] },
  ];

  // Filtrar elementos del menú según el rol del usuario
  const filteredMenuItems = menuItems.filter(item => 
    user?.role ? item.roles.includes(user.role) : item.roles.includes('employee')
  );

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">EN</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900">EventoNómina</h1>
            <p className="text-sm text-gray-500">
              {user?.role === 'supervisor' ? 'Panel de Supervisor' : 'Gestión de pagos'}
            </p>
          </div>
        </div>
        {user && (
          <div className="mt-4 p-2 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => {
                  console.log('Cambiando a página:', item.id);
                  onPageChange(item.id);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  currentPage === item.id
                    ? 'bg-primary-50 text-primary-600 border border-primary-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-100">
        <Button
          variant="outline" 
          className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
};
