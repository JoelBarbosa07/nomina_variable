import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  console.log('=== Work Reports API Called ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);

  if (req.method !== 'GET' && req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (req.method === 'POST') {
    try {
      const {
        userId,
        jobType,
        customJobType,
        eventName,
        eventDate,
        startTime,
        endTime,
        location,
        description,
        paymentType,
        hourlyRate,
        fixedRate
      } = req.body;

      if (!userId || !jobType || !eventName || !eventDate || !startTime || !endTime || !paymentType) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const hoursWorked = (new Date(`${eventDate}T${endTime}`) - new Date(`${eventDate}T${startTime}`)) / (1000 * 60 * 60);
      const rate = paymentType === 'hourly' ? parseFloat(hourlyRate) : parseFloat(fixedRate);
      const calculatedAmount = paymentType === 'hourly' ? hoursWorked * rate : rate;

      const reportData = {
        userId,
        jobType: customJobType ? 'other' : jobType,
        customJobType,
        eventName,
        eventDate: new Date(`${eventDate}T00:00:00Z`),
        startTime: new Date(`${eventDate}T${startTime}:00Z`),
        endTime: new Date(`${eventDate}T${endTime}:00Z`),
        location,
        description,
        paymentType,
        hourlyRate: paymentType === 'hourly' ? parseFloat(hourlyRate) : null,
        fixedRate: paymentType === 'fixed' ? parseFloat(fixedRate) : null,
        hoursWorked,
        calculatedAmount
      };

      const createdReport = await prisma.workReports.create({
        data: reportData
      });

      if (!createdReport) {
        return res.status(500).json({ message: 'Error creating report' });
      }
      return res.status(201).json(createdReport);

    } catch (error) {
      console.error('Error creating work report:', error);
      return res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  try {
    // Añadimos headers para evitar cache y 304
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    const { userId, limit = 10 } = req.query;
    console.log('Extracted userId:', userId);
    console.log('Extracted limit:', limit);

    if (!userId) {
      console.log('userId is missing');
      return res.status(400).json({ message: 'userId is required' });
    }

    console.log('Attempting to fetch reports from database...');
    const reports = await prisma.workReports.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit),
      include: {
        jobTypeRef: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('Reports found:', reports.length);
    console.log('Reports data:', JSON.stringify(reports, null, 2));

    if (reports.length === 0) {
      console.log('No reports found for userId:', userId);
      return res.status(200).json([]);
    }
    console.log('Reports found:', JSON.stringify(reports, null, 2));
    return res.status(200).json(reports);

  } catch (error) {
    console.error('Error fetching work reports:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });

    return res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}
