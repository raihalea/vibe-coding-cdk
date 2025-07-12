export const config = {
  API_BASE_URL: process.env.REACT_APP_API_URL || 'https://your-api-gateway-url.execute-api.region.amazonaws.com/prod',
  API_KEY: process.env.REACT_APP_API_KEY || '',
  REFRESH_INTERVAL: 30000, // 30 seconds
};