const requiredOnServer = ['SUPABASE_URL'] as const;

export function getServerEnv() {
  for (const key of requiredOnServer) {
    if (!process.env[key]) {
      throw new Error(`Missing environment variable: ${key}`);
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL as string;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!supabaseKey) {
    throw new Error('Missing SUPABASE key (SERVICE_ROLE_KEY, SERVICE_KEY or ANON_KEY)');
  }

  return { supabaseUrl, supabaseKey };
}
