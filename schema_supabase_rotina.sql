-- =========================================================================
-- Schema Completo: Rotina de Gestão Operacional | Service Desk
-- Projeto Supabase: https://bzebborrqzvpdmvtieib.supabase.co
-- Prefixo Oficial: rotina_operacional_*
-- =========================================================================

-- 1. TABELA PRINCIPAL CONSOLIDADA DIÁRIA
CREATE TABLE IF NOT EXISTS public.rotina_operacional_diaria (
    data DATE PRIMARY KEY,
    gestor_ativo TEXT,
    tarefas JSONB DEFAULT '{}'::jsonb,
    senso_de_dono JSONB DEFAULT '[]'::jsonb,
    workdesk JSONB DEFAULT '{"workdeskRounds": 0, "lastRoundTime": null, "lastRoundUser": null, "absentStaff": []}'::jsonb,
    passagem_plantao JSONB DEFAULT '{}'::jsonb,
    almocos JSONB DEFAULT '{}'::jsonb,
    progresso_percentual NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA INDIVIDUAL DE TAREFAS DA LINHA DO TEMPO (Auditoria por Item)
CREATE TABLE IF NOT EXISTS public.rotina_operacional_tarefas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data DATE NOT NULL,
    task_id TEXT NOT NULL,
    titulo TEXT,
    horario TEXT,
    responsavel TEXT,
    categoria TEXT,
    critica BOOLEAN DEFAULT false,
    concluida BOOLEAN DEFAULT false,
    concluida_por TEXT,
    concluida_em TIMESTAMPTZ,
    checked_time TEXT,
    no_horario BOOLEAN DEFAULT true,
    delay_minutes INT DEFAULT 0,
    sla_status TEXT DEFAULT 'on_time',
    logs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT rotina_operacional_tarefas_unique UNIQUE (data, task_id)
);

ALTER TABLE public.rotina_operacional_tarefas ADD COLUMN IF NOT EXISTS delay_minutes INT DEFAULT 0;
ALTER TABLE public.rotina_operacional_tarefas ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'on_time';

-- 3. TABELA DE APONTAMENTOS DO SENSO DE DONO (6 Pilares da Liderança)
CREATE TABLE IF NOT EXISTS public.rotina_operacional_senso_dono (
    id TEXT PRIMARY KEY,
    data DATE NOT NULL,
    horario TEXT NOT NULL,
    gestor TEXT NOT NULL,
    aconteceu TEXT,
    acoes TEXT,
    conhecimento TEXT,
    produto TEXT,
    cliente TEXT,
    processo TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE CONTROLE DE ATRASOS E ATESTADOS NA ABERTURA (07:45)
CREATE TABLE IF NOT EXISTS public.rotina_operacional_ausencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data DATE NOT NULL,
    operador_nome TEXT NOT NULL,
    tipo TEXT DEFAULT 'ausente',
    registrado_por TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT rotina_operacional_ausencias_unique UNIQUE (data, operador_nome)
);

-- 5. TABELA DE RONDAS DO WORKDESK (Ciclos de 30 minutos)
CREATE TABLE IF NOT EXISTS public.rotina_operacional_workdesk (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data DATE NOT NULL,
    ronda_numero INT NOT NULL,
    horario TEXT NOT NULL,
    gestor TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELA DE PASSAGEM DE PLANTÃO NOTURNO (19:00)
CREATE TABLE IF NOT EXISTS public.rotina_operacional_passagem_plantao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data DATE NOT NULL UNIQUE,
    passado_por TEXT NOT NULL,
    horario TEXT,
    resumo_texto TEXT,
    pendencias_count INT DEFAULT 0,
    concluidas_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS (Row Level Security) em todas as tabelas da rotina
ALTER TABLE public.rotina_operacional_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotina_operacional_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotina_operacional_senso_dono ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotina_operacional_ausencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotina_operacional_workdesk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotina_operacional_passagem_plantao ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Público para Leitura e Escrita
DROP POLICY IF EXISTS "rotina_op_diaria_all" ON public.rotina_operacional_diaria;
CREATE POLICY "rotina_op_diaria_all" ON public.rotina_operacional_diaria FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rotina_op_tarefas_all" ON public.rotina_operacional_tarefas;
CREATE POLICY "rotina_op_tarefas_all" ON public.rotina_operacional_tarefas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rotina_op_senso_all" ON public.rotina_operacional_senso_dono;
CREATE POLICY "rotina_op_senso_all" ON public.rotina_operacional_senso_dono FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rotina_op_ausencias_all" ON public.rotina_operacional_ausencias;
CREATE POLICY "rotina_op_ausencias_all" ON public.rotina_operacional_ausencias FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rotina_op_workdesk_all" ON public.rotina_operacional_workdesk;
CREATE POLICY "rotina_op_workdesk_all" ON public.rotina_operacional_workdesk FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rotina_op_plantao_all" ON public.rotina_operacional_passagem_plantao;
CREATE POLICY "rotina_op_plantao_all" ON public.rotina_operacional_passagem_plantao FOR ALL USING (true) WITH CHECK (true);

-- Habilitar leitura pública dos perfis para o Dashboard (ADMIN para o login e TIME para equipe)
DROP POLICY IF EXISTS "Permitir leitura de admins para todos" ON public.profiles;
DROP POLICY IF EXISTS "Permitir leitura de profiles para rotina" ON public.profiles;
CREATE POLICY "Permitir leitura de profiles para rotina" ON public.profiles FOR SELECT USING (true);

-- Funções RPC seguras para listar usuários ADMIN e TIME
CREATE OR REPLACE FUNCTION public.get_admin_profiles()
RETURNS TABLE (
    id UUID,
    nome TEXT,
    email TEXT,
    username TEXT,
    role TEXT,
    foto_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id, nome, email, username, role, foto_url
    FROM public.profiles
    WHERE LOWER(role) = 'admin'
    ORDER BY nome ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_profiles() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_time_profiles()
RETURNS TABLE (
    id UUID,
    nome TEXT,
    email TEXT,
    username TEXT,
    role TEXT,
    foto_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id, nome, email, username, role, foto_url
    FROM public.profiles
    WHERE LOWER(role) = 'time' OR role IS NULL OR LOWER(role) != 'admin'
    ORDER BY nome ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_time_profiles() TO anon, authenticated;

-- Habilitar publicação Realtime nas tabelas da rotina operacional
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rotina_operacional_diaria') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rotina_operacional_diaria;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rotina_operacional_senso_dono') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rotina_operacional_senso_dono;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rotina_operacional_ausencias') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rotina_operacional_ausencias;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rotina_operacional_workdesk') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rotina_operacional_workdesk;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rotina_operacional_passagem_plantao') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rotina_operacional_passagem_plantao;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rotina_operacional_config') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rotina_operacional_config;
  END IF;
