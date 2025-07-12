import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://aqzcggujce.execute-api.us-east-1.amazonaws.com/prod',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '9ouhDraQJd6VZNSSwYunz4x8VTJw9bYtaKuL6s2m',
  },
});

export interface AnalysisRequest {
  startTime: string;
  endTime: string;
  prefix?: string;
}

export interface AnalysisResult {
  analysisId: string;
  timestamp: string;
  results: {
    totalRequests: number;
    blockedRequests: number;
    allowedRequests: number;
    topIPs: Record<string, number>;
    topRules: Record<string, number>;
    topUserAgents: Record<string, number>;
    threats: any[];
  };
  status: string;
}

export interface WebACL {
  name: string;
  id: string;
  arn: string;
  defaultAction: any;
  rules: any[];
  capacity: number;
}

export interface RuleRecommendation {
  type: string;
  severity: string;
  message: string;
}

export interface AIAnalysisRequest {
  action: 'analyze' | 'recommend' | 'optimize';
  data: any;
}

export const api = {
  async startAnalysis(request: AnalysisRequest): Promise<{ analysisId: string }> {
    const response = await apiClient.post('/logs', request);
    return response.data;
  },

  async getAnalysisResults(analysisId: string): Promise<{ items: AnalysisResult[] }> {
    const response = await apiClient.get('/logs', {
      params: { analysisId },
    });
    return response.data;
  },

  async getWebACLs(): Promise<{ webAcls: any[] }> {
    const response = await apiClient.get('/rules');
    return response.data;
  },

  async getWebACL(webAclArn: string): Promise<{
    webAcl: WebACL;
    analysis: {
      totalRules: number;
      rulesByAction: Record<string, number>;
      managedRuleGroups: any[];
      customRules: any[];
      rateLimitRules: any[];
      recommendations: RuleRecommendation[];
    };
  }> {
    const response = await apiClient.get('/rules', {
      params: { webAclArn },
    });
    return response.data;
  },

  async updateRules(webAclArn: string, updates: any[]): Promise<{ message: string }> {
    const response = await apiClient.put('/rules', {
      webAclArn,
      updates,
    });
    return response.data;
  },

  async getAIAnalysis(request: AIAnalysisRequest): Promise<any> {
    const response = await apiClient.post('/ai', request);
    return response.data;
  },
};