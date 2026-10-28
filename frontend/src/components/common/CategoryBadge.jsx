import React from 'react';
import { Chip } from '@mui/material';
import { categoryColors } from '../../styles/theme';
import { useIsKorean } from '../../utils/language';

// Course/program categories are stored with English keys; show Korean labels.
export const CATEGORY_LABELS_KO = {
  Sports: '스포츠',
  'Strength Training': '근력 훈련',
  Nutrition: '영양',
  'Mental Coaching': '멘탈 코칭',
  Rehabilitation: '재활',
  'Team Building': '팀 빌딩',
  'Technical Skills': '기술 훈련',
  training: '훈련',
};

export const categoryLabel = (category, isKorean) => (
  (isKorean && CATEGORY_LABELS_KO[category]) || category
);

const CategoryBadge = ({ category, size = 'small' }) => {
  const isKorean = useIsKorean();
  const color = categoryColors[category] || '#6B7280';

  return (
    <Chip
      label={categoryLabel(category, isKorean)}
      size={size}
      sx={{
        backgroundColor: color,
        color: '#FFFFFF',
        fontWeight: 500,
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        height: size === 'small' ? 24 : 28,
      }}
    />
  );
};

export default CategoryBadge;
