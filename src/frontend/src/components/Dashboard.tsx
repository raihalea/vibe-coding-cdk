import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Container,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  Paper,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import LogAnalysis from './LogAnalysis';
import RuleManager from './RuleManager';
import AIAssistant from './AIAssistant';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <SecurityIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            AWS WAF Log Analyzer
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="ログ分析" />
            <Tab label="ルール管理" />
            <Tab label="AI アシスタント" />
          </Tabs>
        </Paper>

        <TabPanel value={activeTab} index={0}>
          <LogAnalysis />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <RuleManager />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <AIAssistant />
        </TabPanel>
      </Container>
    </Box>
  );
};

export default Dashboard;