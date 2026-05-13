import { html, useRef, useEffect } from '../lib/preact.standalone.module.js';

// Translucent ghost stock chart lines drawn on a black canvas.
// Multiple random-walk paths sweep L->R, fade, and respawn. Lines near the
// cursor brighten and pick up a soft glow.

const LINE_COUNT = 3;
// Stock-market binary: bright green = bullish (baseline trends UP), bright red
// = bearish (baseline trends DOWN). Bias = sign of the line's slope.
const PALETTE = [
    { r:  40, g: 255, b: 110, biasSign: -1 }, // bright green, bullish (canvas y- = up)
    { r: 255, g:  55, b:  70, biasSign:  1 }, // bright red, bearish
];
const MOUSE_RADIUS = 220;        // px — within this, lines get brighter
const DRAW_SPEED_MIN = 0.0040;   // fraction of line per frame (at TARGET_FPS)
const DRAW_SPEED_MAX = 0.0090;
const FADE_SPEED = 0.0220;       // fraction per frame after line is fully drawn
const TARGET_FPS = 60;           // smoother motion now that the compositor isn't on fire
const FRAME_MS = 1000 / TARGET_FPS;
const OFFSET_MIN = 30;           // peak-to-peak random offset around baseline
const OFFSET_MAX = 80;
const RECEDE_AMOUNT = 0.15;      // max shrink across full lifetime (1.0 → 0.85)
const VP_Y_FRAC = 0.20;          // vanishing point Y as fraction of canvas height

function makeLine(width, height) {
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const segs = 70 + Math.floor(Math.random() * 30);
    const points = new Array(segs + 1);

    // Baseline is a true straight line from (x0, startY) → (x1, endY).
    // Bias is the slope: bullish lines climb (endY < startY in canvas coords),
    // bearish lines fall. Each sample = baseline + independent random offset
    // (no cumulative drift) so the line stays anchored to its trend.
    // Wide span range = wide slope variety: some lines are nearly flat
    // grinds, others are dramatic moonshots / crashes.
    const span = height * (0.10 + Math.random() * 0.85);
    let startY, endY;
    if (color.biasSign < 0) {
        // bullish: start low (high canvas y), end high (low canvas y)
        startY = height * (0.65 + Math.random() * 0.30);
        endY = startY - span;
    } else {
        // bearish: start high, end low
        startY = height * (0.05 + Math.random() * 0.30);
        endY = startY + span;
    }
    const offsetAmp = OFFSET_MIN + Math.random() * (OFFSET_MAX - OFFSET_MIN);

    for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const x = t * (width * 1.15) - width * 0.075;
        const baseY = startY + (endY - startY) * t;
        const offset = (Math.random() - 0.5) * offsetAmp;
        let y = baseY + offset;
        if (y < height * 0.04) y = height * 0.04 + Math.random() * 12;
        if (y > height * 0.96) y = height * 0.96 - Math.random() * 12;
        points[i] = { x, y };
    }
    const drawSpeed = DRAW_SPEED_MIN + Math.random() * (DRAW_SPEED_MAX - DRAW_SPEED_MIN);
    return {
        points,
        color,
        progress: 0,
        fade: 0,
        baseAlpha: 0.55 + Math.random() * 0.25,
        drawSpeed,
        t: 0,                                   // per-line frame counter for continuous recede
        lifeFrames: (1 / drawSpeed) + (1 / FADE_SPEED),
    };
}

