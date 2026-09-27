# Service Desk Chat | Gestão Operacional

Sistema em tempo real de Gestão Operacional, Acompanhamento de Rotinas, Rondas WorkDesk, Gestão de Almoços e Fechamento Diário para o time de Service Desk da Softcom Tecnologia.

---

## 🚀 Produção

- **URL Oficial:** [https://rotinagestao.vercel.app](https://rotinagestao.vercel.app)
- **Repositório GitHub:** [https://github.com/carloosjr/rotina_gestao](https://github.com/carloosjr/rotina_gestao)
- **Banco de Dados & Serverless:** Supabase (`Service Desk Chat` - `bzebborrqzvpdmvtieib`)

---

## 🛠️ Principais Recursos

1. **Trilha Operacional Diária**: Cronograma dinâmico de 41 tarefas com criticidade, logs de auditoria e cálculo de aderência.
2. **Central de Configurações & Ferramentas (`⚙️ Configurações`)**:
   - Status e sincronização em tempo real do **Supabase**.
   - Dashboard analítico de **Métricas & Histórico (14 dias)**.
   - Integração com **Discord Bot (DMs Privadas e Webhook)** com botões interativos para concluir/adiar tarefas e alertas de almoço.
   - Integração multi-canal com **WhatsApp (Evolution API, Z-API, Baileys)**.
   - Exportação executiva do **Relatório em PDF** (formatação em 1 página).
   - **Copiar Relatório Formatado** para Teams ou WhatsApp.
   - Disparo manual e automático do **Fechamento Diário das 22h** por e-mail para `jose.carlos@softcomtecnologia.com.br`.
3. **Reguinha de Almoços & Tolerância (+15m)**: Monitoramento visual de saídas e retornos de almoço com alertas de desvio.
4. **Ronda Periódica WorkDesk (30m)**: Alertas desktop e controle de ausências e atestados da equipe.
5. **Apontamentos de Liderança (Senso de Dono)**: Registro e auditoria dos pilares de liderança com modal de confirmação de exclusão.

---

## 📦 Deploy Contínuo (CI/CD)

O repositório está vinculado diretamente à Vercel na branch `main`. Qualquer commit enviado para a branch `main` dispara o deploy automático para produção.
