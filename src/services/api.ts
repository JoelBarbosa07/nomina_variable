const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
}

interface WorkReport {
  id: string;
  jobType: string;
  eventName: string;
  eventDate: string;
  hoursWorked: number;
  calculatedAmount: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface DashboardStats {
  totalJobs: number;
  totalHours: number;
  totalEarnings: number;
  pendingJobs: number;
  weeklyProgress: number;
  jobDistribution: Record<string, number>;
}

interface RequestOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

class ApiService {
  public async makeRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = localStorage.getItem('authToken');
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        body: options.body,
        cache: 'no-store', // Previene respuestas 304
      });

      // Manejo respuesta 204 No Content
      if (response.status === 204) {
        return [] as T;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        console.warn('⚠️ Respuesta no JSON:', text);
        throw new Error(`Expected JSON but got ${contentType}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request to ${url} failed:`, error);
      throw error;
    }
  }

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      const data = await this.makeRequest<DashboardStats>(`/dashboard-stats?userId=${userId}`);
      return data;
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      return {
        totalJobs: 0,
        totalHours: 0,
        totalEarnings: 0,
        pendingJobs: 0,
        weeklyProgress: 0,
        jobDistribution: {},
      };
    }
  }

  async approveReport(reportId: string): Promise<void> {
    try {
      await this.makeRequest<void>(`/work-reports/${reportId}/approve`, {
        method: 'PATCH'
      });
    } catch (error) {
      console.error('Error approving report:', error);
      throw error;
    }
  }

  async createWorkReport(reportData: {
    userId: string;
    jobType: string;
    customJobType?: string;
    eventName: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    location?: string;
    description?: string;
    paymentType: string;
    hourlyRate?: number;
    fixedRate?: number;
  }): Promise<WorkReport> {
    try {
      const response = await this.makeRequest<WorkReport>('/work-reports', {
        method: 'POST',
        body: JSON.stringify(reportData)
      });
      return response;
    } catch (error) {
      console.error('Error creating work report:', error);
      throw error;
    }
  }

  async updateWebhook(userId: string, webhookUrl: string): Promise<any> {
    try {
      const token = localStorage.getItem('authToken');
      return await this.makeRequest<any>(`/users/${userId}/webhook`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ webhookUrl })
      });
    } catch (error) {
      console.error('Error updating webhook:', error);
      throw error;
    }
  }

  async getRecentJobs(userId: string, limit = 20): Promise<WorkReport[]> {
    try {
      // Cambié la ruta de /recent-reports a /work-reports
      const data = await this.makeRequest<WorkReport[]>(`/work-reports?userId=${userId}&limit=${limit}`);
      return data;
    } catch (error) {
      console.error('❌ Error fetching recent jobs:', error);
      return [];
    }
  }
}

export const apiService = new ApiService();
export type { WorkReport, DashboardStats };