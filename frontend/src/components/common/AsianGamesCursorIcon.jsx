import React, { useCallback, useState } from 'react';
import { Box } from '@mui/material';
import {
  DirectionsRun as RunIcon,
  Pool as SwimIcon,
  Public as GlobeIcon,
  SportsBasketball as BallIcon,
  SportsMartialArts as MartialArtsIcon,
  SportsSoccer as SoccerIcon,
} from '@mui/icons-material';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const AsianGamesCursorIcon = ({ compact = false, interactive = true }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handlePointerMove = useCallback((event) => {
    if (!interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
    const y = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
    setPosition({ x, y });
  }, [interactive]);

  const handlePointerLeave = useCallback(() => {
    if (interactive) setPosition({ x: 0, y: 0 });
  }, [interactive]);

  const size = compact ? 42 : 330;
  const x = interactive ? position.x : 0;
  const y = interactive ? position.y : 0;
  const sportIcons = [
    { icon: <SwimIcon />, color: '#0081C8', angle: -28, radius: 0.36 },
    { icon: <BallIcon />, color: '#FCB131', angle: 48, radius: 0.38 },
    { icon: <MartialArtsIcon />, color: '#EE334E', angle: 132, radius: 0.37 },
    { icon: <SoccerIcon />, color: '#00A651', angle: 214, radius: 0.39 },
  ];

  return (
    <Box
      aria-label="Asian Games athlete and globe emblem"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      sx={{
        width: size,
        height: size,
        position: 'relative',
        flex: '0 0 auto',
        touchAction: 'none',
        perspective: compact ? 400 : 1000,
        '@keyframes agGlobeSpin': {
          '0%': { transform: 'translate(-50%, -50%) rotate(0deg)' },
          '100%': { transform: 'translate(-50%, -50%) rotate(360deg)' },
        },
        '@keyframes agOrbitSpin': {
          '0%': { transform: 'translate(-50%, -50%) rotate(0deg)' },
          '100%': { transform: 'translate(-50%, -50%) rotate(-360deg)' },
        },
        '@keyframes agRunPulse': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-4%) scale(1.04)' },
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: compact ? 38 : 250,
          height: compact ? 38 : 250,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.96), rgba(109,205,255,0.72) 32%, rgba(0,58,112,0.84) 68%, rgba(0,24,62,0.94))',
          boxShadow: compact ? '0 6px 18px rgba(0,58,112,0.25)' : '0 34px 90px rgba(0,20,60,0.36)',
          transform: `translate(calc(-50% + ${x * (compact ? 2 : 12)}px), calc(-50% + ${y * (compact ? 2 : 10)}px)) rotateX(${-y * 10}deg) rotateY(${x * 14}deg)`,
          transition: 'transform 140ms ease-out',
          overflow: 'hidden',
          '&:before': {
            content: '""',
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '120%',
            height: '120%',
            borderRadius: '50%',
            background: [
              'linear-gradient(90deg, transparent 0 17%, rgba(255,255,255,0.42) 18% 20%, transparent 21% 38%, rgba(255,255,255,0.38) 39% 41%, transparent 42% 100%)',
              'linear-gradient(0deg, transparent 0 22%, rgba(255,255,255,0.28) 23% 25%, transparent 26% 48%, rgba(255,255,255,0.22) 49% 51%, transparent 52% 100%)',
            ].join(','),
            animation: compact ? 'none' : 'agGlobeSpin 12s linear infinite',
          },
          '&:after': {
            content: '""',
            position: 'absolute',
            inset: compact ? 6 : 34,
            borderRadius: '50%',
            border: `${compact ? 1 : 3}px solid rgba(255,255,255,0.35)`,
            boxShadow: compact ? 'none' : '0 0 0 18px rgba(255,255,255,0.08)',
          },
        }}
      />

      {!compact && (
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 292,
            height: 292,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.42)',
            animation: 'agOrbitSpin 18s linear infinite',
            transformOrigin: 'center',
          }}
        />
      )}

      {sportIcons.map((item, index) => {
        const angle = (item.angle * Math.PI) / 180;
        const radius = item.radius * size;
        const left = 50 + (Math.cos(angle) * radius / size) * 100;
        const top = 50 + (Math.sin(angle) * radius / size) * 100;

        return (
          <Box
            key={item.color}
            sx={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              width: compact ? 12 : 58,
              height: compact ? 12 : 58,
              borderRadius: '50%',
              bgcolor: item.color,
              color: '#fff',
              display: compact ? 'none' : 'grid',
              placeItems: 'center',
              transform: `translate(calc(-50% + ${x * (10 + index * 5)}px), calc(-50% + ${y * (10 + index * 5)}px))`,
              transition: 'transform 130ms ease-out',
              boxShadow: '0 16px 34px rgba(0,0,0,0.22)',
            }}
          >
            {React.cloneElement(item.icon, { sx: { fontSize: 30 } })}
          </Box>
        );
      })}

      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: compact ? 26 : 118,
          height: compact ? 26 : 118,
          borderRadius: compact ? '10px' : '26px',
          bgcolor: '#fff',
          color: '#003A70',
          display: 'grid',
          placeItems: 'center',
          boxShadow: compact ? '0 5px 12px rgba(0,0,0,0.18)' : '0 24px 54px rgba(0,0,0,0.28)',
          transform: `translate(calc(-50% + ${x * (compact ? 4 : 22)}px), calc(-50% + ${y * (compact ? 3 : 18)}px)) rotate(${x * 8}deg)`,
          transition: 'transform 120ms ease-out',
          overflow: 'hidden',
          '&:before': {
            content: '""',
            position: 'absolute',
            inset: compact ? -10 : -42,
            background: 'conic-gradient(from 90deg, #0081C8, #FCB131, #EE334E, #00A651, #0081C8)',
            opacity: 0.18,
            animation: compact ? 'none' : 'agGlobeSpin 9s linear infinite',
          },
        }}
      >
        <RunIcon
          sx={{
            fontSize: compact ? 22 : 74,
            position: 'relative',
            animation: compact ? 'none' : 'agRunPulse 1.5s ease-in-out infinite',
          }}
        />
      </Box>

      {!compact && (
        <Box
          sx={{
            position: 'absolute',
            right: 28,
            bottom: 36,
            color: 'rgba(255,255,255,0.9)',
            transform: `translate(${x * 18}px, ${y * 18}px)`,
            transition: 'transform 80ms linear',
          }}
        >
          <GlobeIcon sx={{ fontSize: 30 }} />
        </Box>
      )}
    </Box>
  );
};

export default AsianGamesCursorIcon;
