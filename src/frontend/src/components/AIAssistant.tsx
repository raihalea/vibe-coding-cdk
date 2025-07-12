import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SecurityIcon from '@mui/icons-material/Security';
import TuneIcon from '@mui/icons-material/Tune';
import { api } from '../services/api';

const AIAssistant: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'analyze' | 'recommend' | 'optimize'>('analyze');
  const [analysisId, setAnalysisId] = useState('');
  const [pattern, setPattern] = useState('');
  const [objective, setObjective] = useState('');
  const [results, setResults] = useState<any>(null);

  const handleSubmit = async () => {
    if (!analysisId && action !== 'optimize') {
      setError('分析IDを入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let requestData;
      switch (action) {
        case 'analyze':
          if (!pattern) {
            setError('分析対象のパターンを入力してください');
            return;
          }
          requestData = { analysisId, pattern };
          break;
        case 'recommend':
          requestData = { analysisId, objective };
          break;
        case 'optimize':
          if (!objective) {
            setError('最適化の目的を入力してください');
            return;
          }
          requestData = { objective };
          break;
      }

      const response = await api.getAIAnalysis({
        action,
        data: requestData,
      });

      setResults(response);
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = () => {
    switch (action) {
      case 'analyze':
        return <PsychologyIcon color="primary" />;
      case 'recommend':
        return <SecurityIcon color="secondary" />;
      case 'optimize':
        return <TuneIcon color="success" />;
    }
  };

  const getActionTitle = () => {
    switch (action) {
      case 'analyze':
        return 'パターン分析';
      case 'recommend':
        return 'ルール推奨';
      case 'optimize':
        return '設定最適化';
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                {getActionIcon()}
                <Typography variant="h6" sx={{ ml: 1 }}>
                  AI アシスタント - {getActionTitle()}
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>機能選択</InputLabel>
                    <Select
                      value={action}
                      onChange={(e) => setAction(e.target.value as any)}
                      disabled={loading}
                    >
                      <MenuItem value="analyze">パターン分析</MenuItem>
                      <MenuItem value="recommend">ルール推奨</MenuItem>
                      <MenuItem value="optimize">設定最適化</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {action !== 'optimize' && (
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="分析ID"
                      fullWidth
                      value={analysisId}
                      onChange={(e) => setAnalysisId(e.target.value)}
                      disabled={loading}
                      helperText="ログ分析で生成されたIDを入力"
                    />
                  </Grid>
                )}

                {action === 'analyze' && (
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="分析パターン"
                      fullWidth
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                      disabled={loading}
                      helperText="例: suspicious IP behavior"
                    />
                  </Grid>
                )}

                {(action === 'recommend' || action === 'optimize') && (
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="目的・目標"
                      fullWidth
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      disabled={loading}
                      helperText="例: 誤検知を減らしつつセキュリティを向上"
                    />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    size="large"
                    startIcon={loading ? <CircularProgress size={20} /> : getActionIcon()}
                  >
                    {loading ? '分析中...' : 'AI分析開始'}
                  </Button>
                </Grid>
              </Grid>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {results && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  AI分析結果
                </Typography>

                {action === 'analyze' && results.analysis && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      パターン: {results.pattern}
                    </Typography>
                    <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                        {results.analysis}
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {action === 'recommend' && results.recommendations && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      推奨ルール
                    </Typography>
                    {Array.isArray(results.recommendations.rules) && results.recommendations.rules.length > 0 ? (
                      <List>
                        {results.recommendations.rules.map((rule: any, index: number) => (
                          <React.Fragment key={index}>
                            <ListItem>
                              <ListItemText
                                primary={
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="body1">{rule.name || `ルール ${index + 1}`}</Typography>
                                    <Chip label={rule.type || 'カスタム'} size="small" />
                                  </Box>
                                }
                                secondary={rule.description || rule.reason}
                              />
                            </ListItem>
                            {index < results.recommendations.rules.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    ) : (
                      <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                          {results.reasoning || JSON.stringify(results, null, 2)}
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                )}

                {action === 'optimize' && results.optimizations && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      最適化提案
                    </Typography>
                    {Array.isArray(results.optimizations.changes) && results.optimizations.changes.length > 0 ? (
                      <List>
                        {results.optimizations.changes.map((change: any, index: number) => (
                          <React.Fragment key={index}>
                            <ListItem>
                              <ListItemText
                                primary={change.title || `最適化 ${index + 1}`}
                                secondary={
                                  <Box>
                                    <Typography variant="body2">{change.description}</Typography>
                                    {change.impact && (
                                      <Typography variant="caption" color="textSecondary">
                                        期待効果: {change.impact}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                              />
                            </ListItem>
                            {index < results.optimizations.changes.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    ) : (
                      <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                          {results.explanation || JSON.stringify(results, null, 2)}
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                )}

                <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
                  分析日時: {results.timestamp ? new Date(results.timestamp).toLocaleString('ja-JP') : '不明'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AIAssistant;