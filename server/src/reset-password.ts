import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export const resetPasswordHandler = async (req: Request, res: Response) => {
  if (req.method === 'POST') {
    try {
      const { email, newPassword } = req.body;
      console.log('📥 Datos recibidos:', { email, newPassword });

      // Iniciar transacción
      try {
        const result = await prisma.$transaction(async (tx) => {
          // Verificar si el usuario existe
          console.log('🔍 Buscando usuario:', email);
          const user = await tx.user.findUnique({
            where: { email }
          });

          if (!user) {
            console.log('❌ Usuario no encontrado:', email);
            throw { status: 404, message: 'Usuario no encontrado' };
          }
          
          console.log('✅ Usuario encontrado:', user.id);

          // Validar nueva contraseña
          if (!newPassword || newPassword.length < 8) {
            console.log('❌ Contraseña inválida');
            throw { status: 400, message: 'La contraseña debe tener al menos 8 caracteres' };
          }

          // Hashear nueva contraseña
          const hashedPassword = await bcrypt.hash(newPassword, 10);
          console.log('🔐 Contraseña hasheada correctamente');

          // Actualizar contraseña
          console.log('🔧 Actualizando contraseña para el usuario:', email);
          const updatedUser = await tx.user.update({
            where: { email },
            data: {
              passwordHash: hashedPassword,
              resetToken: null,
              resetTokenExpiry: null
            }
          });
          
          console.log('✅ Usuario actualizado:', updatedUser);
          
          if (!updatedUser) {
            console.log('❌ Error al actualizar usuario');
            throw { status: 500, message: 'Error al actualizar la contraseña' };
          }

          return updatedUser;
        });

        console.log('✅ Transacción completada exitosamente');
        console.log('✅ Contraseña actualizada exitosamente para el usuario:', email);
        return res.status(200).json({ success: true, message: 'Contraseña actualizada exitosamente' });
      } catch (error: any) {
        console.error('❌ Error en reset-password:', error);
        const status = error.status || 500;
        const message = error.message || 'Error interno del servidor';
        return res.status(status).json({ success: false, message });
      }
    } catch (error) {
      console.error('Error en reset-password:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ message: 'Método no permitido' });
};