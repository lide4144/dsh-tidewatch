# dsh-tidewatch 🌊

DeepSeek Harness 动态 Cordis 插件：在页面右上角显示 **DeepSeek API 高峰/低谷时段**、倒计时与 **账户余额** 的悬浮面板。

## 功能

- 🟢🔴 **实时时段状态灯**：按 DeepSeek 官方计价规则判定当前是高峰期还是低谷期（低谷时段价格为高峰的一半）。
  - 高峰：北京时间 周一至周五 09:00–12:00、14:00–18:00
  - 低谷：其余全部时段（夜间、午间、周末均为低谷）
- ⏱️ **北京时钟 + 倒计时**：显示距下一时段切换还有多久，每秒更新。
- 💰 **账户余额**：输入 API Key 后查询 `GET https://api.deepseek.com/user/balance`，显示账户可用性、总余额、充值余额与赠送余额；每 5 分钟自动刷新。
- 🖱️ **可拖拽、可折叠**：标题栏拖动定位，点击「－」折叠成小条。

## 安装（动态插件方式）

在 DSH 会话中，用 `cordis_define` 定义插件：

1. `code.host` 填入 [`host.js`](host.js) 文件头注释之后的全部内容（即从 `const KEY_REF = ...` 到文件结尾，整个就是函数体）。
2. `code.client` 填入 [`client.js`](client.js) 文件头注释之后的全部内容。
3. `cordis_run` 激活，并在运行卡片上**批准**（浏览器端需要授权）。
4. 批准后右上角出现悬浮面板。

> `idPrefix` 建议 `dstide`（3–6 位小写字母，Host 会分配最终 ID）。

## API Key 存储与安全

- 在面板中输入 Key 点「保存」后，Key 通过 DSH 的 `credentials` 服务写入本机 `~/.dsh/.credentials.yaml`（ref: `DSH_PLUGIN_DEEPSEEK_KEY`），**不会**返回给前端，也不会出现在命令字符串里 —— 余额请求由 Host 端执行 `curl`，Key 经环境变量传递。
- 若本机已配置环境变量 `DEEPSEEK_API_KEY`，插件会直接复用（显示「环境变量」），无需手动输入。
- 点「清除」可随时删除保存的 Key。

## 时段规则出处

[DeepSeek API 官方文档：模型 & 价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/) —— 「空闲时段价格为高峰时段价格的一半。高峰时段为北京时间周一至周五 9:00 - 12:00、14:00 - 18:00（其余为空闲时段）」。

## 文件

| 文件 | 说明 |
| --- | --- |
| [`host.js`](host.js) | Host 端：凭据存取 + curl 余额查询 RPC |
| [`client.js`](client.js) | Client 端：悬浮面板 UI（时段计算、倒计时、余额展示） |

## License

MIT
