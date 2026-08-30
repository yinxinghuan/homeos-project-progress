# HomeOS 外部工程进度

这是从 HomeOS 主记录生成的脱敏工程协作站点。

## 数据规则

- HomeOS Markdown 与结构化采购记录是唯一事实源。
- 新图纸、尺寸、型号或安装信息先进入 HomeOS，再由 `scripts/sync-progress.mjs` 生成 `data/progress.json`。
- 外部版保留工程事项、阶段、品牌、型号、尺寸、安装、协调与验收信息。
- 外部版不生成价格、付款、地址、姓名、电话、账户、发票、合同编号或带有这些信息的原始订单资料。
- 构建前自动运行脱敏守卫；发现敏感字段时构建失败，不能发布。

```bash
npm run dev
npm run build
npm run build:pages
```

`npm run build` 生成现有 Sites 部署；`npm run build:pages` 从已提交的脱敏数据生成 GitHub Pages 静态镜像。GitHub 工作流不会接触 HomeOS 内部主记录，只发布仓库中已经通过脱敏守卫生成的 `data/progress.json` 与公开技术资料。