export default function ChartBackground() {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: -9999, y: -9999, active: false });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let cssW = 0, cssH = 0;
        let lines = [];
        let rafId = null;

        const sizeCanvas = () => {
            // Render at CSS pixel resolution (not DPR-backed). A faint moving
            // line on a black background does not benefit from retina sharpness,
            // and going 1x cuts the pixel-fill cost by 4x on a 2x display.
            cssW = window.innerWidth;
            cssH = window.innerHeight;
            canvas.width = cssW;
            canvas.height = cssH;
            canvas.style.width = cssW + 'px';
            canvas.style.height = cssH + 'px';
        };

        const seed = () => {
            lines = [];
            for (let i = 0; i < LINE_COUNT; i++) {
                const l = makeLine(cssW, cssH);
                // stagger initial progress so they don't all start drawing together
                l.progress = Math.random();
                lines.push(l);
            }
        };

        const drawLine = (line) => {
            const { points, color, progress, baseAlpha, fade, t, lifeFrames } = line;
            const visibleAlpha = baseAlpha * (1 - fade);
            if (visibleAlpha <= 0.001) return;

            const visibleCount = Math.floor(points.length * progress);
            if (visibleCount < 2) return;

            // Recede driven by per-line frame counter so the rate is identical
            // across the draw-in and fade-out phases (no speed jump, no pause).
            const lifeT = Math.min(1, t / lifeFrames);
            const scale = 1 - lifeT * RECEDE_AMOUNT;
            const vpX = cssW * 0.5;
            const vpY = cssH * VP_Y_FRAC;
            const sx = (x) => vpX + (x - vpX) * scale;
            const sy = (y) => vpY + (y - vpY) * scale;

            // Cheap mouse-proximity boost: nearest scaled point distance.
            let boost = 0;
            if (mouseRef.current.active) {
                const mx = mouseRef.current.x;
                const my = mouseRef.current.y;
                let minSq = Infinity;
                for (let i = 0; i < visibleCount; i++) {
                    const dx = sx(points[i].x) - mx;
                    const dy = sy(points[i].y) - my;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < minSq) minSq = d2;
                }
                const dist = Math.sqrt(minSq);
                if (dist < MOUSE_RADIUS) {
                    boost = (1 - dist / MOUSE_RADIUS) * 0.55;
                }
            }

            const { r, g, b } = color;
            const alpha = Math.min(1, visibleAlpha + boost);

            // Build the path once and stroke it three times at decreasing
            // width + increasing alpha — a stacked-stroke "glow" that costs a
            // fraction of shadowBlur. Halo (wide, low alpha) + mid + bright
            // core stack additively into a saturated neon line.
            ctx.beginPath();
            ctx.moveTo(sx(points[0].x), sy(points[0].y));
            for (let i = 1; i < visibleCount; i++) {
                ctx.lineTo(sx(points[i].x), sy(points[i].y));
            }
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Halo
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.18})`;
            ctx.lineWidth = 5.5 + boost * 4.5;
            ctx.stroke();

            // Mid
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.42})`;
            ctx.lineWidth = 2.6 + boost * 2.2;
            ctx.stroke();

            // Bright core
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.lineWidth = 0.9 + boost * 0.9;
            ctx.stroke();
        };

        let resizePending = false;
        let lastFrameTime = 0;
        const tick = (now) => {
            rafId = requestAnimationFrame(tick);
            // Frame-rate gate: skip draw if we're ahead of TARGET_FPS. rAF still
            // runs at the display rate, but our work runs at most TARGET_FPS,
            // freeing CPU for the rest of the menu.
            if (now - lastFrameTime < FRAME_MS) return;
            lastFrameTime = now;

            if (resizePending) {
                sizeCanvas();
                resizePending = false;
            }
            ctx.clearRect(0, 0, cssW, cssH);
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                line.t++;
                if (line.progress < 1) {
                    line.progress = Math.min(1, line.progress + line.drawSpeed);
                } else {
                    line.fade = Math.min(1, line.fade + FADE_SPEED);
                }
                drawLine(line);
                if (line.fade >= 1) {
                    lines[i] = makeLine(cssW, cssH);
                }
            }
        };

        const onMouse = (e) => {
            mouseRef.current.x = e.clientX;
            mouseRef.current.y = e.clientY;
            mouseRef.current.active = true;
        };
        const onMouseLeave = () => { mouseRef.current.active = false; };
        const onResize = () => { resizePending = true; };
        const onVisibility = () => {
            if (document.hidden) {
                if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            } else if (!rafId) {
                tick(performance.now());
            }
        };

        sizeCanvas();
        seed();
        window.addEventListener('mousemove', onMouse, { passive: true });
        window.addEventListener('mouseleave', onMouseLeave);
        window.addEventListener('resize', onResize);
        document.addEventListener('visibilitychange', onVisibility);
        tick();

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener('mousemove', onMouse);
            window.removeEventListener('mouseleave', onMouseLeave);
            window.removeEventListener('resize', onResize);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    return html`
        <div class="chart-bg-wrap">
            <canvas ref=${canvasRef} class="chart-bg-canvas"></canvas>
        </div>
    `;
}
