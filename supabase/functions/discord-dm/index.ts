import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { botToken, userId, payload } = await req.json()
    const token = (botToken || Deno.env.get('DISCORD_BOT_TOKEN') || '').trim()

    if (!token || !userId) {
      return new Response(JSON.stringify({ error: 'botToken (ou variável de ambiente DISCORD_BOT_TOKEN) e userId são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Abre ou obtém o canal de DM direta com o usuário
    const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recipient_id: userId.trim() })
    })

    if (!dmRes.ok) {
      const errText = await dmRes.text()
      return new Response(JSON.stringify({ error: `Discord DM Error (${dmRes.status}): ${errText}` }), {
        status: dmRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const dmData = await dmRes.json()
    const channelId = dmData.id

    // 2. Envia a mensagem / Embed para o canal de DM do usuário
    const msgRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!msgRes.ok) {
      const errText = await msgRes.text()
      return new Response(JSON.stringify({ error: `Discord Message Error (${msgRes.status}): ${errText}` }), {
        status: msgRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const msgData = await msgRes.json()
    return new Response(JSON.stringify({ success: true, messageId: msgData.id, channelId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
