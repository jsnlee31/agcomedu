import React, { useEffect, useRef } from 'react';
import { Box, Button, Chip, Tooltip } from '@mui/material';
import {
  Settings as SettingsIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';

const sizeKey = (scope, id) => `asiangames_stage_size_${scope}_${id}`;

export const EditStageToolbar = ({ enabled, onToggle, onReset }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
    {enabled && <Chip size="small" color="warning" label="화면 편집 중" />}
    <Tooltip title="카드 크기를 드래그로 조절합니다 (PC 화면에만 적용)">
      <Button
        size="small"
        variant={enabled ? 'contained' : 'outlined'}
        color={enabled ? 'warning' : 'primary'}
        startIcon={<SettingsIcon />}
        onClick={onToggle}
      >
        {enabled ? '편집 완료' : '화면 편집'}
      </Button>
    </Tooltip>
    {enabled && (
      <Button size="small" variant="text" startIcon={<ResetIcon />} onClick={onReset}>
        크기 초기화
      </Button>
    )}
  </Box>
);

export const resetStageSizes = (scope) => {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(`asiangames_stage_size_${scope}_`))
    .forEach((key) => localStorage.removeItem(key));
};

const getSavedSize = (scope, id) => {
  try {
    const saved = localStorage.getItem(sizeKey(scope, id));
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveSize = (scope, id, element) => {
  if (!element) return;
  localStorage.setItem(sizeKey(scope, id), JSON.stringify({
    width: Math.round(element.offsetWidth),
    height: Math.round(element.offsetHeight),
  }));
};

export const ResizableFrame = ({
  scope,
  id,
  enabled,
  children,
  minHeight = 120,
  minWidth = 180,
  sx,
}) => {
  const ref = useRef(null);
  const saved = getSavedSize(scope, id);

  useEffect(() => {
    if (!enabled || !ref.current) return undefined;
    const element = ref.current;
    const observer = new ResizeObserver(() => saveSize(scope, id, element));
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, scope, id]);

  return (
    <Box
      ref={ref}
      sx={{
        ...sx,
        // Saved sizes are desktop-only; on phones every frame fills the width.
        width: { xs: '100%', md: saved?.width ? `${saved.width}px` : '100%' },
        height: { xs: 'auto', md: saved?.height ? `${saved.height}px` : 'auto' },
        minWidth: { xs: 0, md: minWidth },
        minHeight,
        maxWidth: '100%',
        resize: enabled ? 'both' : 'none',
        overflow: enabled ? 'auto' : 'visible',
        position: 'relative',
        outline: enabled ? '1px dashed #F59E0B' : 'none',
        outlineOffset: enabled ? 4 : 0,
        borderRadius: 1,
        transition: enabled ? 'none' : 'outline 120ms ease',
        '&:after': enabled ? {
          content: '"드래그"',
          position: 'absolute',
          right: 6,
          bottom: 4,
          fontSize: 10,
          color: '#B45309',
          bgcolor: 'rgba(255,255,255,0.86)',
          px: 0.5,
          borderRadius: 0.5,
          pointerEvents: 'none',
        } : undefined,
      }}
    >
      {children}
    </Box>
  );
};
