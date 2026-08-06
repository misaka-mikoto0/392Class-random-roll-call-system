/**
 * 彩带粒子模块（无依赖）
 * 用法：window.celebrateConfetti({ origin?: {x,y}, count?: number, duration?: number })
 * 在结果揭晓时触发短促的彩带爆发，自动清理 canvas。
 */
(function (global) {
    'use strict';

    const COLORS = [
        '#FFD700', '#FF6B6B', '#FF9F43', '#07C160', '#147BFF',
        '#C0392B', '#9B59B6', '#FFE66D', '#4ECDC4', '#FF6B35'
    ];
    const SHAPES = ['rect', 'circle', 'ribbon'];

    let canvas = null;
    let ctx = null;
    let particles = [];
    let rafId = null;
    let endTime = 0;

    function ensureCanvas() {
        if (canvas && canvas.isConnected) return;
        canvas = document.createElement('canvas');
        canvas.className = 'confetti-canvas';
        canvas.style.cssText = [
            'position:fixed', 'inset:0', 'width:100%', 'height:100%',
            'pointer-events:none', 'z-index:9999'
        ].join(';');
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
    }

    function resize() {
        if (!canvas) return;
        const dpr = global.devicePixelRatio || 1;
        canvas.width = global.innerWidth * dpr;
        canvas.height = global.innerHeight * dpr;
        canvas.style.width = global.innerWidth + 'px';
        canvas.style.height = global.innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    function spawnParticle(originX, originY) {
        const angle = rand(-Math.PI, 0); // 向上爆发
        const speed = rand(8, 18);
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        return {
            x: originX + rand(-30, 30),
            y: originY + rand(-10, 10),
            vx: Math.cos(angle) * speed + rand(-3, 3),
            vy: Math.sin(angle) * speed,
            gravity: rand(0.25, 0.45),
            drag: 0.992,
            size: rand(7, 14),
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            shape: shape,
            rotation: rand(0, Math.PI * 2),
            rotationSpeed: rand(-0.25, 0.25),
            tilt: rand(-0.4, 0.4),
            tiltSpeed: rand(-0.15, 0.15),
            life: 1,
            decay: rand(0.006, 0.012)
        };
    }

    function drawParticle(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.shape === 'ribbon') {
            ctx.scale(1, Math.cos(p.tilt) + 0.001);
            ctx.fillRect(-p.size / 2, -p.size * 0.8, p.size, p.size * 1.6);
        } else {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }

        // 高光
        ctx.globalAlpha = Math.max(0, p.life) * 0.35;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size / 3, p.size / 3);

        ctx.restore();
    }

    function step() {
        if (!ctx) return;
        ctx.clearRect(0, 0, global.innerWidth, global.innerHeight);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.vy += p.gravity;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            p.tilt += p.tiltSpeed;
            p.life -= p.decay;

            if (p.life <= 0 || p.y > global.innerHeight + 60) {
                particles.splice(i, 1);
                continue;
            }
            drawParticle(p);
        }

        if (particles.length > 0 && performance.now() < endTime + 1500) {
            rafId = requestAnimationFrame(step);
        } else {
            cleanup();
        }
    }

    function cleanup() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        particles = [];
        if (canvas) {
            ctx && ctx.clearRect(0, 0, global.innerWidth, global.innerHeight);
            window.removeEventListener('resize', resize);
            canvas.remove();
            canvas = null;
            ctx = null;
        }
    }

    /**
     * 触发彩带爆发
     * @param {Object} [opts]
     * @param {Object} [opts.element] 结果卡片 DOM 元素，粒子从其中心爆发（推荐，自动跟随布局）
     * @param {Object} [opts.origin] 起点比例 {x:0..1, y:0..1}，element 优先级更高；默认 {x:0.5, y:0.62}
     * @param {number} [opts.count] 粒子数，默认 160
     * @param {number} [opts.duration] 持续生成时长 ms，默认 350
     */
    function celebrateConfetti(opts) {
        opts = opts || {};
        ensureCanvas();

        const count = opts.count || 160;
        const duration = opts.duration || 350;

        let ox, oy;
        if (opts.element && typeof opts.element.getBoundingClientRect === 'function') {
            // 以结果卡片元素的中心为爆发原点，跟随实际布局，避免错位
            const rect = opts.element.getBoundingClientRect();
            ox = rect.left + rect.width / 2;
            oy = rect.top + rect.height / 2;
        } else {
            const origin = opts.origin || { x: 0.5, y: 0.62 };
            ox = global.innerWidth * origin.x;
            oy = global.innerHeight * origin.y;
        }

        // 分两批生成，营造连绵感
        const batch1 = Math.floor(count * 0.6);
        const batch2 = count - batch1;

        for (let i = 0; i < batch1; i++) particles.push(spawnParticle(ox, oy));

        setTimeout(() => {
            if (!canvas) return;
            for (let i = 0; i < batch2; i++) particles.push(spawnParticle(ox, oy));
        }, duration / 2);

        endTime = performance.now() + duration;
        if (!rafId) rafId = requestAnimationFrame(step);
    }

    global.celebrateConfetti = celebrateConfetti;
})(window);
