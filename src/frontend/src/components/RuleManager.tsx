import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';
import { api } from '../services/api';

interface Rule {
  Name: string;
  Priority: number;
  Action: any;
  Statement: any;
  VisibilityConfig: any;
}

const RuleManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webAcls, setWebAcls] = useState<any[]>([]);
  const [selectedWebAcl, setSelectedWebAcl] = useState<string>('');
  const [webAclDetails, setWebAclDetails] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  useEffect(() => {
    loadWebACLs();
  }, []);

  const loadWebACLs = async () => {
    setLoading(true);
    try {
      const response = await api.getWebACLs();
      setWebAcls(response.webAcls);
    } catch (err: any) {
      setError(err.message || 'Web ACLの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadWebACLDetails = async (arn: string) => {
    setLoading(true);
    try {
      const response = await api.getWebACL(arn);
      setWebAclDetails(response);
    } catch (err: any) {
      setError(err.message || 'Web ACL詳細の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleWebAclChange = (event: any) => {
    const arn = event.target.value;
    setSelectedWebAcl(arn);
    if (arn) {
      loadWebACLDetails(arn);
    }
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setEditDialogOpen(true);
  };

  const handleDeleteRule = async (rule: Rule) => {
    if (!window.confirm(`ルール "${rule.Name}" を削除しますか？`)) {
      return;
    }

    setLoading(true);
    try {
      await api.updateRules(selectedWebAcl, [
        { action: 'delete', rule: { Name: rule.Name } },
      ]);
      await loadWebACLDetails(selectedWebAcl);
    } catch (err: any) {
      setError(err.message || 'ルールの削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;

    setLoading(true);
    try {
      await api.updateRules(selectedWebAcl, [
        { action: 'update', rule: editingRule },
      ]);
      await loadWebACLDetails(selectedWebAcl);
      setEditDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'ルールの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return null;
    }
  };

  const getRuleTypeLabel = (rule: Rule) => {
    if (rule.Statement.ManagedRuleGroupStatement) {
      return 'マネージドルール';
    } else if (rule.Statement.RateBasedStatement) {
      return 'レートベース';
    } else {
      return 'カスタム';
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Web ACL選択
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Web ACL</InputLabel>
                <Select
                  value={selectedWebAcl}
                  onChange={handleWebAclChange}
                  disabled={loading}
                >
                  <MenuItem value="">
                    <em>選択してください</em>
                  </MenuItem>
                  {webAcls.map((acl) => (
                    <MenuItem key={acl.ARN} value={acl.ARN}>
                      {acl.Name} ({acl.Id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Grid>
        )}

        {webAclDetails && (
          <>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Web ACL情報
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    名前: {webAclDetails.webAcl.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    容量: {webAclDetails.webAcl.capacity} WCU
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ルール数: {webAclDetails.webAcl.rules.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    ルール分析
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        マネージドルール: {webAclDetails.analysis.managedRuleGroups.length}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        カスタムルール: {webAclDetails.analysis.customRules.length}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        レートベースルール: {webAclDetails.analysis.rateLimitRules.length}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {webAclDetails.analysis.recommendations.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      推奨事項
                    </Typography>
                    <List>
                      {webAclDetails.analysis.recommendations.map((rec: any, index: number) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center">
                                {getSeverityIcon(rec.severity)}
                                <Typography variant="body1" sx={{ ml: 1 }}>
                                  {rec.message}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            )}

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      ルール一覧
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setEditingRule({
                          Name: '',
                          Priority: 100,
                          Action: { Allow: {} },
                          Statement: {},
                          VisibilityConfig: {
                            SampledRequestsEnabled: true,
                            CloudWatchMetricsEnabled: true,
                            MetricName: '',
                          },
                        });
                        setEditDialogOpen(true);
                      }}
                    >
                      ルール追加
                    </Button>
                  </Box>
                  <List>
                    {webAclDetails.webAcl.rules.map((rule: Rule) => (
                      <Paper key={rule.Name} sx={{ mb: 1 }}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body1">{rule.Name}</Typography>
                                <Chip
                                  label={getRuleTypeLabel(rule)}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="body2" color="textSecondary">
                                優先度: {rule.Priority} | アクション: {Object.keys(rule.Action)[0]}
                              </Typography>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" onClick={() => handleEditRule(rule)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton edge="end" onClick={() => handleDeleteRule(rule)}>
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      </Paper>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRule?.Name ? 'ルール編集' : '新規ルール作成'}
        </DialogTitle>
        <DialogContent>
          {editingRule && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  label="ルール名"
                  fullWidth
                  value={editingRule.Name}
                  onChange={(e) => setEditingRule({ ...editingRule, Name: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="優先度"
                  type="number"
                  fullWidth
                  value={editingRule.Priority}
                  onChange={(e) => setEditingRule({ ...editingRule, Priority: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>アクション</InputLabel>
                  <Select
                    value={Object.keys(editingRule.Action)[0]}
                    onChange={(e) => {
                      const action = e.target.value;
                      setEditingRule({ ...editingRule, Action: { [action]: {} } });
                    }}
                  >
                    <MenuItem value="Allow">許可</MenuItem>
                    <MenuItem value="Block">ブロック</MenuItem>
                    <MenuItem value="Count">カウント</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleSaveRule} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RuleManager;