
-- Function to get the start of the current week (Monday)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.current_week_start()
RETURNS DATE
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT date_trunc('week', CURRENT_DATE)::date;
$$;

-- Insert default admin user (usuario: estrafi, PIN: 950915)
INSERT INTO public.usuarios (id, name, usuario, pin_hash)
VALUES (
  gen_random_uuid(),
  'Administrador',
  'estrafi',
  crypt('950915', gen_salt('bf'))
) ON CONFLICT (usuario) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.usuarios
WHERE usuario = 'estrafi'
ON CONFLICT (user_id, role) DO NOTHING;

-- Function to hash a PIN using pgcrypto

CREATE OR REPLACE FUNCTION public.hash_pin(_pin TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT crypt(_pin, gen_salt('bf'));
$$;

-- This funcion to verify PIN

CREATE OR REPLACE FUNCTION public.verify_pin(_pin TEXT, _pin_hash TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _pin_hash = crypt(_pin, _pin_hash);
$$;

-- Add subsetor_id and coordenador_id to tarefas_concluidas_historico
-- Existing rows will have NULL for these columns, which is acceptable for historical data
ALTER TABLE public.tarefas_concluidas_historico
  ADD COLUMN IF NOT EXISTS subsetor_id UUID REFERENCES public.subsetores(id),
  ADD COLUMN IF NOT EXISTS coordenador_id UUID REFERENCES public.coordenadores(id);
