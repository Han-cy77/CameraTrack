🖐️ R-Shiny AR 手势控制粒子系统 (Hand Gesture Particle AR)
一个基于 R Shiny 和 Google MediaPipe 的沉浸式增强现实 (AR) 实验。通过摄像头捕捉手势，实时控制全屏粒子物理系统。

✨ 项目亮点
零延迟物理引擎：采用 客户端渲染 (Client-side Rendering) 架构。虽然由 R 启动，但粒子计算和渲染完全由前端 JavaScript (Canvas API) 接管，实现 60 FPS 丝滑体验。

实时 AI 识别：集成 Google MediaPipe Hands，直接在浏览器端进行骨骼识别，无需后端传输视频流。

沉浸式交互：

✋ 张开手 (Open)：粒子呈青蓝色，随机漂浮并产生斥力（星云扩散）。

✊ 握紧拳 (Fist)：粒子变色为火红，并被强力吸附至手心（能量聚合）。

全屏自适应：自动适配浏览器窗口大小，移除所有 UI 干扰，提供纯净的数字艺术体验。

🛠️ 技术栈
Backend (宿主): R, Shiny, Shinyjs

Frontend (视觉与逻辑): JavaScript (ES6), HTML5 Canvas

AI Model: MediaPipe Hands (via JS CDN)
