import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useAnimationFrame } from 'framer-motion';

export function LiquidyGradient() {
  // Motion values for raw mouse position targets
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for parallax.
  const springConfig = { damping: 45, stiffness: 40, mass: 1 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Final transformed values applied directly to the DOM
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);
  const scale = useMotionValue(1.1); // Base scale 1.1 for plenty of bleed room

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 768) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(nx * -30); 
      mouseY.set(ny * -20);
    };
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mediaQuery.matches) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  useAnimationFrame((time) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const isMobile = window.innerWidth < 768;
    const t = time / 1000; 
    
    const idleX = Math.sin(t * 0.4) * (isMobile ? 5 : 12); 
    const idleY = Math.cos(t * 0.3) * (isMobile ? 4 : 10); 
    const idleRotate = Math.sin(t * 0.2) * (isMobile ? 0.2 : 0.4); 
    const idleScale = (isMobile ? 1.05 : 1.1) + Math.sin(t * 0.5) * (isMobile ? 0.002 : 0.005); 

    const px = smoothX.get();
    const py = smoothY.get();

    x.set(idleX + px);
    y.set(idleY + py);
    rotate.set(idleRotate);
    scale.set(idleScale);
  });

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden
    >
      {/* Ambient Red Glow behind the ribbon */}
      <div 
        className="absolute inset-0 w-full h-full opacity-60 dark:opacity-30"
        style={{
          background: 'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(220, 20, 45, 0.25), rgba(220, 20, 45, 0) 70%)'
        }}
      />

      {/* 
        The Ribbon Image
        Animated smoothly via framer-motion values outside the React render cycle.
      */}
      <motion.div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat mix-blend-multiply dark:mix-blend-screen opacity-100 dark:opacity-90 origin-center"
        style={{
          backgroundImage: 'url("/images/hero-ribbon-bg.png")',
          filter: 'contrast(1.15) brightness(1.1) blur(4px)',
          x,
          y,
          rotate,
          scale,
        }}
      />

      {/* 
        Grain Layer 
        Using mix-blend-overlay ensures the grain only affects the colored ribbon,
        leaving the pure white background completely clean.
      */}
      <div 
        className="absolute inset-0 opacity-[0.5] mix-blend-overlay pointer-events-none" 
        style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
          backgroundRepeat: 'repeat'
        }}
      />

      {/* ======================================================================
          SEAMLESS NEXT-SECTION TRANSITION
          ====================================================================== */}
      
      {/* 1. Progressive Blur: Smoothly blurs the ribbon as it approaches the bottom edge */}
      <div 
        className="absolute bottom-0 left-0 w-full h-[280px] pointer-events-none z-10"
        style={{
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          // Fade the blur effect in from top to bottom
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 70%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 70%, black 100%)',
        }}
        aria-hidden
      />

      {/* 2. Atmospheric Red Bleed: Ambient light spreading down from the blurred ribbon */}
      <div 
        className="absolute bottom-0 left-0 w-full h-[250px] bg-gradient-to-t from-[rgba(220,20,45,0.12)] to-[rgba(220,20,45,0)] pointer-events-none z-10"
        aria-hidden
      />

      {/* 3. Pure White / Dark Slate Fade: Seamlessly blends the entire composition into the exact background color of the next section */}
      <div 
        className="absolute bottom-0 left-0 w-full h-[150px] bg-gradient-to-t from-white via-white/80 to-white/0 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-900/0 pointer-events-none z-20"
        aria-hidden
      />
    </div>
  );
}
