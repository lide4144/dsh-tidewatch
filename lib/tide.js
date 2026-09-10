/**
 * dsh-tidewatch Host 端业务实现：API Key 解析、存取与余额查询。
 *
 * 与 lib/index.js 拆开是为了让 RPC 装配与业务逻辑各自独立：
 * index.js 只负责通道注册与信封，本文件只负责凭据与网络。
 */

/** 插件自有凭据引用（用户输入并保存的 Key 存于此）。 */
export const KEY_REF = 'DSH_PLUGIN_DEEPSEEK_KEY'
/** 兼容读取的环境变量引用（本机已配置 DEEPSEEK_API_KEY 时无需手动输入）。 */
export const ENV_REF = 'DEEPSEEK_API_KEY'
/** DeepSeek 余额查询端点。 */
export const BALANCE_URL = 'https://api.deepseek.com/user/balance'
/** 浏览器半边与本插件共享的 loopback RPC 通道。 */
export const RPC_CHANNEL = '/dsh-tidewatch'

/**
 * 解析当前生效的 API Key。
 * 每次调用都重新解析，因此用户改 Key 后下一次查询即生效，无需重启。
 * @param credentials - 宿主 credentials 服务，可能缺席。
 * @returns {{ key: string, source: 'saved' | 'env' } | null} 生效的 Key 及其来源。
 */
async function resolveKey(credentials) {
  if (!credentials) return null
  try {
    const own = await credentials.resolve(KEY_REF)
    if (own) return { key: own.value, source: 'saved' }
    const env = await credentials.resolve(ENV_REF)
    if (env) return { key: env.value, source: 'env' }
  } catch (error) {
    // 凭据服务异常时按「未配置」降级：时段面板不依赖凭据，不应随之失效。
    return null
  }
  return null
}

/**
 * 描述 Key 配置状态（不含 Key 值）。
 * @param credentials - 宿主 credentials 服务，可能缺席。
 * @returns {Promise<{ configured: boolean, source: string | null }>} 状态。
 */
export async function describeKey(credentials) {
  const resolved = await resolveKey(credentials)
  return { configured: resolved !== null, source: resolved ? resolved.source : null }
}

/**
 * 保存用户输入的 API Key。
 * @param credentials - 宿主 credentials 服务。
 * @param payload - RPC 负载，`key` 为待保存的明文 Key。
 * @returns {Promise<object>} `{ ok: true }` 或 `{ error: { code, message } }`。
 */
export async function saveKey(credentials, payload) {
  const key = payload && typeof payload.key === 'string' ? payload.key.trim() : ''
  if (!key) return { error: { code: 'bad-request', message: 'Key 不能为空' } }
  if (!credentials) return { error: { code: 'unavailable', message: '凭据服务不可用' } }
  try {
    await credentials.set(KEY_REF, key)
    return { ok: true }
  } catch (error) {
    return { error: { code: 'store-failed', message: (error && error.message) || String(error) } }
  }
}

/**
 * 删除已保存的 API Key（环境变量来源不受影响）。
 * @param credentials - 宿主 credentials 服务。
 * @returns {Promise<object>} `{ ok: true }` 或 `{ error: { code, message } }`。
 */
export async function clearKey(credentials) {
  if (!credentials) return { error: { code: 'unavailable', message: '凭据服务不可用' } }
  try {
    await credentials.unset(KEY_REF)
    return { ok: true }
  } catch (error) {
    return { error: { code: 'store-failed', message: (error && error.message) || String(error) } }
  }
}

/**
 * 查询 DeepSeek 账户余额。
 *
 * 经 shell 执行 curl，Key 由环境变量注入：既不进入命令行，也不落进任何日志。
 * @param credentials - 宿主 credentials 服务。
 * @param shell - 宿主 shell 服务，可能缺席。
 * @returns {Promise<object>} 包含 `configured`、`balance` 或 `error` 的结果对象。
 */
export async function fetchBalance(credentials, shell) {
  const resolved = await resolveKey(credentials)
  if (!resolved) return { configured: false }
  if (!shell) return { configured: true, error: 'shell 服务不可用，无法发起余额查询' }

  const spec = shell.resolve({
    command: 'curl -sS -m 15 -w "\\n%{http_code}" -H "Authorization: Bearer $DSH_DS_KEY" ' + BALANCE_URL,
    env: { DSH_DS_KEY: resolved.key },
    timeoutMs: 20000,
    stdoutMaxBytes: 65536,
  })

  let result
  try {
    result = await shell.run(spec)
  } catch (error) {
    return {
      configured: true,
      source: resolved.source,
      error: '执行失败: ' + ((error && error.message) || String(error)),
    }
  }

  const text = result && result.stdout ? result.stdout.text || '' : ''
  const lines = text.replace(/\n$/, '').split('\n')
  const httpStatus = Number(lines[lines.length - 1]) || 0
  const body = lines.slice(0, lines.length - 1).join('\n')

  let payload = null
  try {
    payload = JSON.parse(body)
  } catch (error) {
    payload = null
  }
  if (!payload) {
    return { configured: true, source: resolved.source, httpStatus, error: `响应解析失败 (HTTP ${httpStatus})` }
  }
  if (payload.error) {
    return {
      configured: true,
      source: resolved.source,
      httpStatus,
      error: payload.error.message || 'API 错误',
    }
  }
  return { configured: true, source: resolved.source, httpStatus, balance: payload }
}
