import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { apiArray, inquiriesAPI } from '../../services/api';
import { useIsKorean } from '../../utils/language';

const STATUS_LABELS = {
  pending: ['대기중', 'Waiting'],
  waiting: ['대기중', 'Waiting'],
  open: ['접수', 'Open'],
  processing: ['처리중', 'Processing'],
  in_progress: ['처리중', 'Processing'],
  answered: ['답변 완료', 'Answered'],
  completed: ['답변 완료', 'Completed'],
  closed: ['종료', 'Closed'],
};

const CATEGORY_LABELS = {
  account: ['회원/계정', 'Account'],
  program: ['프로그램', 'Program'],
  job: ['채용정보', 'Jobs'],
  learning: ['학습자료', 'Learning'],
  technical: ['기술 문제', 'Technical'],
  other: ['기타', 'Other'],
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ko-KR');
};

const InquiryList = () => {
  const navigate = useNavigate();
  const isKorean = useIsKorean();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await inquiriesAPI.getMine();
        setInquiries(apiArray(response.data, 'inquiries'));
      } catch {
        setInquiries([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}><Box><Typography variant="h5" fontWeight={700}>{isKorean ? '나의 문의' : 'My Inquiries'}</Typography><Typography variant="body2" color="text.secondary">{isKorean ? '등록하신 1:1 문의와 답변을 확인하세요.' : 'Check your inquiries and responses.'}</Typography></Box><Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/support/inquiry')}>{isKorean ? '새 문의' : 'New Inquiry'}</Button></Box>
      {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : inquiries.length === 0 ? <Card><CardContent><Typography align="center" color="text.secondary">{isKorean ? '등록된 문의가 없습니다.' : 'No inquiries are available.'}</Typography></CardContent></Card> : inquiries.map((item) => {
        const status = STATUS_LABELS[item.status] || STATUS_LABELS.open;
        const category = CATEGORY_LABELS[item.category];
        return (
          <Card key={item.id} sx={{ mb: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                {category && <Chip size="small" variant="outlined" label={isKorean ? category[0] : category[1]} />}
                <Chip size="small" color={item.status === 'completed' || item.status === 'answered' ? 'success' : 'default'} label={isKorean ? status[0] : status[1]} />
                <Typography variant="caption" color="text.secondary">{formatDate(item.created_at)}</Typography>
              </Box>
              <Typography fontWeight={700}>{item.title || '-'}</Typography>
              {item.content && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>{item.content}</Typography>}
              {item.response && (
                <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: '#F8F9FA', borderRadius: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>{isKorean ? '답변' : 'Response'}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{item.response}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default InquiryList;
