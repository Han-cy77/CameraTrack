library(shiny)
library(shinyjs)

ui <- fluidPage(
  useShinyjs(),
  tags$head(
    # 引入 MediaPipe
    tags$script(src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js", crossorigin="anonymous"),
    tags$script(src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js", crossorigin="anonymous"),
    tags$script(src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js", crossorigin="anonymous"),
    tags$script(src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js", crossorigin="anonymous"),
    tags$script(src="hand_handler.js"),
    
    tags$style(HTML("
      /* 1. 移除页面边距，隐藏滚动条，黑色背景 */
      body { 
        background-color: #000; 
        margin: 0; 
        padding: 0; 
        overflow: hidden; 
      }
      
      /* 2. 主容器铺满全屏 */
      #main_container {
        position: relative;
        width: 100vw;
        height: 100vh;
      }
      
      /* 3. 视频层 (背景) */
      #my_camera {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        /* 强制拉伸填满屏幕，确保手势坐标和全屏画布对齐 */
        object-fit: fill; 
        transform: scaleX(-1); /* 镜像 */
        opacity: 0.2; /* 只有一点点淡淡的影子，突出粒子 */
        z-index: 1;
      }
      
      /* 4. 绘图层 (前景) */
      #output_canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2;
        transform: scaleX(-1); /* 画布也要镜像 */
      }
    "))
  ),
  
  div(id="main_container",
      # 只有视频和画布，没有任何文字
      tags$video(id = "my_camera", autoplay = TRUE, muted = TRUE),
      tags$canvas(id = "output_canvas")
  )
)

server <- function(input, output, session) {
  # 空空如也，R 只负责提供这个空页面
}

shinyApp(ui, server)