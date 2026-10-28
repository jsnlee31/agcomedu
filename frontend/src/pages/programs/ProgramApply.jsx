import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { apiObject, programsAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useIsKorean } from '../../utils/language';

const ProgramApply = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isKorean = useIsKorean();
  const { showSuccess, showError } = useNotification();
  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [program, setProgram] = useState(null);
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    const loadProgram = async () => {
      try {
        const response = await programsAPI.getById(id);
        const data = apiObject(response.data, 'program');
        setProgram(data.id ? data : null);
        const app = response.data?.userApplication || data.userApplication;
        const appStatus = String(app?.status || '').toLowerCase();
        const programStatus = String(data.status || '').toLowerCase();
        if (app && !['cancelled', 'canceled', '취소'].includes(appStatus)) setBlockReason('applied');
        else if (['closed', 'completed', 'cancelled', 'canceled', '종료', '마감', '완료', '취소'].includes(programStatus)) setBlockReason('closed');
        else setBlockReason('');
      } catch {
        setProgram(null);
      }
    };
    loadProgram();
  }, [id]);

  const steps = isKorean
    ? ['프로그램 확인', '신청서 작성', '신청 완료']
    : ['Confirm program', 'Write application', 'Submitted'];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await programsAPI.apply(id, data);
      setActiveStep(2);
      showSuccess(isKorean ? '프로그램 신청이 완료되었습니다.' : 'Application submitted.');
    } catch (error) {
      showError(isKorean ? (error.response?.data?.error || '신청에 실패했습니다.') : 'Application failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (activeStep === 2) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', py: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 68, mb: 2 }} />
            <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
              {isKorean ? '신청이 완료되었습니다.' : 'Application Submitted'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              {isKorean
                ? '신청 내역은 나의 활동에서 확인할 수 있습니다.'
                : 'You can review your application in My Activities.'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={() => navigate('/activities')}>
                {isKorean ? '나의 활동 보기' : 'View My Activities'}
              </Button>
              <Button variant="contained" onClick={() => navigate('/programs')}>
                {isKorean ? '프로그램 목록' : 'Program List'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/programs/${id}`)} sx={{ mb: 2 }}>
        {isKorean ? '프로그램으로 돌아가기' : 'Back to program'}
      </Button>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
            {isKorean ? '신청서 작성' : 'Application Form'}
          </Typography>
          {program && (
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              {(isKorean ? program.title_ko || program.title_en : program.title_en || program.title_ko) || ''}
            </Typography>
          )}
          {blockReason && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              {blockReason === 'applied'
                ? (isKorean ? '이미 신청한 프로그램입니다. 신청 내역은 나의 활동에서 확인할 수 있습니다.' : 'You have already applied to this program. See My Activities.')
                : (isKorean ? '현재 신청을 받지 않는 프로그램입니다.' : 'This program is not accepting applications.')}
            </Alert>
          )}

          <Alert severity="info" sx={{ mb: 3 }}>
            {isKorean
              ? '작성한 내용은 담당자 검토 후 승인 여부가 결정됩니다.'
              : 'Your application will be reviewed by the program manager.'}
          </Alert>

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label={isKorean ? '지원 동기' : 'Motivation'}
              multiline
              rows={4}
              {...register('motivation', {
                required: isKorean ? '지원 동기를 입력해 주세요.' : 'Please enter your motivation.',
                minLength: {
                  value: 10,
                  message: isKorean ? '최소 10자 이상 입력해 주세요.' : 'Please enter at least 10 characters.',
                },
              })}
              error={!!errors.motivation}
              helperText={errors.motivation?.message || (isKorean ? '프로그램에 신청하는 이유를 작성해 주세요.' : 'Tell us why you want to join this program.')}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label={isKorean ? '관련 경력 및 경험' : 'Related experience'}
              multiline
              rows={3}
              {...register('experience')}
              helperText={isKorean ? '관련 경력이나 경험이 있다면 작성해 주세요. 선택 사항입니다.' : 'Optional: add relevant background or experience.'}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label={isKorean ? '기대 사항' : 'Expectations'}
              multiline
              rows={2}
              {...register('expectations')}
              helperText={isKorean ? '프로그램을 통해 얻고 싶은 내용을 작성해 주세요. 선택 사항입니다.' : 'Optional: what do you expect from this program?'}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label={isKorean ? '기타 사항' : 'Notes'}
              multiline
              rows={2}
              {...register('notes')}
              helperText={isKorean ? '담당자에게 전달할 내용이 있으면 작성해 주세요. 선택 사항입니다.' : 'Optional: add anything else for the manager.'}
              sx={{ mb: 4 }}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={() => navigate(`/programs/${id}`)}>
                {isKorean ? '취소' : 'Cancel'}
              </Button>
              <Button type="submit" variant="contained" disabled={loading || Boolean(blockReason)}>
                {loading ? (isKorean ? '제출 중...' : 'Submitting...') : (isKorean ? '신청서 제출' : 'Submit Application')}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProgramApply;
