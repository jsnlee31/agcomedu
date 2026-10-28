import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Grid, Typography } from '@mui/material';
import { apiArray, programsAPI } from '../../services/api';
import { useIsKorean } from '../../utils/language';

const ProgramList = () => {
  const navigate = useNavigate();
  const isKorean = useIsKorean();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await programsAPI.getAll({ limit: 100 });
        setPrograms(apiArray(response.data, 'programs'));
      } catch {
        setPrograms([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>{isKorean ? '프로그램' : 'Programs'}</Typography>
        <Typography variant="body2" color="text.secondary">{isKorean ? '진행 중인 프로그램을 확인하고 신청하세요.' : 'Browse and apply for available programs.'}</Typography>
      </Box>
      {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : (
        <Grid container spacing={2}>
          {programs.map((program) => (
            <Grid size={{ xs: 12, md: 6 }} key={program.id}>
              <Card><CardContent>
                <Typography variant="h6" fontWeight={700}>{(isKorean ? program.title_ko || program.title_en : program.title_en || program.title_ko) || '-'}</Typography>
                <Chip sx={{ my: 1 }} size="small" label={program.category || (isKorean ? '프로그램' : 'Program')} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{(isKorean ? program.description_ko || program.description_en : program.description_en || program.description_ko) || (isKorean ? '등록된 설명이 없습니다.' : 'No description provided.')}</Typography>
                <Button variant="contained" onClick={() => navigate(`/programs/${program.id}`)}>{isKorean ? '상세 보기' : 'View Details'}</Button>
              </CardContent></Card>
            </Grid>
          ))}
          {programs.length === 0 && <Grid size={12}><Card><CardContent><Typography align="center" color="text.secondary">{isKorean ? '등록된 프로그램이 없습니다.' : 'No programs are available.'}</Typography></CardContent></Card></Grid>}
        </Grid>
      )}
    </Box>
  );
};

export default ProgramList;
