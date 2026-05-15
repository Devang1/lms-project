"use client";

import { useEffect, useRef, useState } from "react";

export function SecureCanvasText({
  text,
  seed,
  className
}: {
  text: string;
  seed: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let raf = 0;
    let resizeObserver: ResizeObserver | null = null;

    const render = () => {
      const container = canvas.parentElement;
      if (!container) return;

      // Get actual container width
      const containerWidth = container.clientWidth;
      if (containerWidth === 0) return;

      // Responsive font size based on container width
      let fontSize = 16;
      let lineHeight = 26;
      let leftPadding = 12;
      
      if (containerWidth < 480) {
        fontSize = 14;
        lineHeight = 24;
        leftPadding = 15;
      } else if (containerWidth < 640) {
        fontSize = 15;
        lineHeight = 25;
        leftPadding = 15;
      } else if (containerWidth < 768) {
        fontSize = 16;
        lineHeight = 26;
        leftPadding = 12;
      } else {
        fontSize = 17;
        lineHeight = 28;
        leftPadding = 14;
      }

      // Set font and measure text
      const fontString = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, system-ui, sans-serif`;
      context.font = fontString;
      
      // Word wrap calculation
      const words = text.split(" ");
      const lines: string[] = [];
      let line = "";
      const maxWidth = containerWidth - (leftPadding * 2);

      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const metrics = context.measureText(testLine);
        
        if (metrics.width > maxWidth && line.length > 0) {
          lines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) lines.push(line);

      // Calculate canvas height
      const topPadding = 16;
      const bottomPadding = 16;
      const minHeight = 80;
      const canvasHeight = Math.max(minHeight, lines.length * lineHeight + topPadding + bottomPadding);
      
      // Get device pixel ratio
      const ratio = window.devicePixelRatio || 1;
      
      // Set canvas dimensions
      canvas.width = containerWidth * ratio;
      canvas.height = canvasHeight * ratio;
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      
      // Scale context
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(ratio, ratio);
      
      // Clear canvas
      context.clearRect(0, 0, containerWidth, canvasHeight);

      // Draw subtle background
      const gradient = context.createLinearGradient(0, 0, containerWidth, canvasHeight);
      gradient.addColorStop(0, "rgba(15, 23, 42, 0.02)");
      gradient.addColorStop(1, "rgba(20, 184, 166, 0.04)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, containerWidth, canvasHeight);

      // Background noise (reduced for mobile)
      const dotCount = containerWidth < 640 ? 30 : 50;
      for (let index = 0; index < dotCount; index += 1) {
        const x = (index * 47 + seed * 13) % containerWidth;
        const y = (index * 29 + seed * 7) % canvasHeight;
        const opacity = 0.02 + ((index + seed) % 4) * 0.008;
        context.fillStyle = `rgba(30, 41, 59, ${opacity})`;
        context.fillRect(x, y, 1, 1);
      }

      // Reset font for text
      context.font = fontString;
      context.textBaseline = "top";
      context.textRendering = "geometricPrecision";

      // Draw text lines
      const startY = topPadding;
      
      lines.forEach((currentLine, lineIndex) => {
        const y = startY + lineIndex * lineHeight + Math.sin((frame + lineIndex * 8) / 24) * 0.3;
        let x = leftPadding;
        
        // Draw each character for anti-screenshot effect
        for (let charIndex = 0; charIndex < currentLine.length; charIndex++) {
          const char = currentLine[charIndex];
          const shimmer = Math.sin((frame + charIndex * 3 + seed) / 30) * 0.05;
          context.fillStyle = `rgba(15, 23, 42, ${0.85 + shimmer})`;
          
          // Subtle vertical offset
          const verticalOffset = ((seed + charIndex) % 3) - 1;
          const charY = y + (verticalOffset * 0.2);
          
          context.fillText(char, x, charY);
          
          // Advance X position
          const charWidth = context.measureText(char).width;
          const spacing = 0.3 + ((seed + charIndex + lineIndex) % 4) * 0.08;
          x += charWidth + spacing;
        }
      });

      frame += 1;
      raf = window.requestAnimationFrame(render);
    };

    // Initial render
    render();

    // Handle resize
    const handleResize = () => {
      render();
    };

    // Use ResizeObserver for container changes
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        render();
      });
      if (canvas.parentElement) {
        resizeObserver.observe(canvas.parentElement);
      }
    }

    window.addEventListener("resize", handleResize);
    
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [seed, text]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Secure rendered question"
      className={className}
      role="img"
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        borderRadius: "0.5rem",
        maxWidth: "100%"
      }}
    />
  );
}