import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Toolbar, Dialog, DialogContent, DialogActions,
  Button, Typography, IconButton, Checkbox, FormControlLabel,
} from '@mui/material';
import { Close as CloseIcon, ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useAuth } from '../../contexts/AuthContext';
import { useIsKorean } from '../../utils/language';
import { EditStageToolbar, ResizableFrame, resetStageSizes } from '../admin/EditStageTools';

const DRAWER_WIDTH = 240;

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isKorean = useIsKorean();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editStage, setEditStage] = useState(false);
  const [stageKey, setStageKey] = useState(0);
  const canEditStage = user?.role === 'admin';

  // ─── Popup Banner State (multiple) ──────────────────────────
  const [popupOpen, setPopupOpen] = useState(false);
  const [popups, setPopups] = useState([]);
  const [currentPopupIndex, setCurrentPopupIndex] = useState(0);
  const [dontShowToday, setDontShowToday] = useState(false);

  // ─── Footer Banner State ──────────────────────────────────────
  const [footerBanners, setFooterBanners] = useState([]);
  const [footerActive, setFooterActive] = useState(false);
  const [footerSpeed, setFooterSpeed] = useState(30);

  useEffect(() => {
    // Load popup banners (new multi-format or old single format)
    try {
      let popupData = [];
      const savedMulti = localStorage.getItem('asiangames_popup_banners');
      if (savedMulti) {
        const parsedMulti = JSON.parse(savedMulti);
        popupData = Array.isArray(parsedMulti) ? parsedMulti : [];
      } else {
        const savedSingle = localStorage.getItem('asiangames_popup_banner');
        if (savedSingle) {
          const single = JSON.parse(savedSingle);
          popupData = [{ ...single, id: 1 }];
        }
      }

      // Filter to active popups only
      const activePopups = popupData.filter((p) => p && p.active && (p.title || p.content || p.imageUrl));

      if (activePopups.length > 0) {
        const dismissed = localStorage.getItem('asiangames_popup_dismissed');
        let shouldShow = true;
        if (dismissed) {
          const dismissedDate = new Date(dismissed).toDateString();
          const today = new Date().toDateString();
          if (dismissedDate === today) shouldShow = false;
        }
        if (shouldShow) {
          setPopups(activePopups);
          setCurrentPopupIndex(0);
          setPopupOpen(true);
        }
      }
    } catch { /* ignore */ }

    // Load footer banners
    try {
      const active = localStorage.getItem('asiangames_footer_active');
      setFooterActive(active !== 'false');
      const speed = localStorage.getItem('asiangames_footer_speed');
      setFooterSpeed(parseInt(speed || '30', 10) || 30);
      const saved = localStorage.getItem('asiangames_footer_banners');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFooterBanners(Array.isArray(parsed) ? parsed.filter((b) => b && b.active && b.text) : []);
      } else {
        // Only show footer banners that an admin has actually configured.
        setFooterBanners([]);
      }
    } catch { /* ignore */ }
  }, []);

  const handleClosePopup = () => {
    if (dontShowToday) {
      localStorage.setItem('asiangames_popup_dismissed', new Date().toISOString());
    }
    setPopupOpen(false);
  };

  const handlePopupLink = () => {
    const currentPopup = popups[currentPopupIndex];
    handleClosePopup();
    if (currentPopup?.linkUrl) {
      navigate(currentPopup.linkUrl);
    }
  };

  const handleNextPopup = () => {
    if (currentPopupIndex < popups.length - 1) {
      setCurrentPopupIndex(currentPopupIndex + 1);
    }
  };

  const handlePrevPopup = () => {
    if (currentPopupIndex > 0) {
      setCurrentPopupIndex(currentPopupIndex - 1);
    }
  };

  const currentPopup = popups[currentPopupIndex];
  const bannerText = footerBanners.map((b) => b.text).join('          ');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          // minWidth 0 lets wide tables scroll inside the page instead of
          // stretching the whole layout past the screen on phones.
          minWidth: 0,
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: 0 },
        }}
      >
        <Toolbar />

        <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, backgroundColor: '#F8F9FA' }}>
          {canEditStage && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <EditStageToolbar
                enabled={editStage}
                onToggle={() => setEditStage((value) => !value)}
                onReset={() => {
                  resetStageSizes('webfront');
                  setStageKey((value) => value + 1);
                }}
              />
            </Box>
          )}
          <ResizableFrame
            key={stageKey}
            scope="webfront"
            id="page-content"
            enabled={canEditStage && editStage}
            minHeight={420}
            minWidth={280}
            sx={{ width: '100%' }}
          >
            {children}
          </ResizableFrame>
        </Box>

        <Footer />

        {/* ─── Running Footer Banner ──────────────────────────────── */}
        {footerActive && footerBanners.length > 0 && (
          <Box
            sx={{
              bgcolor: '#0047BA',
              color: '#fff',
              py: 0.75,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              position: 'relative',
              fontSize: '0.8125rem',
              fontWeight: 500,
            }}
          >
            <Box
              sx={{
                display: 'inline-block',
                whiteSpace: 'nowrap',
                animation: `footerMarquee ${footerSpeed}s linear infinite`,
                '@keyframes footerMarquee': {
                  '0%': { transform: 'translateX(100vw)' },
                  '100%': { transform: 'translateX(-100%)' },
                },
              }}
            >
              {bannerText}
            </Box>
          </Box>
        )}
      </Box>

      {/* ─── Popup Banner Dialog (multiple) ────────────────────────── */}
      {currentPopup && (
        <Dialog
          open={popupOpen}
          onClose={handleClosePopup}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            },
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <IconButton
              onClick={handleClosePopup}
              sx={{
                position: 'absolute', top: 8, right: 8, zIndex: 1,
                bgcolor: 'rgba(0,0,0,0.5)', color: '#fff',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                width: 28, height: 28,
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>

            {currentPopup.imageUrl && (
              <Box
                component="img"
                src={currentPopup.imageUrl}
                alt={isKorean ? '배너' : 'Banner'}
                sx={{ width: '100%', height: 180, objectFit: 'cover' }}
              />
            )}

            <DialogContent sx={{ textAlign: 'center', py: 3, px: 3 }}>
              {!currentPopup.imageUrl && (
                <Box sx={{
                  width: 60, height: 60, borderRadius: '50%', bgcolor: '#EBF0FA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  mx: 'auto', mb: 2,
                }}>
                  <Typography sx={{ fontSize: '1.5rem' }}>📢</Typography>
                </Box>
              )}
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                {currentPopup.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {currentPopup.content}
              </Typography>
            </DialogContent>

            <DialogActions sx={{ flexDirection: 'column', px: 3, pb: 2.5, gap: 1.5 }}>
              {/* Navigation arrows for multiple popups */}
              {popups.length > 1 && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, width: '100%' }}>
                  <IconButton size="small" onClick={handlePrevPopup} disabled={currentPopupIndex === 0}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    {currentPopupIndex + 1} / {popups.length}
                  </Typography>
                  <IconButton size="small" onClick={handleNextPopup} disabled={currentPopupIndex >= popups.length - 1}>
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}

              {currentPopup.linkText && currentPopup.linkUrl && (
                <Button variant="contained" fullWidth onClick={handlePopupLink} sx={{ borderRadius: '8px' }}>
                  {currentPopup.linkText}
                </Button>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={dontShowToday}
                      onChange={(e) => setDontShowToday(e.target.checked)}
                    />
                  }
                  label={<Typography variant="caption" color="text.secondary">{isKorean ? '오늘 하루 보지 않기' : "Don't show again today"}</Typography>}
                />
                <Button size="small" onClick={handleClosePopup} sx={{ fontSize: '0.75rem' }}>
                  {isKorean ? '닫기' : 'Close'}
                </Button>
              </Box>
            </DialogActions>
          </Box>
        </Dialog>
      )}
    </Box>
  );
};

export default Layout;
