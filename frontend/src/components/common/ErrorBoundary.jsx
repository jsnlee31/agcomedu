import React from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Keep this visible in Vercel/browser logs without crashing the shell.
    console.error('Route render failed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const isKorean = (localStorage.getItem('language') || 'ko').startsWith('ko');
      return (
        <Box sx={{ maxWidth: 720, mx: 'auto', py: 8, px: 2 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography fontWeight={700}>{isKorean ? '페이지를 불러오지 못했습니다.' : 'This page could not finish loading.'}</Typography>
            <Typography variant="body2">{isKorean ? '새로고침하거나 홈으로 이동해 주세요.' : 'Please refresh or go back to the home page.'}</Typography>
          </Alert>
          <Button variant="contained" onClick={() => window.location.assign('/')}>
            {isKorean ? '홈으로 이동' : 'Go Home'}
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
