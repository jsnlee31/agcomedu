import { useTranslation } from 'react-i18next';

export const useIsKorean = () => {
  const { i18n } = useTranslation();
  return (i18n.language || localStorage.getItem('language') || 'ko').startsWith('ko');
};

export const useText = (ko, en) => {
  const isKorean = useIsKorean();
  return isKorean ? ko : en;
};
