// www/hand_handler.js - 极速版

// === 全局配置 ===
const PARTICLE_COUNT = 400; // 粒子数量，JS 性能好，可以多一点
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

// 全局状态
let isFist = false; // 当前是否握拳
let targetX = CANVAS_WIDTH / 2; // 粒子聚合的目标点 X
let targetY = CANVAS_HEIGHT / 2; // 粒子聚合的目标点 Y

// === 粒子类定义 ===
class Particle {
    constructor() {
        // 随机初始位置
        this.x = Math.random() * CANVAS_WIDTH;
        this.y = Math.random() * CANVAS_HEIGHT;
        // 速度
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        // 颜色 (H: 0-360, S: 100%, L: 50%)
        this.hue = Math.random() * 60 + 180; // 初始青蓝色系
        this.size = Math.random() * 3 + 1;
    }

    update() {
        // --- 物理引擎核心 ---
        
        if (isFist) {
            // === 握拳模式：极速聚合 ===
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            
            // 强力吸引
            this.vx += dx * 0.08; 
            this.vy += dy * 0.08;
            
            // 强阻尼 (防止在中心无限弹跳)
            this.vx *= 0.85;
            this.vy *= 0.85;

            // 变色：变成火红色/橙色
            this.hue = this.hue * 0.9 + 10 * 0.1; // 渐变到 10 (红色)

        } else {
            // === 张手模式：随机游走 + 鼠标排斥 ===
            
            // 随机扰动
            this.vx += (Math.random() - 0.5) * 0.5;
            this.vy += (Math.random() - 0.5) * 0.5;
            
            // 稍微把它们推离中心 (斥力)
            const dx = this.x - targetX;
            const dy = this.y - targetY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist < 100) {
                this.vx += dx * 0.05;
                this.vy += dy * 0.05;
            }

            // 弱阻尼 (保持漂浮感)
            this.vx *= 0.98;
            this.vy *= 0.98;

            // 变色：回到青蓝色
            this.hue = this.hue * 0.95 + 200 * 0.05; 
        }

        // 更新位置
        this.x += this.vx;
        this.y += this.vy;

        // 边界反弹
        if (this.x < 0 || this.x > CANVAS_WIDTH) this.vx *= -0.9;
        if (this.y < 0 || this.y > CANVAS_HEIGHT) this.vy *= -0.9;
        
        // 简单的边界限制
        if (this.x < 0) this.x = 0;
        if (this.x > CANVAS_WIDTH) this.x = CANVAS_WIDTH;
        if (this.y < 0) this.y = 0;
        if (this.y > CANVAS_HEIGHT) this.y = CANVAS_HEIGHT;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${this.hue}, 100%, 60%)`;
        ctx.fill();
    }
}

// 初始化粒子数组
const particles = [];
for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
}


$(document).ready(function() {
    const videoElement = document.getElementById('my_camera');
    const canvasElement = document.getElementById('output_canvas');
    const canvasCtx = canvasElement.getContext('2d');

    // 设置 Canvas 尺寸
    canvasElement.width = CANVAS_WIDTH;
    canvasElement.height = CANVAS_HEIGHT;

    // === MediaPipe 辅助函数 ===
    function isFingerExtended(landmarks, tipIdx, mcpIdx) {
        const wrist = landmarks[0];
        const tip = landmarks[tipIdx];
        const mcp = landmarks[mcpIdx];
        const tipDist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const mcpDist = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
        return tipDist > (mcpDist * 1.2);
    }

    // === 主循环：这里是 MediaPipe 的回调 ===
    // 注意：MediaPipe 可能会比较慢(20-30fps)，但这不影响我们的动画(60fps)
    function onResults(results) {
        // 我们只在这里更新“状态”，不在这里画图
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];

            // 1. 更新目标点为手掌中心 (点9: 中指根部)
            // MediaPipe 坐标是 0-1，需要乘画布宽高
            targetX = landmarks[9].x * CANVAS_WIDTH;
            targetY = landmarks[9].y * CANVAS_HEIGHT;

            // 2. 判断手势
            let extendedCount = 0;
            if (isFingerExtended(landmarks, 8, 5)) extendedCount++;
            if (isFingerExtended(landmarks, 12, 9)) extendedCount++;
            if (isFingerExtended(landmarks, 16, 13)) extendedCount++;
            if (isFingerExtended(landmarks, 20, 17)) extendedCount++;

            if (extendedCount <= 1) isFist = true;
            else if (extendedCount >= 3) isFist = false;
            
            // 可选：在这里也可以画骨骼，但为了纯粹的粒子效果，我们先不画骨骼
        }
    }

    // === 动画循环 (Game Loop) ===
    // 这个 requestAnimationFrame 保证了尽可能高的帧率 (通常 60FPS)
    function animate() {
        // 1. 清空画布 (半透明清空可以做出拖尾效果！)
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // 0.2 的透明度产生拖尾
        canvasCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 2. 更新并绘制每一个粒子
        for (let p of particles) {
            p.update();
            p.draw(canvasCtx);
        }

        // 循环调用
        requestAnimationFrame(animate);
    }

    // === 启动 MediaPipe ===
    const hands = new Hands({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});
    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    hands.onResults(onResults);

    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 640,
        height: 480
    });
    camera.start();

    // 启动动画循环
    animate();
});