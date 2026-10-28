import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Typography,
} from '@mui/material';
import { useIsKorean } from '../../utils/language';

const POLICIES = {
  privacy: {
    titleKey: 'footer.privacyPolicy',
    ko: [
      ['1. 수집하는 개인정보 항목', '회원가입 및 서비스 이용 과정에서 이름, 이메일, 연락처, 소속 등 서비스 제공에 필요한 최소한의 정보를 수집합니다.'],
      ['2. 개인정보의 이용 목적', '회원 관리, 프로그램 신청 및 상담 예약, 학습 이력 관리, 문의 답변, 공지사항 전달 등 서비스 제공을 위해 이용합니다.'],
      ['3. 보유 및 이용 기간', '회원 탈퇴 시 또는 수집·이용 목적 달성 시 지체 없이 파기합니다. 다만 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.'],
      ['4. 제3자 제공', '이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 법령에 근거가 있는 경우는 예외로 합니다.'],
      ['5. 이용자의 권리', '이용자는 언제든지 자신의 개인정보를 열람·정정·삭제하거나 처리 정지를 요청할 수 있습니다.'],
      ['6. 문의처', '개인정보 관련 문의는 1:1 문의 또는 대표번호(070-737-8600)로 연락해 주시기 바랍니다.'],
    ],
    en: [
      ['1. Information collected', 'We collect the minimum information needed to provide the service, such as name, email, phone number and affiliation.'],
      ['2. Purpose of use', 'Member management, program applications, consultation bookings, learning history, inquiry responses and notices.'],
      ['3. Retention', 'Data is destroyed without delay upon withdrawal or once its purpose is fulfilled, unless retention is required by law.'],
      ['4. Third parties', 'We do not provide personal information to third parties without consent, except where required by law.'],
      ['5. Your rights', 'You may request access, correction, deletion or suspension of processing of your personal information at any time.'],
      ['6. Contact', 'For privacy questions, use the 1:1 inquiry or call 070-737-8600.'],
    ],
  },
  terms: {
    titleKey: 'footer.termsOfService',
    ko: [
      ['제1조 (목적)', '본 약관은 플랫폼이 제공하는 프로그램, 학습, 상담, 채용정보 등 서비스의 이용 조건과 절차를 정함을 목적으로 합니다.'],
      ['제2조 (회원가입)', '이용자는 정해진 절차에 따라 회원가입을 신청하며, 운영자의 승인으로 회원 자격이 부여됩니다.'],
      ['제3조 (회원의 의무)', '회원은 정확한 정보를 제공해야 하며, 타인의 정보를 도용하거나 서비스 운영을 방해하는 행위를 해서는 안 됩니다.'],
      ['제4조 (서비스의 제공 및 변경)', '운영자는 서비스 내용을 변경하거나 중단할 수 있으며, 중요한 변경 사항은 공지사항을 통해 안내합니다.'],
      ['제5조 (게시물 및 자료)', '제공되는 학습 자료 및 게시물의 저작권은 운영자 또는 원저작자에게 있으며, 무단 복제·배포를 금지합니다.'],
      ['제6조 (면책)', '천재지변 등 불가항력으로 인한 서비스 중단에 대해서는 책임이 면제됩니다.'],
    ],
    en: [
      ['Article 1 (Purpose)', 'These terms set out the conditions for using the platform services, including programs, learning, consultations and job information.'],
      ['Article 2 (Membership)', 'Users apply for membership through the designated process; membership is granted upon administrator approval.'],
      ['Article 3 (Member obligations)', 'Members must provide accurate information and must not misuse others\' information or disrupt the service.'],
      ['Article 4 (Service changes)', 'The operator may change or suspend services; important changes are announced via notices.'],
      ['Article 5 (Content)', 'Copyright in learning materials and posts belongs to the operator or original authors; unauthorized copying is prohibited.'],
      ['Article 6 (Disclaimer)', 'The operator is not liable for service interruptions caused by force majeure.'],
    ],
  },
};

const Footer = () => {
  const { t } = useTranslation();
  const isKorean = useIsKorean();
  const currentYear = new Date().getFullYear();
  const [openPolicy, setOpenPolicy] = useState(null);
  const policy = openPolicy ? POLICIES[openPolicy] : null;

  const openDialog = (key) => (event) => {
    event.preventDefault();
    setOpenPolicy(key);
  };

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#F8F9FA',
        borderTop: '1px solid #E5E5E5',
        py: 3,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              {isKorean
                ? `© ${currentYear} 2026 우수선수 육성인력 교육. 모든 권리 보유.`
                : `© ${currentYear} 2026 Elite Athlete Development Staff Training. All rights reserved.`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('footer.contact')}: 070-737-8600 | {t('footer.address')}: {isKorean ? '서울시 중구 소공로 51' : '51 Sogong-ro, Jung-gu, Seoul'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 3 }}>
            <Link
              component="button"
              type="button"
              onClick={openDialog('privacy')}
              color="text.secondary"
              underline="hover"
              sx={{ fontSize: '0.75rem' }}
            >
              {t('footer.privacyPolicy')}
            </Link>
            <Link
              component="button"
              type="button"
              onClick={openDialog('terms')}
              color="text.secondary"
              underline="hover"
              sx={{ fontSize: '0.75rem' }}
            >
              {t('footer.termsOfService')}
            </Link>
          </Box>
        </Box>
      </Container>

      <Dialog open={Boolean(policy)} onClose={() => setOpenPolicy(null)} maxWidth="sm" fullWidth scroll="paper">
        {policy && (
          <>
            <DialogTitle>{t(policy.titleKey)}</DialogTitle>
            <DialogContent dividers>
              {(isKorean ? policy.ko : policy.en).map(([heading, body]) => (
                <Box key={heading} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>{heading}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{body}</Typography>
                </Box>
              ))}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenPolicy(null)}>{isKorean ? '닫기' : 'Close'}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Footer;
