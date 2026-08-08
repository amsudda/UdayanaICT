-- ============================================================
-- Add 'stream' column to profiles table
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stream text;
