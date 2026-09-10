/**
 * dsh-tidewatch —— DeepSeek 高峰/低谷时段与账户余额面板（Host 端）。
 *
 * 职责：
 * 1. 通过 loopback RPC 通道 /dsh-tidewatch 向浏览器半边提供四个端点：
 *    - status         当前数据源（模型 provider 或手动 Key）与候选清单；
 *    - providers      当前生效模型、已配置 provider 的凭据可用性与余额接口能力；
 *    - save-key       保存用户手动输入的 Key（写入 credentials 服务）；
 *    - clear-key      删除手动保存的 Key；
 *    - fetch-balance  查询账户余额，可选 `provider` 指定数据源。
 * 2. Key 来源按优先级解析：手动保存 → 当前生效模型所属 provider 的 apiKeyEnv
 *    → 环境变量 DEEPSEEK_API_KEY。Key 值永不回传浏览器，只回传来源与可用性。
 * 3. 余额请求由 Host 执行 curl，Key 经环境变量传递（不出现在命令行、不进日志）。
 *
 * 时段判定（高峰/低谷）完全在浏览器半边按本地时钟计算，Host 不参与。
 */
import {
  BALANCE_URL, ENV_REF, KEY_REF, MANUAL_PROVIDER, RPC_CHANNEL,
  clearKey, describeKey, describeProviders, fetchBalance, saveKey,
} from './tide.js'

/** 稳定 Cordis 插件名。 */
const name = 'dsh-tidewatch'
/** 依赖的宿主服务：llm/settings/credentials/shell 均按可选读取，缺失时该能力降级而非整个插件停摆。 */
const inject = []

/** 统一成功信封：错误也放在 value.error 内，避免 connection RPC 层把业务失败当 reject。 */
function okResult(value) {
  return { ok: true, value }
}

/**
 * 插件主体：注册 loopback RPC 通道。
 * @param ctx - 宿主根上下文。
 */
function apply(ctx) {
  const credentials = ctx.get('credentials')

  ctx.inject(['connection'], (connectionCtx) => {
    const connection = connectionCtx.connection
    if (connection === undefined || connection.rpc === undefined) return
    connection.rpc.handle(
      RPC_CHANNEL,
      async (endpoint, payload) => {
        try {
          switch (endpoint) {
            case 'status':
              return okResult(await describeKey(ctx))
            case 'providers':
              return okResult(await describeProviders(ctx))
            case 'save-key':
              return okResult(await saveKey(credentials, payload))
            case 'clear-key':
              return okResult(await clearKey(credentials))
            case 'fetch-balance':
              return okResult(await fetchBalance(ctx, payload))
            default:
              return okResult({ error: { code: 'not-found', message: `unknown endpoint ${JSON.stringify(endpoint)}` } })
          }
        } catch (error) {
          return okResult({ error: { code: 'internal', message: (error && error.message) || String(error) } })
        }
      },
      { authority: 'loopback' },
    )
  })
}

export { BALANCE_URL, ENV_REF, KEY_REF, MANUAL_PROVIDER, apply, inject, name }
