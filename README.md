# 驯兽师 Beast Tamer（战斗 Demo）
纯 HTML5 Canvas + JS，无需构建。本地运行：`python3 -m http.server` 后打开浏览器。
- 素材切图：`python3 tools/slice.py`（源图在 /workspace/beast-design/sheets）
- 演示捷径：T2→T4 跳过 T3（迅爪狼+长尾+头Lv4→迅猛龙；炎狼+焰尾+头Lv4→九尾狐）；T1 部件总等级≥10 时保底进化为最接近配方的 T2。
- 调试：`?debug=1` 提高变异率与蛋掉率；`window.__bt` 提供测试钩子。
