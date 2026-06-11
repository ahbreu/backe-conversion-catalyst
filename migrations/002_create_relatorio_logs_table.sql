-- Migration: 002_create_relatorio_logs_table
-- Description: Cria a tabela de logs para os relatorios semanais de leads
-- Date: 2026-05-21
-- Workflow: backe-relatorio-semanal-leads.json

CREATE TABLE IF NOT EXISTS public.relatorio_logs (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL DEFAULT 'semanal',
  periodo_inicio TIMESTAMPTZ NOT NULL,
  periodo_fim TIMESTAMPTZ NOT NULL,
  total_leads INTEGER DEFAULT 0,
  leads_novos INTEGER DEFAULT 0,
  leads_contactados INTEGER DEFAULT 0,
  leads_erro INTEGER DEFAULT 0,
  enviado_para TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  erro TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relatorio_logs_tipo ON public.relatorio_logs (tipo);
CREATE INDEX IF NOT EXISTS idx_relatorio_logs_status ON public.relatorio_logs (status);
CREATE INDEX IF NOT EXISTS idx_relatorio_logs_criado_em ON public.relatorio_logs (criado_em);
