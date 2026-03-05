-- Migration: Add address column to clients table
-- This allows storing client mailing/billing address

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS address text;

COMMENT ON COLUMN public.clients.address IS 'Mailing or billing address for this client';
