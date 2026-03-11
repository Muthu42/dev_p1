
import React, { useRef, useEffect, useState, useCallback } from 'react';

interface ScratchCardProps {
  onComplete: () => void;
  onScratch?: (x: number, y: number) => void;
  children: React.ReactNode;
  label?: string;
}

const ScratchCard: React.FC<ScratchCardProps> = ({ onComplete, onScratch, children, label = 'SCRATCH TO REVEAL' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const [isDone, setIsDone] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Use ResizeObserver to ensure the canvas matches container size perfectly
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y + size / 4);
    ctx.quadraticCurveTo(x, y, x + size / 4, y);
    ctx.quadraticCurveTo(x + size / 2, y, x + size / 2, y + size / 4);
    ctx.quadraticCurveTo(x + size / 2, y, x + size * 3/4, y);
    ctx.quadraticCurveTo(x + size, y, x + size, y + size / 4);
    ctx.quadraticCurveTo(x + size, y + size / 2, x + size / 2, y + size * 3/4);
    ctx.quadraticCurveTo(x, y + size / 2, x, y + size / 4);
    ctx.fill();
  };

  const drawFoil = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(dpr, dpr);

    // Liquid Love Aesthetic: Radiant Rose to Peach Gradient
    const gradient = ctx.createRadialGradient(
      dimensions.width / 2, dimensions.height / 2, 0,
      dimensions.width / 2, dimensions.height / 2, dimensions.width
    );
    gradient.addColorStop(0, '#ff4d6d'); // Bright Petal Pink
    gradient.addColorStop(0.3, '#ff758f'); // Rose Pink
    gradient.addColorStop(0.6, '#ff8fa3'); // Blushing Pink
    gradient.addColorStop(0.8, '#ffb3c1'); // Soft Pearl
    gradient.addColorStop(1, '#ffccd5'); // Light Peach

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Pattern: Scattered Tiny Hearts
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 40; i++) {
      const hx = Math.random() * dimensions.width;
      const hy = Math.random() * dimensions.height;
      const hSize = 10 + Math.random() * 20;
      drawHeart(ctx, hx, hy, hSize);
    }

    // Metallic Shimmer Texture
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * dimensions.width, 0);
      ctx.lineTo(Math.random() * dimensions.width + (Math.random() - 0.5) * 150, dimensions.height);
      ctx.stroke();
    }

    // Sparkling Dust
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 1800; i++) {
      ctx.fillRect(Math.random() * dimensions.width, Math.random() * dimensions.height, 1, 1);
    }

    // Glowing Typography - Pure White with Soft Shadow
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const mainSize = Math.max(22, dimensions.width / 12);
    const subSize = Math.max(14, dimensions.width / 24);
    
    ctx.shadowColor = 'rgba(196, 30, 58, 0.4)'; // Ruby shadow
    ctx.shadowBlur = 15;
    
    ctx.font = `900 ${mainSize}px "Playfair Display"`;
    ctx.fillText(label, dimensions.width / 2, dimensions.height / 2 - 10);
    
    ctx.shadowBlur = 0;
    ctx.font = `600 ${subSize}px "Dancing Script"`;
    ctx.fillText('A gift from the heart...', dimensions.width / 2, dimensions.height / 2 + (mainSize * 0.9));
  }, [dimensions, label]);

  useEffect(() => {
    if (!isDone) drawFoil();
  }, [drawFoil, isDone]);

  const scratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isDone) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    
    // Smooth, large brush for satisfying reveal
    const brushSize = Math.max(70, dimensions.width / 5.5);
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();

    if (onScratch && Math.random() > 0.75) {
      onScratch(clientX, clientY);
    }

    checkProgress(ctx, canvas);
  };

  const checkProgress = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparent = 0;

    for (let i = 3; i < pixels.length; i += 64) {
      if (pixels[i] === 0) transparent++;
    }

    const ratio = transparent / (pixels.length / 64);
    if (ratio > 0.35 && !isDone) {
      setIsDone(true);
      canvas.style.opacity = '0';
      canvas.style.filter = 'blur(20px) scale(1.1)';
      canvas.style.transition = 'opacity 1.8s ease, filter 1.8s ease, transform 1.8s ease';
      setTimeout(onComplete, 1600);
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawingRef.current = true;
    const pos = 'touches' in e ? e.touches[0] : e;
    scratch(pos.clientX, pos.clientY);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    if ('touches' in e) e.preventDefault();
    const pos = 'touches' in e ? e.touches[0] : e;
    scratch(pos.clientX, pos.clientY);
  };

  const handleEnd = () => {
    isDrawingRef.current = false;
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full aspect-square md:aspect-video rounded-[3rem] md:rounded-[5rem] overflow-hidden shadow-[0_80px_160px_rgba(255,77,109,0.25)] border-4 border-white/50 bg-white"
    >
      <div className="absolute inset-0 z-0">{children}</div>
      {!isDone && (
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="absolute inset-0 z-20 cursor-crosshair touch-none select-none"
        />
      )}
    </div>
  );
};

export default ScratchCard;
