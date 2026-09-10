# dsh-tidewatch 🌊

DeepSeek Harness 插件：在页面右上角显示 **DeepSeek API 高峰/低谷时段**、倒计时与 **账户余额** 的悬浮卡片。

提供两种形态，按需要选一种（**推荐 A**）：

| | A. 常驻插件（bundle） | B. 动态插件 |
| --- | --- | --- |
| 生效范围 | 开机即在，所有会话 | 仅当前会话，进程内 |
| 生命周期 | 随 DSH profile 启动/重启 | 重启即消失，需重新 define |
| 安装 | 装进 profile（见下） | 会话内 `cordis_define` + `cordis_run` |

## 功能

- 🟢🔴 **实时时段状态灯**：按 DeepSeek 官方计价规则判定当前是高峰期还是低谷期。
  - 高峰：北京时间 周一至周五 09:00–12:00、14:00–18:00
  - 低谷：其余全部时段（夜间、午间、周末均为低谷），**价格减半**
- ⏱️ **北京时钟 + 倒计时**：显示距下一时段切换还有多久，每秒更新。
- 💰 **账户余额**：配置 API Key 后查询 `GET https://api.deepseek.com/user/balance`，显示账户可用性、总余额、充值余额与赠送余额；每 5 分钟自动刷新。
- 🖱️ **可拖拽、可折叠**：标题栏拖动定位，点「－」收起。

## A. 安装为常驻插件

插件目录本身就是 DSH 的一个 bundle（`dsh.bundle.patch` + `dsh.client`）。

```sh
# 1. 装进 profile（web 示例），会写入 package.json 的 dsh.profile.bundles
dsh plugin --profile web add /path/to/dsh-tidewatch

# 2. 重启该 profile 使其生效
```

也可以只挂载而不改 bundle 列表——把 `cordis.patch.yml` 里的 insert 行追加到
`${DSH_HOME}/profiles/<profile>/cordis.patch.yml`，并在该 profile 的
`node_modules/` 下建一个指向本目录的软链接；patch 层默认 `patchReload: live`，
保存后即时生效，**无需重启**。

改完客户端半边（`lib/client.js`）后刷新页面即可，无构建步骤。

## B. 安装为动态插件（单会话）

在 DSH 会话中用 `cordis_define` 定义：

1. `code.host` ← `dynamic/host.js` 文件头注释之后的全部内容；
2. `code.client` ← `dynamic/client.js` 文件头注释之后的全部内容；
3. `cordis_run` 激活并在运行卡片上批准。

> 动态插件只存在于当前进程内存，DSH 重启即消失；需要长期可用请用方案 A。

## API Key 存储与安全

- Key 通过 DSH 的 `credentials` 服务保存（ref: `DSH_PLUGIN_DEEPSEEK_KEY`），落盘于本机 `~/.dsh/.credentials.yaml`。
- **Key 永不回传浏览器**：前端只拿到「是否已配置 / 来源」与余额数值。
- 余额请求由 Host 执行 `curl`，Key 经**环境变量**传递，不出现在命令行、不写入日志。
- 若本机已配置环境变量 `DEEPSEEK_API_KEY`，插件自动复用（显示「环境变量」），无需手动输入。
- 点「清除」可随时删除已保存的 Key（环境变量来源不受影响）。

## 时段规则出处

[DeepSeek API 官方文档：模型 & 价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/) —— 「空闲时段价格为高峰时段价格的一半。高峰时段为北京时间周一至周五 9:00 - 12:00、14:00 - 18:00（其余为空闲时段）」。

## 文件结构

```
package.json          # 包声明：dsh.bundle.patch + dsh.client(platform: web)
cordis.patch.yml      # bundle 层：把宿主行插入 composition
lib/index.js          # 宿主半边：loopback RPC 通道注册（/dsh-tidewatch）
lib/tide.js           # 宿主半边业务：凭据解析、Key 存取、余额查询
lib/client.js         # 浏览器半边：__ModuleLoader__ bundle，悬浮卡片 UI
dynamic/host.js       # 动态插件版宿主半边（方案 B）
dynamic/client.js     # 动态插件版浏览器半边（方案 B）
```

## License

MIT
