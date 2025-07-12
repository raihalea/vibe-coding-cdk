import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Dashboard from '../components/Dashboard';

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        {component}
      </LocalizationProvider>
    </ThemeProvider>
  );
};

// Mock the child components
jest.mock('../components/LogAnalysis', () => {
  return function MockLogAnalysis() {
    return <div data-testid="log-analysis">Log Analysis Component</div>;
  };
});

jest.mock('../components/RuleManager', () => {
  return function MockRuleManager() {
    return <div data-testid="rule-manager">Rule Manager Component</div>;
  };
});

jest.mock('../components/AIAssistant', () => {
  return function MockAIAssistant() {
    return <div data-testid="ai-assistant">AI Assistant Component</div>;
  };
});

describe('Dashboard', () => {
  test('renders dashboard with correct title', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText('AWS WAF Log Analyzer')).toBeInTheDocument();
  });

  test('renders all tabs', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText('ログ分析')).toBeInTheDocument();
    expect(screen.getByText('ルール管理')).toBeInTheDocument();
    expect(screen.getByText('AI アシスタント')).toBeInTheDocument();
  });

  test('shows log analysis component by default', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByTestId('log-analysis')).toBeInTheDocument();
    expect(screen.queryByTestId('rule-manager')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant')).not.toBeInTheDocument();
  });

  test('switches to rule manager tab when clicked', () => {
    renderWithProviders(<Dashboard />);
    
    fireEvent.click(screen.getByText('ルール管理'));
    
    expect(screen.queryByTestId('log-analysis')).not.toBeInTheDocument();
    expect(screen.getByTestId('rule-manager')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant')).not.toBeInTheDocument();
  });

  test('switches to AI assistant tab when clicked', () => {
    renderWithProviders(<Dashboard />);
    
    fireEvent.click(screen.getByText('AI アシスタント'));
    
    expect(screen.queryByTestId('log-analysis')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rule-manager')).not.toBeInTheDocument();
    expect(screen.getByTestId('ai-assistant')).toBeInTheDocument();
  });

  test('maintains selected tab state', () => {
    renderWithProviders(<Dashboard />);
    
    // Switch to rule manager
    fireEvent.click(screen.getByText('ルール管理'));
    expect(screen.getByTestId('rule-manager')).toBeInTheDocument();
    
    // Switch to AI assistant
    fireEvent.click(screen.getByText('AI アシスタント'));
    expect(screen.getByTestId('ai-assistant')).toBeInTheDocument();
    
    // Switch back to log analysis
    fireEvent.click(screen.getByText('ログ分析'));
    expect(screen.getByTestId('log-analysis')).toBeInTheDocument();
  });
});