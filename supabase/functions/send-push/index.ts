import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from 'jsr:@supabase/server@^1'
import { createClient } from 'npm:@supabase/supabase-js@^2'
import webpush from 'npm:web-push@^3.6.7'

export default {
  fetch: withSupabase({ auth: 'none' }, async (req) => {
    if (req.headers.get('x-webhook-secret') !== Deno.env.get('PUSH_WEBHOOK_SECRET')) return new Response('Unauthorized', { status: 401 })
    const body = await req.json()
    const message = body.record ?? body
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const [{ data: conversation }, { data: author }, { data: members }] = await Promise.all([
    admin.from('conversations').select('name,kind').eq('id', message.conversation_id).single(),
    admin.from('profiles').select('display_name').eq('id', message.author_id).single(),
    admin.from('conversation_members').select('user_id,notifications').eq('conversation_id', message.conversation_id).neq('user_id', message.author_id),
  ])
  const recipients = (members ?? []).filter((member) => member.notifications === 'all').map((member) => member.user_id)
  if (!recipients.length) return Response.json({ delivered: 0 })
  const { data: subscriptions } = await admin.from('push_subscriptions').select('*').in('user_id', recipients)
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)
  const title = conversation?.kind === 'group' ? `${author?.display_name} · ${conversation.name}` : author?.display_name || 'Chat Brat'
  const preview = message.body || ({ image: '📷 Фото', video: '🎬 Видео', document: '📎 Документ', voice: '🎤 Голосовое сообщение' }[message.kind] ?? 'Новое сообщение')
  let delivered = 0
  await Promise.all((subscriptions ?? []).map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title, body: preview.slice(0, 160), conversationId: message.conversation_id, url: `/chats/${message.conversation_id}` }))
      delivered++
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id)
    }
  }))
    return Response.json({ delivered })
  }),
}
