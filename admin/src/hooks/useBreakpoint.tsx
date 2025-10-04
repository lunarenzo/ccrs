import { useState, useEffect } from 'react';

interface BreakpointState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLarge: boolean;
  currentBreakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

export function useBreakpoint(): BreakpointState {
  const [breakpoint, setBreakpoint] = useState<BreakpointState>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
    return getBreakpointState(width);
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setBreakpoint(getBreakpointState(width));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

function getBreakpointState(width: number): BreakpointState {
  // Bootstrap 5 breakpoints
  const breakpoints = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400,
  };

  let currentBreakpoint: BreakpointState['currentBreakpoint'] = 'xs';
  
  if (width >= breakpoints.xxl) currentBreakpoint = 'xxl';
  else if (width >= breakpoints.xl) currentBreakpoint = 'xl';
  else if (width >= breakpoints.lg) currentBreakpoint = 'lg';
  else if (width >= breakpoints.md) currentBreakpoint = 'md';
  else if (width >= breakpoints.sm) currentBreakpoint = 'sm';

  return {
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg,
    isLarge: width >= breakpoints.xl,
    currentBreakpoint,
  };
}