END $$;

-- 13. TABELA DE CONFIGURAÇÕES GERAIS (Discord Bot Token, Webhooks, Menções e Regras)
-- Exemplo de chave 'discord': valor = {"mode": "direct", "botToken": "...", "webhookUrl": "...", "mentions": {"Bruno": "ID", "Maurício": "ID", "José Carlos": "ID", "Plantão": "ID"}}
CREATE TABLE IF NOT EXISTS public.rotina_operacional_config (
    chave TEXT PRIMARY KEY,
    valor JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.rotina_operacional_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rotina_op_config_all" ON public.rotina_operacional_config;
CREATE POLICY "rotina_op_config_all" ON public.rotina_operacional_config FOR ALL USING (true) WITH CHECK (true);

-- 14. TRIGGER DE SINCRONIZAÇÃO AUTOMÁTICA (rotina_operacional_tarefas -> rotina_operacional_diaria)
-- Garante que conclusões vindas do Discord Bot ou scripts externos reflitam instantaneamente no Realtime do painel web
CREATE OR REPLACE FUNCTION public.fn_sync_tarefa_to_diaria()
RETURNS TRIGGER AS $$
DECLARE
    v_tarefas JSONB;
    v_task_entry JSONB;
    v_total INT := 41;
    v_done_count INT := 0;
    v_progresso NUMERIC(5,2) := 0;
BEGIN
    SELECT tarefas INTO v_tarefas FROM public.rotina_operacional_diaria WHERE data = NEW.data;
    IF v_tarefas IS NULL THEN
        v_tarefas := '{}'::jsonb;
    END IF;

    v_task_entry := jsonb_build_object(
        'completed', NEW.concluida,
        'user', NEW.concluida_por,
        'checkedTime', NEW.checked_time,
        'timestamp', NEW.concluida_em,
        'onTime', NEW.no_horario,
        'delayMinutes', COALESCE(NEW.delay_minutes, 0),
        'slaStatus', COALESCE(NEW.sla_status, 'on_time'),
        'logs', NEW.logs
    );

    v_tarefas := jsonb_set(v_tarefas, ARRAY[NEW.task_id], v_task_entry);

    -- Recalcular progresso
    SELECT count(*) INTO v_done_count
    FROM jsonb_each(v_tarefas)
    WHERE (value->>'completed')::boolean = true;

    IF v_total > 0 THEN
        v_progresso := round((v_done_count::numeric / v_total::numeric) * 100, 2);
    END IF;

    INSERT INTO public.rotina_operacional_diaria (data, tarefas, progresso_percentual, updated_at)
    VALUES (NEW.data, v_tarefas, v_progresso, now())
    ON CONFLICT (data) DO UPDATE
    SET tarefas = v_tarefas,
        progresso_percentual = v_progresso,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_tarefa_to_diaria ON public.rotina_operacional_tarefas;
CREATE TRIGGER trg_sync_tarefa_to_diaria
AFTER INSERT OR UPDATE ON public.rotina_operacional_tarefas
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_tarefa_to_diaria();

-- 15. AGENDAMENTO NATIVO DE FECHAMENTO DIÁRIO DAS 22:00 (Supabase pg_cron + pg_net)
-- Executa 100% no servidor, sem depender de nenhum navegador aberto
-- 01:00 UTC = 22:00 Horário de Brasília (BRT)
-- Para ativar diretamente no PostgreSQL do Supabase (Database -> Extensions):
/*
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
    'fechamento-diario-service-desk-22h',
    '0 1 * * *',
    $$
    SELECT net.http_post(
        url := 'https://bzebborrqzvpdmvtieib.supabase.co/functions/v1/daily-closing-report',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{"auto": true, "email": "jose.carlos@softcomtecnologia.com.br"}'::jsonb
    );
    $$
);
*/

