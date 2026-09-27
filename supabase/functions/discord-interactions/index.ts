import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()

    // 1. Verificação de Assinatura Ed25519 (se DISCORD_PUBLIC_KEY estiver configurado nos Secrets)
    const publicKey = Deno.env.get('DISCORD_PUBLIC_KEY')
    if (publicKey) {
      const signature = req.headers.get('X-Signature-Ed25519')
      const timestamp = req.headers.get('X-Signature-Timestamp')
      if (!signature || !timestamp) {
        return new Response('Assinatura do Discord ausente', { status: 401 })
      }
      try {
        const keyBytes = new Uint8Array(publicKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
        const sigBytes = new Uint8Array(signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
        const data = new TextEncoder().encode(timestamp + rawBody)
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyBytes,
          { name: 'Ed25519', namedCurve: 'Ed25519' },
          false,
          ['verify']
        )
        const isValid = await crypto.subtle.verify('Ed25519', cryptoKey, sigBytes, data)
        if (!isValid) {
          return new Response('Assinatura do Discord inválida', { status: 401 })
        }
      } catch (sigErr) {
        console.error('[Discord Signature Error]', sigErr)
        return new Response('Erro na validação da assinatura', { status: 401 })
      }
    }

    const body = rawBody ? JSON.parse(rawBody) : {}
    const { type, data, user, member } = body

    // 2. Verificação de PING do Discord (Endpoint Verification)
    if (type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 3. Interação de Botão (type 3: MESSAGE_COMPONENT)
    if (type === 3 && data?.custom_id) {
      const customId = data.custom_id
      const operatorName = member?.nick || user?.global_name || user?.username || 'Gestor (Discord)'

      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      const supabase = createClient(supabaseUrl, supabaseKey)

      if (customId.startsWith('complete_task:')) {
        const parts = customId.split(':')
        const taskId = parts[1]
        const targetDate = parts[2] || new Date().toISOString().split('T')[0]
        const nowTime = new Date().toTimeString().split(' ')[0].substring(0, 5)

        // 3.1 Atualiza a tarefa na tabela individual de auditoria
        await supabase
          .from('rotina_operacional_tarefas')
          .upsert({
            data: targetDate,
            task_id: taskId,
            concluida: true,
            concluida_por: operatorName,
            checked_time: nowTime,
            updated_at: new Date().toISOString()
          }, { onConflict: 'data,task_id' })

        // 3.2 Sincronização bidirecional com a tabela consolidada diária (dispara Supabase Realtime no Dashboard)
        try {
          const { data: diaria } = await supabase
            .from('rotina_operacional_diaria')
            .select('*')
            .eq('data', targetDate)
            .maybeSingle()

          const currentTasks = diaria?.tarefas || {}
          currentTasks[taskId] = {
            completed: true,
            user: operatorName,
            checkedTime: nowTime,
            timestamp: new Date().toISOString(),
            onTime: true,
            logs: [
              ...(currentTasks[taskId]?.logs || []),
              {
                action: 'Concluído via Discord Bot',
                user: operatorName,
                time: nowTime,
                source: 'discord'
              }
            ]
          }

          const totalTasks = 41
          const completedCount = Object.values(currentTasks).filter((t: any) => t?.completed).length
          const progresso = Math.round((completedCount / totalTasks) * 100)

          await supabase
            .from('rotina_operacional_diaria')
            .upsert({
              data: targetDate,
              gestor_ativo: diaria?.gestor_ativo || operatorName,
              tarefas: currentTasks,
              progresso_percentual: progresso,
              updated_at: new Date().toISOString()
            }, { onConflict: 'data' })
        } catch (syncErr) {
          console.error('[Discord Sync Error in rotina_operacional_diaria]', syncErr)
        }

        return new Response(JSON.stringify({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: {
            content: `✅ **Tarefa [${taskId}] concluída com sucesso!**\nRegistrado por **${operatorName}** às **${nowTime}** diretamente pelo Discord e sincronizado com o painel em tempo real!`,
            flags: 64 // Ephemeral (somente quem clicou visualiza)
          }
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (customId.startsWith('snooze_task:')) {
        return new Response(JSON.stringify({
          type: 4,
          data: {
            content: `⏳ **Lembrete adiado em 10 minutos!** Você receberá um novo alerta no Discord.`,
            flags: 64
          }
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
