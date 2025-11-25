const ACTIVE_DB = 'xjviqzyhephwkytwjmwd';

export function validateEnvironment() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('❌ Supabase environment variables are missing!');
  }

  if (!url.includes(ACTIVE_DB)) {
    console.warn('⚠️ WARNING: Unexpected database detected');
    console.warn('Current URL:', url);
    console.warn('Active database ID:', ACTIVE_DB);
  } else {
    console.log('✅ Environment validation passed');
    console.log('Database:', ACTIVE_DB);
  }

  return {
    url,
    anonKey,
    isValid: true,
  };
}

export function getEnvironmentInfo() {
  const url = import.meta.env.VITE_SUPABASE_URL || 'NOT_SET';
  const dbId = url.match(/https:\/\/([^.]+)/)?.[1] || 'unknown';

  return {
    databaseId: dbId,
    isExpected: dbId === ACTIVE_DB,
    fullUrl: url,
  };
}
