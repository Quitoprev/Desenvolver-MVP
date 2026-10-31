// Endereço e chave pública do seu projeto no Supabase.
// Onde achar: Supabase → Project Settings → API (ou Data API).
//   SUPABASE_URL      = "Project URL"
//   SUPABASE_ANON_KEY = chave "anon public" (ou "publishable")
// Essa chave é pública por natureza: quem protege os dados são as regras
// de acesso do banco (arquivo supabase/schema.sql). NUNCA coloque aqui a
// chave "service_role" ou "secret".
window.RYTHMOS_CONFIG = {
  SUPABASE_URL: "COLE_AQUI_A_PROJECT_URL",
  SUPABASE_ANON_KEY: "COLE_AQUI_A_ANON_KEY"
};
