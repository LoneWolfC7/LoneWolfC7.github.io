(() => {
  const canvas = document.getElementById("universe");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0;
  let height = 0;
  let stars = [];
  let animationId = null;

  const getStarCount = () => Math.min(240, Math.floor((window.innerWidth * window.innerHeight) / 8000));

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initStars();
  };

  const initStars = () => {
    const count = getStarCount();
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.6 + 0.2,
      vx: (Math.random() - 0.5) * 0.05,
      vy: (Math.random() - 0.5) * 0.05,
      tw: (Math.random() - 0.5) * 0.01
    }));
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);

    for (const s of stars) {
      s.x += s.vx;
      s.y += s.vy;
      s.a += s.tw;

      if (s.x < 0) s.x = width;
      if (s.x > width) s.x = 0;
      if (s.y < 0) s.y = height;
      if (s.y > height) s.y = 0;
      if (s.a < 0.15 || s.a > 0.9) s.tw *= -1;

      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  };

  const loop = () => {
    draw();
    animationId = requestAnimationFrame(loop);
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });

  if (prefersReducedMotion) {
    draw();
  } else {
    loop();
  }

  document.addEventListener("pjax:send", () => {
    if (animationId) cancelAnimationFrame(animationId);
  });

  document.addEventListener("pjax:complete", () => {
    resize();
    if (!prefersReducedMotion) loop();
  });
})();
