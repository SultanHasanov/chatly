import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    try { return JSON.stringify(error) } catch { /* fallback below */ }
  }
  return String(error || 'Push failed')
}

Deno.serve(async (req) => {
  try {
    const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET')
    if (!webhookSecret || req.headers.get('x-webhook-secret') !== webhookSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json()
    const message = body.record ?? body
    if (!message?.conversation_id || !message?.author_id) return Response.json({ delivered: 0, skipped: true })

    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'
    if (!serviceKey || !publicKey || !privateKey) throw new Error('Push secrets are not configured')
    webpush.setVapidDetails(subject, publicKey, privateKey)

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    const [{ data: conversation, error: conversationError }, { data: author, error: authorError }, { data: members, error: membersError }] = await Promise.all([
      admin.from('conversations').select('name,kind').eq('id', message.conversation_id).single(),
      admin.from('profiles').select('display_name').eq('id', message.author_id).single(),
      admin.from('conversation_members').select('user_id,notifications').eq('conversation_id', message.conversation_id).neq('user_id', message.author_id),
    ])
    if (conversationError) throw conversationError
    if (authorError) throw authorError
    if (membersError) throw membersError

    const recipients = (members ?? []).filter((member) => member.notifications === 'all').map((member) => member.user_id)
    if (!recipients.length) return Response.json({ delivered: 0, recipients: 0 })
    const { data: subscriptions, error: subscriptionsError } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').in('user_id', recipients)
    if (subscriptionsError) throw subscriptionsError

    const title = conversation?.kind === 'group' ? `${author?.display_name} · ${conversation.name}` : author?.display_name || 'Chat Brat'
    const preview = message.body || ({ image: '📷 Фото', video: '🎬 Видео', document: '📎 Документ', voice: '🎤 Голосовое сообщение' }[message.kind as string] ?? 'Новое сообщение')
    const payload = JSON.stringify({ title, body: preview.slice(0, 160), conversationId: message.conversation_id, url: `/chats/${message.conversation_id}` })
    let delivered = 0
    await Promise.all((subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, { TTL: 300, urgency: 'high' })
        delivered += 1
      } catch (pushError) {
        const status = (pushError as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id)
        else console.error('Chat Brat push failed', pushError)
      }
    }))
    return Response.json({ delivered, subscriptions: subscriptions?.length ?? 0 })
  } catch (error) {
    console.error('send-push failed', error)
    return Response.json({ error: errorMessage(error) }, { status: 500 })
  }
})
