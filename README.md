# 驯兽师 Beast Tamer（战斗 Demo）
纯 HTML5 Canvas + JS，无需构建。本地运行：`python3 -m http.server` 后打开浏览器。
- 素材切图：`python3 tools/slice.py`（源图在 /workspace/beast-design/sheets）
- v2：单伙伴、8 波制 + 波间三选一卡牌、竞技场有边界；演示捷径：T2→T4 跳过 T3（迅爪狼+长尾+头Lv4→迅猛龙；炎狼+焰尾+头Lv4→九尾狐）；T1 部件总等级≥10 时可从最接近的配方中选进化。
- 调试：`?debug=1` 提高变异率与蛋掉率；`window.__bt` 提供测试钩子。
