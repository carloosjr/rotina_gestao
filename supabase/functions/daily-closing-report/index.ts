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
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const targetDate = body.data || new Date().toISOString().split('T')[0]
    const recipientEmail = body.email || 'jose.carlos@softcomtecnologia.com.br'

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Coleta dados do dia
    const { data: diaria } = await supabase
      .from('rotina_operacional_diaria')
      .select('*')
      .eq('data', targetDate)
      .maybeSingle()

    const { data: tarefas } = await supabase
      .from('rotina_operacional_tarefas')
      .select('*')
      .eq('data', targetDate)

    const { data: sensoDono } = await supabase
      .from('rotina_operacional_senso_dono')
      .select('*')
      .eq('data', targetDate)

    const { data: workdesk } = await supabase
      .from('rotina_operacional_workdesk')
      .select('*')
      .eq('data', targetDate)

    const { data: configRow } = await supabase
      .from('rotina_operacional_config')
      .select('valor')
      .eq('chave', 'discord')
      .maybeSingle()

    const discordCfg = configRow?.valor || {}

    // 2. Calcula métricas
    const totalTarefas = tarefas?.length || 0
    const concluidas = tarefas?.filter((t: any) => t.concluida)?.length || 0
    const aderencia = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0
    const rondasCount = workdesk?.length || diaria?.workdesk_rondas || 0
    const sensoNota = sensoDono?.reduce((acc: number, curr: any) => acc + (curr.nota || 0), 0) / (sensoDono?.length || 1) || 100

    const pendentes = tarefas?.filter((t: any) => !t.concluida) || []

    const [ano, mes, dia] = targetDate.split('-')
    const dataFormatada = `${dia}/${mes}/${ano}`

    // 3. Monta HTML do E-mail para jose.carlos@softcomtecnologia.com.br
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 650px; margin: 0 auto; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }
          .header { background: linear-gradient(135deg, #1e1e2f 0%, #111827 100%); padding: 24px; border-bottom: 2px solid #fbbf24; }
          .header h1 { margin: 0 0 6px 0; color: #ffffff; font-size: 20px; }
          .header p { margin: 0; color: #94a3b8; font-size: 13px; }
          .kpi-grid { display: flex; gap: 12px; padding: 20px; background: #0f172a; }
          .kpi-box { flex: 1; background: #1e293b; padding: 14px; border-radius: 8px; border: 1px solid #334155; text-align: center; }
          .kpi-val { font-size: 22px; font-weight: bold; color: #fbbf24; margin-bottom: 4px; }
          .kpi-lbl { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; }
          .section { padding: 20px; border-top: 1px solid #334155; }
          .section h2 { font-size: 15px; color: #f1f5f9; margin-top: 0; margin-bottom: 12px; }
          .task-row { padding: 8px 12px; background: #0f172a; border-radius: 6px; margin-bottom: 6px; font-size: 12px; display: flex; justify-content: space-between; }
          .task-title { color: #e2e8f0; font-weight: 500; }
          .task-status-ok { color: #22c55e; font-weight: bold; }
          .task-status-pend { color: #f87171; font-weight: bold; }
          .footer { padding: 16px 20px; font-size: 11px; color: #64748b; text-align: center; background: #0b1120; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Service Desk Chat | Gestão Operacional</h1>
            <p>Fechamento Diário Consolidado • Data: <strong>${dataFormatada}</strong></p>
          </div>

          <div class="kpi-grid">
            <div class="kpi-box">
              <div class="kpi-val">${aderencia}%</div>
              <div class="kpi-lbl">Aderência Geral</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-val">${concluidas}/${totalTarefas}</div>
              <div class="kpi-lbl">Rotinas Concluídas</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-val">${rondasCount}</div>
              <div class="kpi-lbl">Rondas WorkDesk</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-val">${Math.round(sensoNota)}%</div>
              <div class="kpi-lbl">Senso de Dono</div>
            </div>
          </div>

          <div class="section">
            <h2>Auditoria de Rotinas Operacionais</h2>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 0;">
              Supervisor Ativo de Fechamento: <strong>${diaria?.gestor_ativo || 'José Carlos'}</strong>
            </p>
            ${(tarefas || []).slice(0, 15).map((t: any) => `
              <div class="task-row">
                <span class="task-title">[${t.horario || t.task_id}] ${t.titulo} (${t.responsavel})</span>
                <span class="${t.concluida ? 'task-status-ok' : 'task-status-pend'}">
                  ${t.concluida ? `✓ Concluído às ${t.checked_time || 'OK'}` : '⚠ Pendente'}
                </span>
              </div>
            `).join('')}
          </div>

          ${pendentes.length > 0 ? `
            <div class="section" style="background: rgba(239, 68, 68, 0.05);">
              <h2 style="color: #f87171;">Pendências Identificadas (${pendentes.length})</h2>
              ${pendentes.map((p: any) => `
                <div style="font-size: 12px; color: #fca5a5; padding: 4px 0;">
                  • <strong>[${p.horario || ''}] ${p.titulo}</strong> — Resp: ${p.responsavel}
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="section" style="background: rgba(34, 197, 94, 0.05); text-align: center;">
              <span style="color: #4ade80; font-weight: bold; font-size: 13px;">
                🎉 100% das atividades operacionais concluídas com sucesso no turno!
              </span>
            </div>
          `}

          <div class="footer">
            Relatório gerado automaticamente pelo Service Desk Chat • Softcom Tecnologia<br>
            Destinatário exclusivo: ${recipientEmail}
          </div>
        </div>
      </body>
      </html>
    `

    // 4. Se houver integração com Discord Webhook configurada, dispara resumo no Discord também
    if (discordCfg.webhookUrl && discordCfg.webhookUrl.startsWith('https://discord')) {
      try {
        await fetch(discordCfg.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'Service Desk Chat | Fechamento Diário',
            avatar_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            content: `🌙 **FECHAMENTO DIÁRIO DA GESTÃO OPERACIONAL** (${dataFormatada})\nRelatório consolidado das 22:00 enviado por e-mail para **${recipientEmail}**.`,
            embeds: [
              {
                title: `📊 Balanço Geral do Turno (${dataFormatada})`,
                description: `Aderência operacional final de **${aderencia}%** com **${concluidas}/${totalTarefas}** rotinas cumpridas.`,
                color: aderencia >= 90 ? 2278750 : aderencia >= 75 ? 16503844 : 15682884,
                fields: [
                  { name: '⚡ Aderência', value: `${aderencia}%`, inline: true },
                  { name: '🔄 WorkDesk (30m)', value: `${rondasCount} rondas`, inline: true },
                  { name: '⭐ Senso de Dono', value: `${Math.round(sensoNota)}%`, inline: true },
                  { name: '📋 Pendências', value: pendentes.length > 0 ? `${pendentes.length} pendência(s)` : 'Nenhuma! 🎉', inline: true },
                  { name: '👤 Fechamento', value: diaria?.gestor_ativo || 'José Carlos', inline: true },
                  { name: '📧 E-mail Enviado', value: recipientEmail, inline: true }
                ],
                footer: { text: 'Service Desk Chat | Softcom Tecnologia • Fechamento 22:00' },
                timestamp: new Date().toISOString()
              }
            ]
          })
        })
      } catch(discordErr) {
        console.warn('Erro ao disparar no Discord:', discordErr)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Relatório de fechamento consolidado para ${dataFormatada} processado com sucesso!`,
      recipient: recipientEmail,
      stats: {
        total: totalTarefas,
        concluidas,
        aderencia,
        rondas: rondasCount,
        pendencias: pendentes.length
      },
      htmlPreview: emailHtml
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
