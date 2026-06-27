import { useRef, useEffect } from "react";

export default function MemoryGalaxyStarMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    let particles: {x: number, y: number, vx: number, vy: number, radius: number, color: string, label: string}[] = [];
    const colors = ['#8b5cf6', '#3b82f6', '#ec4899', '#10b981'];

    fetch('http://localhost:3000/api/memory/nodes')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.nodes) {
          particles = data.nodes.map((node: any) => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1,
            color: colors[node.group % colors.length],
            label: node.label
          }));
        }
      });

    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 - dist / 1200})`;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;

        // Optionally draw some text labels for larger nodes
        if (p.radius > 2.5) {
          ctx.font = '8px monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillText(p.label, p.x + 6, p.y + 3);
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-black/40">
      <canvas ref={canvasRef} className="w-full h-full absolute inset-0" />
      <div className="absolute bottom-4 right-4 bg-black/60 border border-white/10 rounded-lg p-3 backdrop-blur-md">
        <h3 className="text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">Semantic Clusters</h3>
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center text-xs text-white/60"><div className="w-2 h-2 rounded-full bg-[#8b5cf6] mr-2"></div> OS Core Config</div>
          <div className="flex items-center text-xs text-white/60"><div className="w-2 h-2 rounded-full bg-[#3b82f6] mr-2"></div> User Preferences</div>
          <div className="flex items-center text-xs text-white/60"><div className="w-2 h-2 rounded-full bg-[#ec4899] mr-2"></div> Subagent Memory</div>
        </div>
      </div>
    </div>
  );
}
