// pages/api/dashboard-stats.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Evitar cache para prevenir respuestas 304 Not Modified
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  // Asegurar que la respuesta siempre sea JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    // Consulta en Prisma, ojo que la tabla sea correcta y campos existan
    const weeklyReports = await prisma.workReports.findMany({
      where: {
        userId: userId,
        OR: [
          { status: 'approved' },
          { status: 'pending' }
        ]
      },
      select: {
        id: true,
        jobType: true,
        customJobType: true,
        hoursWorked: true,
        calculatedAmount: true,
        status: true,
        jobTypeRef: {
          select: {
            name: true
          }
        }
      }
    });

    // Cálculos estadísticos
    const totalJobs = weeklyReports.length;
    const totalHours = weeklyReports.reduce((sum, report) => sum + (report.hoursWorked || 0), 0);
    const totalEarnings = weeklyReports
      .filter(report => report.status.toLowerCase() === 'approved')
      .reduce((sum, report) => sum + (report.calculatedAmount || 0), 0);
    const pendingJobs = weeklyReports.filter(report =>
      report.status && report.status.toLowerCase() === 'pending'
    ).length;

    // Distribución de tipos de trabajo
    const jobDistribution = weeklyReports.reduce((acc, report) => {
      const jobType = report.jobType === 'other' && report.customJobType
        ? report.customJobType
        : report.jobType || 'unknown';
      acc[jobType] = (acc[jobType] || 0) + 1;
      return acc;
    }, {});

    const stats = {
      totalJobs,
      totalHours,
      totalEarnings,
      pendingJobs,
      weeklyProgress: (totalHours / 40) * 100,
      jobDistribution
    };

    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
