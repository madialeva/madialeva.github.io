(function () {
  'use strict';
  const canvas = document.getElementById('starfield');
  const ctx    = canvas.getContext('2d');
  const NUM   = 200;   
  const MAX_Z = 600;   
  const SPEED = 0.5;   
  let W, H, cx, cy;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    cx = W / 2;
    cy = H / 2;
  }
  function project(x, y, z) {
    return {
      sx: (x / z) * W + cx,
      sy: (y / z) * H + cy,
    };
  }
  function newStar() {
    const z = Math.random() * MAX_Z + 1;
    return {
      x: (Math.random() - 0.5) * z,
      y: (Math.random() - 0.5) * z,
      z,
    };
  }
  const stars = Array.from({ length: NUM }, () => newStar());
  function frame() {
    ctx.shadowBlur = 0;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.z -= SPEED;
      if (s.z <= 1) {
        stars[i] = newStar();
        continue;
      }
      const { sx, sy } = project(s.x, s.y, s.z);
      if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) {
        stars[i] = newStar();
        continue;
      }
      const t      = 1 - s.z / MAX_Z;
      const alpha  = Math.min(1, t * 2);
      const radius = Math.max(0.3, t * t * 2.5);
      const glow   = t * t * 18;
      ctx.shadowBlur  = glow;
      ctx.shadowColor = `rgba(180, 220, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230, 245, 255, ${alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize', resize);
  resize();
  frame();
}());