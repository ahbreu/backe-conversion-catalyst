-- Migration: 001_create_prospectos_table
-- Description: Cria a tabela de prospectos para o workflow de prospeccao semanal
-- Date: 2026-05-19
-- Workflow: backe-prospeccao-semanal.json

CREATE TABLE IF NOT EXISTS public.prospectos (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  empresa TEXT,
  nicho TEXT,
  origem TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'novo',
  ultima_prospeccao TIMESTAMPTZ,
  erro_envio TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospectos_status ON public.prospectos (status);
CREATE INDEX IF NOT EXISTS idx_prospectos_telefone ON public.prospectos (telefone);
CREATE INDEX IF NOT EXISTS idx_prospectos_ultima_prospeccao ON public.prospectos (ultima_prospeccao);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prospectos_updated_at ON public.prospectos;

CREATE TRIGGER trg_prospectos_updated_at
  BEFORE UPDATE ON public.prospectos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
