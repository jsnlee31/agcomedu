import React, { useRef, useState } from 'react';
import { Box, Button, LinearProgress, Typography } from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { uploadsAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const formatSize = (bytes) => {
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${Math.round(bytes / 1024)}KB` : `${mb.toFixed(1)}MB`;
};

// Uploads a file to storage and hands back its public URL.
const FileUploadButton = ({
  accept = 'video/*',
  folder = 'videos',
  label = '파일 업로드',
  maxSizeMB = 500,
  onUploaded,
  size = 'medium',
  disabled = false,
}) => {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const { showSuccess, showError } = useNotification();

  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      showError(`파일은 최대 ${maxSizeMB}MB까지 업로드할 수 있습니다.`);
      return;
    }

    try {
      setProgress(0);
      const url = await uploadsAPI.upload(file, folder, setProgress);
      onUploaded?.(url, { name: file.name, size: formatSize(file.size), type: file.type });
      showSuccess('업로드가 완료되었습니다.');
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message;
      const tooLarge = error.response?.status === 413 || /exceeded the maximum/i.test(message || '');
      showError(tooLarge
        ? '저장소 용량 제한을 초과했습니다. 더 작은 파일을 사용하거나 Supabase 저장소 설정을 확인하세요.'
        : (message || '업로드에 실패했습니다. 다시 시도해 주세요.'));
    } finally {
      setProgress(null);
    }
  };

  const uploading = progress !== null;

  return (
    <Box sx={{ minWidth: 0 }}>
      <input hidden ref={inputRef} type="file" accept={accept} onChange={handleChange} />
      <Button
        variant="outlined"
        size={size}
        startIcon={<UploadIcon />}
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        sx={{ whiteSpace: 'nowrap' }}
      >
        {uploading ? `업로드 중 ${progress}%` : label}
      </Button>
      {uploading && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="caption" color="text.secondary">업로드 중에는 창을 닫지 마세요.</Typography>
        </Box>
      )}
    </Box>
  );
};

export default FileUploadButton;
