// Dragon Shield Configuration Management
// Handles environment-specific configuration for portability

interface DatabaseConfig {
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

interface SupabaseConfig {
  url?: string;
  anonKey?: string;
  serviceKey?: string;
}

interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  database: DatabaseConfig;
  supabase?: SupabaseConfig;
  auth: {
    jwtSecret?: string;
    sessionTimeout: number;
  };
  streaming: {
    maxConcurrentStreams: number;
    defaultQuality: string;
    bufferSize: number;
  };
  features: {
    multiStream: boolean;
    plugins: boolean;
    transcoding: boolean;
  };
}

// Default configuration
const defaultConfig: AppConfig = {
  name: 'Dragon Shield IPTV',
  version: '1.0.0',
  environment: 'development',
  database: {
    host: 'localhost',
    port: 5432,
    database: 'dragon_shield',
    username: 'postgres',
    password: 'dragon_shield_pass'
  },
  auth: {
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  streaming: {
    maxConcurrentStreams: 3,
    defaultQuality: '720p',
    bufferSize: 30
  },
  features: {
    multiStream: true,
    plugins: true,
    transcoding: true
  }
};

// Runtime configuration detection
const getConfig = (): AppConfig => {
  // Check if we're in a Supabase environment
  const supabaseUrl = window.location.hostname.includes('supabase') || 
                     window.location.hostname.includes('lovable') ||
                     typeof window !== 'undefined' && (window as any).SUPABASE_URL;
  
  const config = { ...defaultConfig };
  
  if (supabaseUrl || process.env.NODE_ENV === 'development') {
    // Supabase/Lovable environment - use existing configuration
    config.supabase = {
      url: "https://ccibslznriatjflaknso.supabase.co",
      anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjaWJzbHpucmlhdGpmbGFrbnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MDk3MzUsImV4cCI6MjA3NDI4NTczNX0.VyCuJedGU6sb4D7_tuUedHv7O0YNgzchovKpiThxseU"
    };
  } else {
    // Self-hosted environment - use environment variables or defaults
    const envConfig = getEnvironmentConfig();
    Object.assign(config, envConfig);
  }
  
  return config;
};

// Parse environment variables (for self-hosted deployments)
const getEnvironmentConfig = (): Partial<AppConfig> => {
  const env = typeof window !== 'undefined' ? (window as any).ENV : process.env;
  
  if (!env) return {};
  
  return {
    environment: env.NODE_ENV || 'production',
    database: {
      host: env.DB_HOST || 'localhost',
      port: parseInt(env.DB_PORT || '5432'),
      database: env.DB_NAME || 'dragon_shield',
      username: env.DB_USER || 'postgres',
      password: env.DB_PASSWORD,
      url: env.DATABASE_URL
    },
    supabase: env.SUPABASE_URL ? {
      url: env.SUPABASE_URL,
      anonKey: env.SUPABASE_ANON_KEY,
      serviceKey: env.SUPABASE_SERVICE_ROLE_KEY
    } : undefined,
    auth: {
      jwtSecret: env.JWT_SECRET,
      sessionTimeout: parseInt(env.SESSION_TIMEOUT || '604800000') // 7 days default
    },
    streaming: {
      maxConcurrentStreams: parseInt(env.MAX_CONCURRENT_STREAMS || '3'),
      defaultQuality: env.DEFAULT_VIDEO_QUALITY || '720p',
      bufferSize: parseInt(env.STREAM_BUFFER_SIZE || '30')
    }
  };
};

// Export configuration
export const config = getConfig();

// Helper functions
export const isSupabaseEnvironment = () => !!config.supabase;
export const isSelfHosted = () => !isSupabaseEnvironment();
export const isDevelopment = () => config.environment === 'development';
export const isProduction = () => config.environment === 'production';

// Database connection helper
export const getDatabaseUrl = () => {
  if (config.database.url) {
    return config.database.url;
  }
  
  const { host, port, database, username, password } = config.database;
  return `postgresql://${username}:${password}@${host}:${port}/${database}`;
};

// Feature flags
export const features = {
  isMultiStreamEnabled: () => config.features.multiStream,
  arePluginsEnabled: () => config.features.plugins,
  isTranscodingEnabled: () => config.features.transcoding,
};

export default config;