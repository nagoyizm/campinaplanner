-- Snyk: "RLS enabled, but no policies exist"
-- La app solo accede via Prisma (rol postgres/owner, exento de RLS).
-- PostgREST no se usa: anon/authenticated deben quedar 100% bloqueados.
-- Policy con USING(false) satisface la regla (existe policy) sin abrir nada.
CREATE POLICY "block_all_saasconfig" ON public."SaasConfig"
  AS PERMISSIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "block_all_saasemail" ON public."SaasEmail"
  AS PERMISSIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "block_all_saaslead" ON public."SaasLead"
  AS PERMISSIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);