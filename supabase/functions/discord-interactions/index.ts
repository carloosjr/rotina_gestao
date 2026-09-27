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
    const body = await req.json().catch(() => ({}))
    const { type, data, user, member } = body

    // 1. Verificação de PING do Discord (Endpoint Verification)
    if (type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Interação de Botão (type 3: MESSAGE_COMPONENT)
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

        // Atualiza a tarefa no Supabase
        await supabase
          .from('rotina_operacional_tarefas')
          .upsert({
            data: targetDate,
            task_id: taskId,
            concluida: true,
            concluida_por: operatorName,
            checked_time: nowTime
          }, { onConflict: 'data,task_id' })

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
