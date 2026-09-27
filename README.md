# Service Desk Chat | Gestão Operacional

Sistema em tempo real de Gestão Operacional, Acompanhamento de Rotinas, Rondas WorkDesk, Gestão de Almoços e Fechamento Diário para o time de Service Desk da Softcom Tecnologia.

---

## 🚀 Produção

- **URL Oficial:** [https://rotinagestao.vercel.app](https://rotinagestao.vercel.app)
- **Repositório GitHub:** [https://github.com/carloosjr/rotina_gestao](https://github.com/carloosjr/rotina_gestao)
- **Banco de Dados & Serverless:** Supabase (`Service Desk Chat` - `bzebborrqzvpdmvtieib`)

---

## 🛠️ Principais Recursos

1. **Trilha Operacional Diária & SLA de Execução**: Cronograma dinâmico de 41 tarefas com criticidade, logs de auditoria, cálculo de aderência e **medição de atraso real (SLA de tolerância de 15m)**.
2. **Central de Configurações & Ferramentas (`⚙️ Configurações`)**:
   - Status e sincronização bidirecional em tempo real do **Supabase**.
   - Dashboard analítico de **Métricas, SLA de Pontualidade & Histórico (14 dias)**.
   - Integração com **Discord Bot (DMs Privadas e Webhook)** com botões interativos sincronizados instantaneamente com o painel web.
   - Integração multi-canal com **WhatsApp (Evolution API, Z-API, Baileys)**.
   - Exportação executiva do **Relatório em PDF** (formatação em 1 página).
   - **Copiar Relatório Formatado** para Teams ou WhatsApp.
   - Disparo do **Fechamento Diário das 22h** com envio real por e-mail via **Resend** para `jose.carlos@softcomtecnologia.com.br` e Discord.
3. **Automação Cloud 100% Serverless (22:00 BRT)**:
   - Rotina automatizada via **GitHub Actions** (`.github/workflows/daily-closing-cron.yml`) e agendamento nativo via `pg_cron` no Supabase, garantindo fechamento e alertas mesmo sem abas abertas.
4. **Reguinha de Almoços & Tolerância (+15m)**: Monitoramento visual de saídas e retornos de almoço com alertas de desvio.
5. **Ronda Periódica WorkDesk (30m)**: Alertas desktop e controle de ausências e atestados da equipe.
6. **Apontamentos de Liderança (Senso de Dono)**: Registro e auditoria dos pilares de liderança com modal de confirmação de exclusão.

---

## 🔐 Configuração de Secrets no Supabase

Para máxima segurança e funcionalidade completa, adicione as seguintes variáveis no painel do Supabase (**Project Settings -> Edge Functions -> Secrets**):

| Secret | Descrição |
| :--- | :--- |
| `RESEND_API_KEY` | Chave de API da [Resend](https://resend.com) para entrega real dos e-mails de fechamento às 22h. |
| `RESEND_FROM_EMAIL` | *(Opcional)* Remetente verificado (padrão: `Service Desk Gestão <onboarding@resend.dev>`). |
| `DISCORD_BOT_TOKEN` | Token do bot do Discord para disparo de DMs e alertas interativos. |
| `DISCORD_PUBLIC_KEY` | *(Opcional)* Chave pública da aplicação Discord para validação de assinatura Ed25519. |

---

## 📦 Deploy Contínuo (CI/CD)

O repositório está vinculado diretamente à Vercel na branch `main`. Qualquer commit enviado para a branch `main` dispara o deploy automático para produção.
