-- DEVELOPER must have the same backend permissions as ADMIN.
-- This migration updates the requested profile type.
UPDATE usuarios
SET tipo = 'DEVELOPER'
WHERE usuario = 'estrafi';
