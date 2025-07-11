import express from 'express';
const app = express();
app.disable('etag');
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:5678', 'http://localhost:8080', 'https://lending-residents-kind-pets.trycloudflare.com'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 600
}));

app.use(express.json());

import { resetPasswordHandler } from './reset-password';

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = '1d';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(3),
  role: z.enum(['employee', 'supervisor'])
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const reportSchema = z.object({
  userId: z.string(),
  jobType: z.string(),
  customJobType: z.string().optional(),
  eventName: z.string(),
  eventDate: z.string().datetime(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().optional(),
  description: z.string().optional(),
  paymentType: z.enum(['hourly', 'fixed']),
  hourlyRate: z.number().optional(),
  fixedRate: z.number().optional(),
  hoursWorked: z.number(),
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'El usuario ya existe' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { email, passwordHash: hashedPassword, name, role }
    });

    const token = jwt.sign({ userId: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, token });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(400).json({ error: 'Error en el registro' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Credenciales inválidas' });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(400).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, token });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(400).json({ error: 'Error en el login' });
  }
});

app.post('/api/work-reports', async (req, res) => {
  try {
    const reportData = reportSchema.parse(req.body);

    const calculatedAmount = reportData.paymentType === 'hourly'
      ? (reportData.hourlyRate || 0) * reportData.hoursWorked
      : reportData.fixedRate || 0;

    const user = await prisma.user.findUnique({
      where: { id: reportData.userId },
      select: { email: true, name: true }
    });
    
    const newReport = await prisma.workReport.create({
      data: {
        userId: reportData.userId,
        createdBy: user?.email || 'unknown',
        updatedBy: user?.email || 'unknown',
        jobType: reportData.customJobType ? 'other' : reportData.jobType,
        customJobType: reportData.customJobType || null,
        eventName: reportData.eventName,
        eventDate: new Date(reportData.eventDate),
        startTime: new Date(reportData.startTime),
        endTime: new Date(reportData.endTime),
        location: reportData.location,
        description: reportData.description,
        paymentType: reportData.paymentType,
        hourlyRate: reportData.hourlyRate,
        fixedRate: reportData.fixedRate,
        hoursWorked: reportData.hoursWorked,
        calculatedAmount,
        status: 'pending'
      }
    });

    res.status(201).json(newReport);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(400).json({ error: 'Invalid report data' });
  }
});

app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId es requerido' });

    const [reports, approvedReports] = await Promise.all([
      prisma.workReport.findMany({
        where: { userId },
        include: { jobTypeRef: { select: { name: true } } }
      }),
      prisma.workReport.findMany({
        where: {
          userId,
          status: 'approved'
        }
      })
    ]);

    const totalJobs = approvedReports.length;
    const totalHours = approvedReports.reduce((sum: number, r: { hoursWorked: number }) => sum + r.hoursWorked, 0);
    const totalEarnings = approvedReports.reduce((sum: number, r: { calculatedAmount: number }) => sum + r.calculatedAmount, 0);
    const pendingJobs = reports.filter((r: { status: string }) => r.status === 'pending').length;

    const jobDistribution: { [key: string]: number } = {};
    approvedReports.forEach((report: { jobType: string }) => {
      const jobType = report.jobType;
      jobDistribution[jobType] = (jobDistribution[jobType] || 0) + 1;
    });

    const responseData = {
      totalJobs,
      totalHours,
      totalEarnings,
      pendingJobs,
      weeklyProgress: (totalHours / 40) * 100,
      jobDistribution
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/work-reports', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    const { userId, limit = 10 } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId es requerido' });

    const reports = await prisma.workReport.findMany({
      where: { userId: userId as string },
      orderBy: { submittedAt: 'desc' },
      take: Number(limit),
      include: {
        jobTypeRef: { select: { name: true } },
        user: { select: { name: true } }
      }
    });

    // Devuelve un array vacío si no hay reportes
    res.json(reports || []);
  } catch (error) {
    console.error('Error obteniendo reportes recientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/supervision-reports', async (req, res) => {
  try {
    const { status, userId } = req.query;
    
    const whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    } else {
      whereClause.status = { in: ['pending', 'approved', 'rejected'] };
    }
    
    if (userId) {
      whereClause.userId = userId;
    }

    const reports = await prisma.workReport.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        jobTypeRef: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    // Agregar el nombre del usuario a cada reporte
    const reportsWithUser = reports.map((report: { user: { id: string, name: string }, status: string, hoursWorked: number, calculatedAmount: number }) => ({
      ...report,
      userName: report.user.name
    }));

    const groupedReports = reportsWithUser.reduce((acc: Record<string, any>, report: { user: { id: string, name: string }, status: string, hoursWorked: number, calculatedAmount: number }) => {
      const userId = report.user.id;
      if (!acc[userId]) {
        acc[userId] = {
          user: report.user,
          reports: [],
          totalHours: 0,
          totalEarnings: 0,
          pendingCount: 0
        };
      }

      acc[userId].reports.push(report);
      if (report.status === 'approved') {
        acc[userId].totalHours += report.hoursWorked;
        acc[userId].totalEarnings += report.calculatedAmount;
      }
      if (report.status === 'pending') {
        acc[userId].pendingCount += 1;
      }

      return acc;
    }, {});

    res.json(Object.values(groupedReports));
  } catch (error) {
    console.error('Error obteniendo reportes de supervisión:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.patch('/api/work-reports/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const report = await prisma.workReport.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date()
      },
      select: {
        id: true,
        userId: true,
        jobType: true,
        customJobType: true,
        eventName: true,
        eventDate: true,
        startTime: true,
        endTime: true,
        location: true,
        description: true,
        paymentType: true,
        hourlyRate: true,
        fixedRate: true,
        hoursWorked: true,
        calculatedAmount: true,
        status: true,
        submittedAt: true,
        approvedAt: true,
        rejectedAt: true,
        approvedById: true,
        rejectedById: true,
        jobTypeRef: {
          select: {
            name: true
          }
        }
      }
    });

    const userId = report.userId;
    const stats = await prisma.workReport.aggregate({
      where: {
        userId,
        status: 'approved'
      },
      _sum: {
        calculatedAmount: true
      }
    });

    const jobType = report.jobType === 'other' && report.customJobType
      ? report.customJobType
      : report.jobTypeRef?.name || report.jobType;

    res.json({
      ...report,
      totalEarnings: stats._sum.calculatedAmount || 0,
      jobType
    });
  } catch (error) {
    console.error('Error approving report:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.patch('/api/work-reports/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const report = await prisma.workReport.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedAt: new Date()
      }
    });
    res.json(report);
  } catch (error) {
    console.error('Error rejecting report:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.patch('/api/users/:id/webhook', async (req, res) => {
  try {
    const { id } = req.params;
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { webhookUrl }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/reset-password', resetPasswordHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
