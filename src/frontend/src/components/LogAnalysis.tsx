import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { api, AnalysisResult } from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const LogAnalysis: React.FC = () => {
  const [startTime, setStartTime] = useState<Date | null>(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const [endTime, setEndTime] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!startTime || !endTime) {
      setError('開始時刻と終了時刻を選択してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.startAnalysis({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      setAnalysisId(response.analysisId);
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!analysisId) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.getAnalysisResults(analysisId);
        if (response.items.length > 0 && response.items[0].status === 'completed') {
          setResults(response.items[0]);
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error fetching results:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [analysisId]);

  const prepareChartData = () => {
    if (!results) return { pieData: [], barData: [] };

    const pieData = [
      { name: 'ブロック', value: results.results.blockedRequests },
      { name: '許可', value: results.results.allowedRequests },
    ];

    const barData = Object.entries(results.results.topRules)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return { pieData, barData };
  };

  const { pieData, barData } = prepareChartData();

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ログ分析期間の選択
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                  <DateTimePicker
                    label="開始時刻"
                    value={startTime}
                    onChange={(newValue) => setStartTime(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Box>
                <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                  <DateTimePicker
                    label="終了時刻"
                    value={endTime}
                    onChange={(newValue) => setEndTime(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Box>
                <Box sx={{ flex: '0 1 200px', minWidth: '150px' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAnalyze}
                    disabled={loading}
                    fullWidth
                    size="large"
                  >
                    {loading ? <CircularProgress size={24} /> : '分析開始'}
                  </Button>
                </Box>
              </Box>
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>

        {results && (
          <>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 500px', minWidth: '400px' }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      リクエスト統計
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ flex: '1 1 120px' }}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4">{results.results.totalRequests}</Typography>
                          <Typography color="textSecondary">総リクエスト</Typography>
                        </Paper>
                      </Box>
                      <Box sx={{ flex: '1 1 120px' }}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee' }}>
                          <Typography variant="h4" color="error">
                            {results.results.blockedRequests}
                          </Typography>
                          <Typography color="textSecondary">ブロック</Typography>
                        </Paper>
                      </Box>
                      <Box sx={{ flex: '1 1 120px' }}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
                          <Typography variant="h4" color="success.main">
                            {results.results.allowedRequests}
                          </Typography>
                          <Typography color="textSecondary">許可</Typography>
                        </Paper>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              <Box sx={{ flex: '1 1 400px', minWidth: '300px' }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      ブロック率
                    </Typography>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Box>
            </Box>

            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    トップトリガールール
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 400px', minWidth: '300px' }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      トップIP
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>IPアドレス</TableCell>
                            <TableCell align="right">リクエスト数</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(results.results.topIPs).map(([ip, count]) => (
                            <TableRow key={ip}>
                              <TableCell>{ip}</TableCell>
                              <TableCell align="right">{count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Box>

              <Box sx={{ flex: '1 1 400px', minWidth: '300px' }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      トップユーザーエージェント
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ユーザーエージェント</TableCell>
                            <TableCell align="right">リクエスト数</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(results.results.topUserAgents).map(([ua, count]) => (
                            <TableRow key={ua}>
                              <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {ua}
                              </TableCell>
                              <TableCell align="right">{count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default LogAnalysis;