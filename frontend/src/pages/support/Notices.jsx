import React, { useEffect, useState } from 'react';
import { Box, Card, CardActionArea, CardContent, Chip, CircularProgress, Collapse, TextField, Typography } from '@mui/material';
import { apiArray, announcementsAPI } from '../../services/api';
import { useIsKorean } from '../../utils/language';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ko-KR');
};

const Notices = () => {
  const isKorean = useIsKorean();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await announcementsAPI.getAll();
        setNotices(apiArray(response.data, 'announcements'));
      } catch {
        setNotices([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getTitle = (notice) => (isKorean ? notice.title_ko || notice.title_en : notice.title_en || notice.title_ko) || notice.title || '';
  const getContent = (notice) => (isKorean ? notice.content_ko || notice.content_en : notice.content_en || notice.content_ko) || notice.content || '';
  const filtered = notices.filter((notice) => `${notice.title_ko || ''} ${notice.title_en || ''} ${notice.title || ''}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Typography variant="h5" fontWeight={700}>{isKorean ? '공지사항' : 'Notices'}</Typography><Typography variant="body2" color="text.secondary">{isKorean ? '센터의 새로운 소식과 안내를 확인하세요.' : 'Check the latest news and announcements.'}</Typography></Box>
      <TextField fullWidth size="small" label={isKorean ? '공지 검색' : 'Search notices'} value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 2 }} />
      {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : filtered.length === 0 ? <Card><CardContent><Typography align="center" color="text.secondary">{isKorean ? '등록된 공지사항이 없습니다.' : 'No notices are available.'}</Typography></CardContent></Card> : filtered.map((notice) => (
        <Card key={notice.id} sx={{ mb: 1 }}>
          <CardActionArea onClick={() => setOpenId(openId === notice.id ? null : notice.id)}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {notice.is_pinned && <Chip size="small" color="primary" label={isKorean ? '중요' : 'Pinned'} />}
                <Typography fontWeight={700}>{getTitle(notice) || '-'}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">{formatDate(notice.created_at)}</Typography>
            </CardContent>
          </CardActionArea>
          <Collapse in={openId === notice.id} unmountOnExit>
            <CardContent sx={{ pt: 0 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>{getContent(notice) || (isKorean ? '내용이 없습니다.' : 'No content.')}</Typography>
            </CardContent>
          </Collapse>
        </Card>
      ))}
    </Box>
  );
};

export default Notices;
