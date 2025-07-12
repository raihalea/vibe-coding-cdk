import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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

interface RuleTemplate {
  name: string;
  description: string;
  category: string;
  template: Partial<Rule>;
}

const RuleManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webAcls, setWebAcls] = useState<any[]>([]);
  const [selectedWebAcl, setSelectedWebAcl] = useState<string>('');
  const [webAclDetails, setWebAclDetails] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [ruleType, setRuleType] = useState<'custom' | 'managed' | 'rate-limit'>('custom');

  const ruleTemplates: RuleTemplate[] = [
    {
      name: 'SQLインジェクション防御',
      description: 'SQLインジェクション攻撃をブロックします',
      category: 'セキュリティ',
      template: {
        Statement: {
          ManagedRuleGroupStatement: {
            VendorName: 'AWS',
            Name: 'AWSManagedRulesSQLiRuleSet',
          },
        },
        Action: { Block: {} },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'SQLiRuleSet',
        },
      },
    },
    {
      name: 'XSS攻撃防御',
      description: 'クロスサイトスクリプティング攻撃をブロックします',
      category: 'セキュリティ',
      template: {
        Statement: {
          ManagedRuleGroupStatement: {
            VendorName: 'AWS',
            Name: 'AWSManagedRulesKnownBadInputsRuleSet',
          },
        },
        Action: { Block: {} },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'XSSRuleSet',
        },
      },
    },
    {
      name: 'レート制限',
      description: '高頻度リクエストを制限します',
      category: 'レート制限',
      template: {
        Statement: {
          RateBasedStatement: {
            Limit: 2000,
            AggregateKeyType: 'IP',
          },
        },
        Action: { Block: {} },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'RateLimit',
        },
      },
    },
    {
      name: 'IP ブロックリスト',
      description: '特定のIPアドレスをブロックします',
      category: 'アクセス制御',
      template: {
        Statement: {
          IPSetReferenceStatement: {
            ARN: '', // ユーザーが設定
          },
        },
        Action: { Block: {} },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'IPBlockList',
        },
      },
    },
  ];

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
      const action = editingRule.Name && webAclDetails?.webAcl.rules.some((r: Rule) => r.Name === editingRule.Name) ? 'update' : 'add';
      
      await api.updateRules(selectedWebAcl, [
        { action, rule: editingRule },
      ]);
      await loadWebACLDetails(selectedWebAcl);
      setEditDialogOpen(false);
      setEditingRule(null);
    } catch (err: any) {
      setError(err.message || 'ルールの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: RuleTemplate) => {
    const newRule: Rule = {
      Name: `${template.name}_${Date.now()}`,
      Priority: getNextPriority(),
      Action: template.template.Action || { Allow: {} },
      Statement: template.template.Statement || {},
      VisibilityConfig: {
        SampledRequestsEnabled: true,
        CloudWatchMetricsEnabled: true,
        MetricName: template.template.VisibilityConfig?.MetricName || `Rule_${Date.now()}`,
        ...template.template.VisibilityConfig,
      },
    };
    
    setEditingRule(newRule);
    setTemplateDialogOpen(false);
    setEditDialogOpen(true);
  };

  const getNextPriority = (): number => {
    if (!webAclDetails?.webAcl.rules) return 100;
    const existingPriorities = webAclDetails.webAcl.rules.map((rule: Rule) => rule.Priority);
    return Math.max(...existingPriorities, 0) + 10;
  };

  const createNewCustomRule = () => {
    const newRule: Rule = {
      Name: `CustomRule_${Date.now()}`,
      Priority: getNextPriority(),
      Action: { Allow: {} },
      Statement: {
        ByteMatchStatement: {
          SearchString: '',
          FieldToMatch: { UriPath: {} },
          TextTransformations: [
            {
              Priority: 0,
              Type: 'NONE',
            },
          ],
          PositionalConstraint: 'CONTAINS',
        },
      },
      VisibilityConfig: {
        SampledRequestsEnabled: true,
        CloudWatchMetricsEnabled: true,
        MetricName: `CustomRule_${Date.now()}`,
      },
    };
    
    setEditingRule(newRule);
    setEditDialogOpen(true);
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
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
        </Box>

        {error && (
          <Box>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Box>
        )}

        {webAclDetails && (
          <>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
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
              </Box>

              <Box sx={{ flex: '2 1 600px', minWidth: '500px' }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      ルール分析
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ flex: '1 1 200px' }}>
                        <Typography variant="body2">
                          マネージドルール: {webAclDetails.analysis.managedRuleGroups.length}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: '1 1 200px' }}>
                        <Typography variant="body2">
                          カスタムルール: {webAclDetails.analysis.customRules.length}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: '1 1 200px' }}>
                        <Typography variant="body2">
                          レートベースルール: {webAclDetails.analysis.rateLimitRules.length}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>

            {webAclDetails.analysis.recommendations.length > 0 && (
              <Box>
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
              </Box>
            )}

            <Box>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      ルール一覧
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setTemplateDialogOpen(true)}
                      >
                        テンプレートから追加
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={createNewCustomRule}
                      >
                        カスタムルール追加
                      </Button>
                    </Box>
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
            </Box>
          </>
        )}
      </Box>

      {/* テンプレート選択ダイアログ */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>ルールテンプレートを選択</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            事前定義されたテンプレートから、よく使用されるセキュリティルールを簡単に追加できます。
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {ruleTemplates.map((template, index) => (
              <Paper 
                key={index} 
                sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
                onClick={() => handleTemplateSelect(template)}
              >
                <Box display="flex" justifyContent="space-between" alignItems="start">
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {template.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {template.description}
                    </Typography>
                    <Chip 
                      label={template.category} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  </Box>
                  <Button variant="outlined" size="small">
                    選択
                  </Button>
                </Box>
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>キャンセル</Button>
        </DialogActions>
      </Dialog>

      {/* ルール編集ダイアログ */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRule?.Name ? 'ルール編集' : '新規ルール作成'}
        </DialogTitle>
        <DialogContent>
          {editingRule && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box>
                <TextField
                  label="ルール名"
                  fullWidth
                  value={editingRule.Name}
                  onChange={(e) => setEditingRule({ ...editingRule, Name: e.target.value })}
                  helperText="ルールを識別するためのユニークな名前"
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="優先度"
                    type="number"
                    fullWidth
                    value={editingRule.Priority}
                    onChange={(e) => setEditingRule({ ...editingRule, Priority: parseInt(e.target.value) })}
                    helperText="小さい数字ほど高い優先度"
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
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
                </Box>
              </Box>

              <Box>
                <TextField
                  label="CloudWatch メトリクス名"
                  fullWidth
                  value={editingRule.VisibilityConfig.MetricName}
                  onChange={(e) => setEditingRule({ 
                    ...editingRule, 
                    VisibilityConfig: { 
                      ...editingRule.VisibilityConfig, 
                      MetricName: e.target.value 
                    } 
                  })}
                  helperText="CloudWatchでメトリクスを識別するための名前"
                />
              </Box>

              {/* レートベースルールの設定 */}
              {editingRule.Statement.RateBasedStatement && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    レート制限設定
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="制限値 (リクエスト/5分)"
                      type="number"
                      fullWidth
                      value={editingRule.Statement.RateBasedStatement.Limit}
                      onChange={(e) => setEditingRule({
                        ...editingRule,
                        Statement: {
                          ...editingRule.Statement,
                          RateBasedStatement: {
                            ...editingRule.Statement.RateBasedStatement,
                            Limit: parseInt(e.target.value)
                          }
                        }
                      })}
                    />
                    <FormControl fullWidth>
                      <InputLabel>集約キータイプ</InputLabel>
                      <Select
                        value={editingRule.Statement.RateBasedStatement.AggregateKeyType}
                        onChange={(e) => setEditingRule({
                          ...editingRule,
                          Statement: {
                            ...editingRule.Statement,
                            RateBasedStatement: {
                              ...editingRule.Statement.RateBasedStatement,
                              AggregateKeyType: e.target.value
                            }
                          }
                        })}
                      >
                        <MenuItem value="IP">IP アドレス</MenuItem>
                        <MenuItem value="FORWARDED_IP">転送先 IP</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              )}

              {/* バイトマッチルールの設定 */}
              {editingRule.Statement.ByteMatchStatement && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    文字列マッチング設定
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="検索文字列"
                      fullWidth
                      value={editingRule.Statement.ByteMatchStatement.SearchString}
                      onChange={(e) => setEditingRule({
                        ...editingRule,
                        Statement: {
                          ...editingRule.Statement,
                          ByteMatchStatement: {
                            ...editingRule.Statement.ByteMatchStatement,
                            SearchString: e.target.value
                          }
                        }
                      })}
                    />
                    <FormControl fullWidth>
                      <InputLabel>位置の制約</InputLabel>
                      <Select
                        value={editingRule.Statement.ByteMatchStatement.PositionalConstraint}
                        onChange={(e) => setEditingRule({
                          ...editingRule,
                          Statement: {
                            ...editingRule.Statement,
                            ByteMatchStatement: {
                              ...editingRule.Statement.ByteMatchStatement,
                              PositionalConstraint: e.target.value
                            }
                          }
                        })}
                      >
                        <MenuItem value="EXACTLY">完全一致</MenuItem>
                        <MenuItem value="STARTS_WITH">開始位置</MenuItem>
                        <MenuItem value="ENDS_WITH">終了位置</MenuItem>
                        <MenuItem value="CONTAINS">含む</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              )}

              {/* マネージドルールの情報表示 */}
              {editingRule.Statement.ManagedRuleGroupStatement && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    マネージドルール設定
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="ベンダー"
                      fullWidth
                      value={editingRule.Statement.ManagedRuleGroupStatement.VendorName}
                      disabled
                    />
                    <TextField
                      label="ルールグループ名"
                      fullWidth
                      value={editingRule.Statement.ManagedRuleGroupStatement.Name}
                      disabled
                    />
                  </Box>
                </Box>
              )}
            </Box>
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