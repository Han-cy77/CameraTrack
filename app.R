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
      body { background-color: #000; margin: 0; padding: 0; overflow: hidden; }
      #main_container {
        position: relative;
        width: 100vw;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      /* 视频层：隐藏或作为背景 */
      #my_camera {
        position: absolute;
        width: 640px;
        height: 480px;
        transform: scaleX(-1); /* 镜像 */
        opacity: 0.3; /* 让视频暗一点，突出粒子 */
        z-index: 1;
      }
      /* 绘图层：全屏覆盖 */
      #output_canvas {
        position: absolute;
        width: 640px;
        height: 480px;
        z-index: 2;
        transform: scaleX(-1); /* 画布也要镜像，否则和视频对不上 */
      }
      .title-overlay {
        position: absolute;
        top: 20px;
        z-index: 10;
        color: white;
        text-align: center;
        width: 100%;
        font-family: sans-serif;
        text-shadow: 0 0 10px #00FFFF;
        pointer-events: none;
      }
    "))
  ),
  
  div(id="main_container",
      div(class="title-overlay",
          h2("R + JS 极速粒子引擎 (60 FPS)"),
          h4("⚡ 所有的计算都在浏览器本地完成，零延迟 ⚡")
      ),
      tags$video(id = "my_camera", autoplay = TRUE, muted = TRUE),
      tags$canvas(id = "output_canvas")
  )
)

server <- function(input, output, session) {
  # R 现在什么都不用做，甚至不需要监听信号
  # 所有的魔法都在 hand_handler.js 里
}

shinyApp(ui, server)