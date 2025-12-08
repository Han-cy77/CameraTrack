library(shiny)
library(shinyjs)
library(ggplot2)

# --- 性能优化配置 ---
NUM_PARTICLES <- 180    # 稍微减少粒子数以换取流畅度
CANVAS_SIZE <- 10 
REFRESH_RATE <- 30      # 30ms 刷新一次 (约 33 FPS)

# 使用矩阵代替 data.frame (计算速度快10倍)
init_particles_matrix <- function() {
  m <- matrix(0, nrow = NUM_PARTICLES, ncol = 4)
  colnames(m) <- c("x", "y", "vx", "vy")
  m[, "x"] <- runif(NUM_PARTICLES, -CANVAS_SIZE, CANVAS_SIZE)
  m[, "y"] <- runif(NUM_PARTICLES, -CANVAS_SIZE, CANVAS_SIZE)
  # 初始给一点速度
  m[, "vx"] <- runif(NUM_PARTICLES, -0.5, 0.5)
  m[, "vy"] <- runif(NUM_PARTICLES, -0.5, 0.5)
  return(m)
}

ui <- fluidPage(
  useShinyjs(),
  tags$head(
    tags$script(src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js", crossorigin="anonymous"),
    tags$script(src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js", crossorigin="anonymous"),
    tags$script(src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js", crossorigin="anonymous"),
    tags$script(src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js", crossorigin="anonymous"),
    tags$script(src="hand_handler.js"),
    
    tags$style(HTML("
      body { background-color: #111; margin: 0; padding: 0; overflow: hidden; }
      .main-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
      }
      .ar-container {
        position: relative;
        width: 640px;
        height: 480px;
        border: 2px solid #333;
        border-radius: 8px;
        background-color: black;
        box-shadow: 0 0 50px rgba(0, 255, 255, 0.1);
      }
      .overlay-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
      #my_camera { z-index: 1; object-fit: cover; transform: scaleX(-1); }
      #hand_canvas { z-index: 2; pointer-events: none; }
      .particle-wrapper { z-index: 3; pointer-events: none; }
      h2, h4 { color: white; text-shadow: 0 0 10px rgba(255,255,255,0.5); margin: 10px; }
    "))
  ),
  
  div(class="main-container",
      h2("R + AR 极速版 (Speed Tuned)"),
      h4(textOutput("status_label")),
      
      div(class = "ar-container",
          tags$video(id = "my_camera", class="overlay-layer", autoplay = TRUE, muted = TRUE),
          tags$canvas(id = "hand_canvas", class="overlay-layer"),
          div(class = "overlay-layer particle-wrapper",
              plotOutput("particlePlot", width = "100%", height = "100%")
          )
      )
  )
)

server <- function(input, output, session) {
  
  # 使用 reactiveValues 存储矩阵
  vals <- reactiveValues(
    mat = init_particles_matrix(),
    gesture = "open"
  )
  
  observeEvent(input$gesture_input, {
    # 快速解析
    vals$gesture <- sub("_.*", "", input$gesture_input)
  })
  
  output$status_label <- renderText({
    if (vals$gesture == "fist") "⚡ 极速聚合 (FIST)" else "💥 瞬间爆发 (OPEN)"
  })
  
  # --- 物理引擎 (高频循环) ---
  observe({
    invalidateLater(REFRESH_RATE, session)
    
    # 提取矩阵 (比 data.frame 快)
    m <- isolate(vals$mat)
    mode <- isolate(vals$gesture)
    
    # === 调优核心：物理参数 ===
    # 1. 阻尼 (Friction): 0.9 (越小越粘滞，越大越滑，0.6会急停)
    # 2. 强力 (Force): 数字越大，加速度越快
    
    if (mode == "fist") {
      # === 握拳模式 ===
      friction <- 0.7  # 较大的阻尼，防止粒子在中心无限震荡
      attraction <- 0.6 # 【极强】的引力 (之前是 0.12)
      
      # 向量化计算：所有粒子同时计算
      # 新速度 = 旧速度 * 阻尼 + (目标距离 * 引力系数)
      m[, "vx"] <- m[, "vx"] * friction + (0 - m[, "x"]) * attraction
      m[, "vy"] <- m[, "vy"] * friction + (0 - m[, "y"]) * attraction
      
    } else {
      # === 张手模式 ===
      friction <- 0.95 # 极小的阻尼，让粒子飞得更远
      repulsion <- 2.0 # 【极强】的随机爆发力 (之前是 0.2)
      center_push <- 0.4 # 从中心向外的持续推力
      
      # 生成随机推力
      noise_x <- runif(NUM_PARTICLES, -repulsion, repulsion)
      noise_y <- runif(NUM_PARTICLES, -repulsion, repulsion)
      
      # 如果粒子在中心附近，给它一个猛推
      push_x <- sign(m[, "x"]) * center_push
      push_y <- sign(m[, "y"]) * center_push
      
      m[, "vx"] <- m[, "vx"] * friction + noise_x + push_x
      m[, "vy"] <- m[, "vy"] * friction + noise_y + push_y
    }
    
    # 更新位置
    m[, "x"] <- m[, "x"] + m[, "vx"]
    m[, "y"] <- m[, "y"] + m[, "vy"]
    
    # 边界强力反弹 (增加反弹速度，看起来更有活力)
    mask_x <- abs(m[, "x"]) > CANVAS_SIZE
    mask_y <- abs(m[, "y"]) > CANVAS_SIZE
    
    # 反弹时稍微保留一点能量 (-0.8 而不是 -1)
    m[mask_x, "vx"] <- -m[mask_x, "vx"] * 0.8
    m[mask_y, "vy"] <- -m[mask_y, "vy"] * 0.8
    
    # 防止粒子跑出画布太远回不来
    m[mask_x, "x"] <- sign(m[mask_x, "x"]) * CANVAS_SIZE
    m[mask_y, "y"] <- sign(m[mask_y, "y"]) * CANVAS_SIZE
    
    vals$mat <- m
  })
  
  output$particlePlot <- renderPlot({
    # 将矩阵转回 data.frame 供 ggplot 使用 (这一步很快)
    df <- as.data.frame(vals$mat)
    mode <- vals$gesture
    
    # 颜色策略：握拳用红/黄，张手用青/白
    main_color <- if (mode == "fist") "#FF4500" else "#00FFFF"
    
    ggplot(df, aes(x = x, y = y)) +
      # 只画一层点，减少绘图开销
      geom_point(color = main_color, size = 5, alpha = 0.6) + 
      # 加一个高亮核心点，增加科技感
      geom_point(color = "white", size = 2) +
      xlim(-CANVAS_SIZE, CANVAS_SIZE) +
      ylim(-CANVAS_SIZE, CANVAS_SIZE) +
      theme_void() + 
      theme(
        panel.background = element_rect(fill = "transparent", color = NA),
        plot.background = element_rect(fill = "transparent", color = NA),
        # 移除图例和边距，最大化绘图区域
        legend.position = "none",
        plot.margin = margin(0,0,0,0)
      )
  }, bg="transparent")
}

shinyApp(ui, server)