import axios from 'axios';
import { api } from '../../services/api';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.create to return the mocked axios instance
mockedAxios.create.mockReturnValue(mockedAxios);

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startAnalysis', () => {
    test('sends POST request to /logs with correct data', async () => {
      const mockResponse = { data: { analysisId: 'test-analysis-123' } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const request = {
        startTime: '2023-01-01T00:00:00.000Z',
        endTime: '2023-01-02T00:00:00.000Z',
      };

      const result = await api.startAnalysis(request);

      expect(mockedAxios.post).toHaveBeenCalledWith('/logs', request);
      expect(result).toEqual({ analysisId: 'test-analysis-123' });
    });

    test('handles API errors', async () => {
      const mockError = new Error('Network error');
      mockedAxios.post.mockRejectedValue(mockError);

      const request = {
        startTime: '2023-01-01T00:00:00.000Z',
        endTime: '2023-01-02T00:00:00.000Z',
      };

      await expect(api.startAnalysis(request)).rejects.toThrow('Network error');
    });
  });

  describe('getAnalysisResults', () => {
    test('sends GET request to /logs with analysisId parameter', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              analysisId: 'test-analysis-123',
              timestamp: '2023-01-01T12:00:00.000Z',
              results: {
                totalRequests: 1000,
                blockedRequests: 50,
                allowedRequests: 950,
                topIPs: { '192.168.1.1': 100 },
                topRules: { 'RateLimitRule': 30 },
                topUserAgents: { 'Mozilla/5.0': 500 },
                threats: [],
              },
              status: 'completed',
            },
          ],
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await api.getAnalysisResults('test-analysis-123');

      expect(mockedAxios.get).toHaveBeenCalledWith('/logs', {
        params: { analysisId: 'test-analysis-123' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].analysisId).toBe('test-analysis-123');
    });
  });

  describe('getWebACLs', () => {
    test('sends GET request to /rules', async () => {
      const mockResponse = {
        data: {
          webAcls: [
            { Name: 'TestWebACL', Id: 'test-id', ARN: 'arn:aws:wafv2:::webacl/test' },
          ],
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await api.getWebACLs();

      expect(mockedAxios.get).toHaveBeenCalledWith('/rules');
      expect(result.webAcls).toHaveLength(1);
      expect(result.webAcls[0].Name).toBe('TestWebACL');
    });
  });

  describe('getWebACL', () => {
    test('sends GET request to /rules with webAclArn parameter', async () => {
      const mockResponse = {
        data: {
          webAcl: {
            name: 'TestWebACL',
            id: 'test-id',
            arn: 'arn:aws:wafv2:::webacl/test',
            defaultAction: { Allow: {} },
            rules: [],
            capacity: 100,
          },
          analysis: {
            totalRules: 0,
            rulesByAction: {},
            managedRuleGroups: [],
            customRules: [],
            rateLimitRules: [],
            recommendations: [],
          },
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await api.getWebACL('arn:aws:wafv2:::webacl/test');

      expect(mockedAxios.get).toHaveBeenCalledWith('/rules', {
        params: { webAclArn: 'arn:aws:wafv2:::webacl/test' },
      });
      expect(result.webAcl.name).toBe('TestWebACL');
    });
  });

  describe('updateRules', () => {
    test('sends PUT request to /rules with updates', async () => {
      const mockResponse = { data: { message: 'Rules updated successfully' } };
      mockedAxios.put.mockResolvedValue(mockResponse);

      const updates = [
        {
          action: 'add',
          rule: {
            Name: 'NewRule',
            Priority: 10,
            Action: { Block: {} },
            Statement: {},
            VisibilityConfig: {},
          },
        },
      ];

      const result = await api.updateRules('arn:aws:wafv2:::webacl/test', updates);

      expect(mockedAxios.put).toHaveBeenCalledWith('/rules', {
        webAclArn: 'arn:aws:wafv2:::webacl/test',
        updates,
      });
      expect(result.message).toBe('Rules updated successfully');
    });
  });

  describe('getAIAnalysis', () => {
    test('sends POST request to /ai with analysis request', async () => {
      const mockResponse = {
        data: {
          pattern: 'suspicious activity',
          analysis: 'Detected potential DDoS attack',
          timestamp: '2023-01-01T12:00:00.000Z',
        },
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const request = {
        action: 'analyze' as const,
        data: {
          analysisId: 'test-analysis-123',
          pattern: 'suspicious activity',
        },
      };

      const result = await api.getAIAnalysis(request);

      expect(mockedAxios.post).toHaveBeenCalledWith('/ai', request);
      expect(result.pattern).toBe('suspicious activity');
    });
  });
});