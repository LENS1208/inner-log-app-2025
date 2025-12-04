const ACTIVE_DB = 'xjviqzyhephwkytwjmwd';
const DEPRECATED_DBS = ['zvtlebplabacvijmayyg'];

export function validateEnvironment() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('❌ Supabase environment variables are missing!');
  }

  // Check for deprecated/old databases
  const deprecatedDb = DEPRECATED_DBS.find(db => url.includes(db));
  if (deprecatedDb) {
    console.error('');
    console.error('🚨 ========================================== 🚨');
    console.error('🚨  CRITICAL: WRONG DATABASE DETECTED!');
    console.error('🚨 ========================================== 🚨');
    console.error('');
    console.error('❌ You are connected to an OLD/DEPRECATED database:');
    console.error('   Current:', deprecatedDb);
    console.error('');
    console.error('✅ Expected database:', ACTIVE_DB);
    console.error('');
    console.error('💡 Action required:');
    console.error('   Update your .env file with the correct database credentials');
    console.error('');
    console.error('🚨 ========================================== 🚨');
    console.error('');

    // Show a visual alert in the browser
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        alert(
          '🚨 WRONG DATABASE!\n\n' +
          `You are connected to: ${deprecatedDb}\n` +
          `Expected: ${ACTIVE_DB}\n\n` +
          'Please update your .env file!'
        );
      }, 1000);
    }
  }

  if (!url.includes(ACTIVE_DB)) {
    console.warn('⚠️ WARNING: Unexpected database detected');
    console.warn('Current URL:', url);
    console.warn('Expected database ID:', ACTIVE_DB);
  } else {
    console.log('✅ Environment validation passed');
    console.log('✅ Connected to active database:', ACTIVE_DB);
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
