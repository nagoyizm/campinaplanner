-- Snyk: "Table X is public, but RLS has not been enabled" (SaaS tables)
-- La app accede via Prisma (rol postgres/owner), que NO se ve afectado por RLS.
-- Estas tablas no se usan via PostgREST, asi que se cierra el acceso anon/authenticated
-- habilitando RLS sin policies (deny all).
ALTER TABLE public."SaasEmail" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SaasConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SaasLead" ENABLE ROW LEVEL SECURITY;