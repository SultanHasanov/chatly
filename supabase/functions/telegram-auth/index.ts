import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { fetchWithSupabase } from 'jsr:@supabase/server@^1'
import { createClient } from 'npm:@supabase/supabase-js@^2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

async function hmacHex(key: ArrayBuffer, data: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default {
  fetch: fetchWithSupabase({ auth: ['publishable', 'user'] }, async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
    try {
    const payload = await req.json()
    const { hash, ...fields } = payload
    if (!hash || !fields.id || !fields.auth_date) throw new Error('Некорректные данные Telegram')
    if (Math.abs(Date.now() / 1000 - Number(fields.auth_date)) > 86400) throw new Error('Данные Telegram устарели')
    const check = Object.entries(fields).filter(([, value]) => value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n')
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!
    const secret = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(botToken))
    if ((await hmacHex(secret, check)) !== hash) throw new Error('Подпись Telegram не прошла проверку')

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const sourceUser = bearer ? (await admin.auth.getUser(bearer)).data.user : null
    const email = `telegram-${fields.id}@auth.chatbrat.invalid`
    const name = [fields.first_name, fields.last_name].filter(Boolean).join(' ')
    const generated = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { data: { display_name: name } } })
    if (generated.error) throw generated.error
    const userId = generated.data.user.id
    await admin.from('profiles').update({ telegram_id: fields.id, display_name: name, updated_at: new Date().toISOString() }).eq('id', userId)
    if (sourceUser?.is_anonymous && sourceUser.id !== userId) {
      const merged = await admin.rpc('merge_guest_account', { source_user: sourceUser.id, target_user: userId })
      if (merged.error) throw merged.error
      await admin.auth.admin.deleteUser(sourceUser.id)
    }
    return Response.json({ token_hash: generated.data.properties.hashed_token, type: 'magiclink' }, { headers: cors })
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Ошибка авторизации' }, { status: 400, headers: cors })
    }
  }),
} satisfies Deno.ServeDefaultExport
