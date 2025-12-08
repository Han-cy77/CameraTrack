// www/hand_handler.js - 全屏沉浸版

// === 全局配置 ===
const PARTICLE_COUNT = 600; // 全屏模式下增加粒子数量
// 尺寸不再固定，改为动态获取
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

// 全局状态
let isFist = false; 
let targetX = canvasWidth / 2;
let targetY = canvasHeight / 2;

// === 粒子类定义 ===
class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        // 随机分布在全屏
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.hue = Math.random() * 60 + 180; // 青蓝色系
        this.size = Math.random() * 4 + 1;   // 稍微大一点点
    }

    update() {
        if (isFist) {
            // === 握拳模式 ===
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            
            this.vx += dx * 0.06; // 引力
            this.vy += dy * 0.06;
            this.vx *= 0.88;      // 阻尼
            this.vy *= 0.88;

            // 变色：火红
            this.hue = this.hue * 0.9 + 10 * 0.1; 

        } else {
            // === 张手模式 ===
            this.vx += (Math.random() - 0.5) * 0.8;
            this.vy += (Math.random() - 0.5) * 0.8;
            
            // 斥力：如果你想让粒子避开手，启用下面这段
            const dx = this.x - targetX;
            const dy = this.y - targetY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist < 150) { // 增大斥力范围
                this.vx += dx * 0.03;
                this.vy += dy * 0.03;
            }

            this.vx *= 0.98;
            this.vy *= 0.98;
            
            // 变色：青蓝
            this.hue = this.hue * 0.95 + 200 * 0.05; 
        }

        this.x += this.vx;
        this.y += this.vy;

        // 边界处理：全屏反弹
        if (this.x < 0 || this.x > canvasWidth) this.vx *= -0.9;
        if (this.y < 0 || this.y > canvasHeight) this.vy *= -0.9;
        
        // 简单的防越界
        if (this.x < 0) this.x = 0;
        if (this.x > canvasWidth) this.x = canvasWidth;
        if (this.y < 0) this.y = 0;
        if (this.y > canvasHeight) this.y = canvasHeight;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        // 使用 lighter 混合模式让粒子重叠时发光
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `hsl(${this.hue}, 100%, 60%)`;
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over'; // 恢复默认
    }
}

const particles = [];
// 延迟初始化粒子，确保尺寸已获取
function initParticles() {
    particles.length = 0; // 清空
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }
}

$(document).ready(function() {
    const videoElement = document.getElementById('my_camera');
    const canvasElement = document.getElementById('output_canvas');
    const canvasCtx = canvasElement.getContext('2d');

    // === 关键：处理窗口大小变化 ===
    function resizeCanvas() {
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;
        canvasElement.width = canvasWidth;
        canvasElement.height = canvasHeight;
        initParticles(); // 重新生成粒子以适应新屏幕
    }
    
    // 初始化尺寸
    resizeCanvas();
    // 监听浏览器缩放
    window.addEventListener('resize', resizeCanvas);


    // === MediaPipe 逻辑 ===
    function isFingerExtended(landmarks, tipIdx, mcpIdx) {
        const wrist = landmarks[0];
        const tip = landmarks[tipIdx];
        const mcp = landmarks[mcpIdx];
        const tipDist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const mcpDist = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
        return tipDist > (mcpDist * 1.2);
    }

    function onResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];

            // 坐标映射：MediaPipe(0-1) -> 全屏像素
            // 注意：因为视频被强制拉伸(object-fit: fill)，直接乘宽高即可完美对齐
            targetX = landmarks[9].x * canvasWidth;
            targetY = landmarks[9].y * canvasHeight;

            let extendedCount = 0;
            if (isFingerExtended(landmarks, 8, 5)) extendedCount++;
            if (isFingerExtended(landmarks, 12, 9)) extendedCount++;
            if (isFingerExtended(landmarks, 16, 13)) extendedCount++;
            if (isFingerExtended(landmarks, 20, 17)) extendedCount++;

            if (extendedCount <= 1) isFist = true;
            else if (extendedCount >= 3) isFist = false;
        }
    }

    // === 动画循环 ===
    function animate() {
        // 清空画布 (带拖尾效果)
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.25)'; 
        canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);

        for (let p of particles) {
            p.update();
            p.draw(canvasCtx);
        }
        requestAnimationFrame(animate);
    }

    // === 启动 ===
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
        width: 1280, // 请求更高的摄像头分辨率
        height: 720
    });
    camera.start();

    animate();
});