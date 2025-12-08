// www/hand_handler.js (v2.0 增强版)

$(document).ready(function() {
  const videoElement = document.getElementById('my_camera');
  // 新增：获取用于绘制骨骼和框的 canvas 元素
  const canvasElement = document.getElementById('hand_canvas');
  const canvasCtx = canvasElement.getContext('2d');

  if (!videoElement || !canvasElement) {
    console.error("缺少必要的视频或Canvas元素");
    return;
  }

  let lastState = "open";
  
  // --- 辅助函数：判断单个手指是否伸展 ---
  // 原理：比较指尖(tip)到手腕(0)的距离 vs 指根关节(mcp)到手腕的距离
  // 如果指尖距离明显大于指根距离，认为是伸展的
  function isFingerExtended(landmarks, tipIdx, mcpIdx) {
      const wrist = landmarks[0];
      const tip = landmarks[tipIdx];
      const mcp = landmarks[mcpIdx];
      
      const tipDist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      const mcpDist = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
      
      // 阈值系数 1.2，表示指尖距离要是关节距离的 1.2 倍以上才算伸展
      return tipDist > (mcpDist * 1.2);
  }

  function onResults(results) {
    // 1. 准备绘图：设置 canvas 尺寸并清空上一帧内容
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    // 镜像翻转 canvas，与视频保持一致
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // --- A. 绘制视觉反馈 (骨骼和框) ---
      // 使用 MediaPipe 内置工具绘制连接线和关键点
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS,
                     {color: '#00FF00', lineWidth: 2});
      drawLandmarks(canvasCtx, landmarks,
                    {color: '#FF0000', lineWidth: 1, radius: 3});

      // --- B. 核心算法：计算伸展手指数量 ---
      // 指尖点索引: 食指(8), 中指(12), 无名指(16), 小指(20)
      // 指根点索引: 食指(5), 中指(9),  无名指(13), 小指(17)
      // 拇指判断逻辑较复杂，这里简化，只看这四根手指
      let extendedCount = 0;
      if (isFingerExtended(landmarks, 8, 5)) extendedCount++;
      if (isFingerExtended(landmarks, 12, 9)) extendedCount++;
      if (isFingerExtended(landmarks, 16, 13)) extendedCount++;
      if (isFingerExtended(landmarks, 20, 17)) extendedCount++;
      
      console.log("伸展手指数量:", extendedCount);

      // --- C. 状态判定 ---
      let currentState = lastState; // 默认保持上一个状态
      // 如果伸展手指少于等于 1 个，认为是握拳
      if (extendedCount <= 1) {
        currentState = "fist";
      } 
      // 如果伸展手指大于等于 3 个，认为是张开
      // 留一个中间缓冲区 (2个手指时保持不变)，防止状态频繁跳动
      else if (extendedCount >= 3) {
        currentState = "open";
      }

      // --- D. 发送信号给 R ---
      if (currentState !== lastState) {
        lastState = currentState;
        Shiny.setInputValue("gesture_input", currentState + "_" + Math.random());
      }
    }
    canvasCtx.restore();
  }

  // 初始化 MediaPipe Hands
  const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }});

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.6, //稍微提高置信度阈值
    minTrackingConfidence: 0.6
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
});