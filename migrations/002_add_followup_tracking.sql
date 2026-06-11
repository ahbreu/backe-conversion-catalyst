-- Migration: Add follow-up tracking columns to leads_site table
-- Purpose: Support automated WhatsApp follow-up sequence for leads without response
-- Date: 2026-05-21

-- Add followup_count column to track number of follow-up attempts (max 2)
ALTER TABLE public.leads_site 
ADD COLUMN IF NOT EXISTS followup_count INTEGER DEFAULT 0;

-- Add last_followup_at column to track when the last follow-up was sent
ALTER TABLE public.leads_site 
ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMPTZ;

-- Add last_response_at column to track when the lead last responded (used for 24h silence detection)
-- NOTE: This column must be populated by a WhatsApp response webhook/flow (see BAC-47 dependency)
ALTER TABLE public.leads_site 
ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMPTZ;

-- Add empresa column for personalized follow-up messages
ALTER TABLE public.leads_site 
ADD COLUMN IF NOT EXISTS empresa TEXT;

-- Add index for faster querying of leads eligible for follow-up
CREATE INDEX IF NOT EXISTS idx_leads_site_followup 
ON public.leads_site (status, followup_count, created_at)
WHERE status IN ('whatsapp_enviado', 'recebido') AND followup_count < 2;

-- Add comment for documentation
COMMENT ON COLUMN public.leads_site.followup_count IS 'Number of follow-up attempts sent to this lead (max 2)';
COMMENT ON COLUMN public.leads_site.last_followup_at IS 'Timestamp of the last follow-up message sent';
COMMENT ON COLUMN public.leads_site.last_response_at IS 'Timestamp of the last lead response via WhatsApp - must be updated by response tracking flow';
COMMENT ON COLUMN public.leads_site.empresa IS 'Company name for personalized follow-up messages';
