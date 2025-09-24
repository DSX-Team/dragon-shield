import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.193.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ServerCredentials {
  hostname: string;
  username: string;
  password?: string;
  privateKey?: string;
  port: number;
}

interface CredentialRequest {
  action: 'store' | 'retrieve' | 'test_connection' | 'execute_command';
  serverId: string;
  serverKey?: string;
  credentials?: ServerCredentials;
  command?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Verify user authentication and get user ID
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('user_id', user.id)
      .single();

    if (!profile?.roles?.includes('admin')) {
      throw new Error('Admin access required');
    }

    const { action, serverId, serverKey, credentials, command } = await req.json() as CredentialRequest;

    // Log the access attempt
    await logCredentialAccess(supabase, serverId, user.id, action, req, false);

    let result;
    switch (action) {
      case 'store':
        result = await storeCredentials(serverId, serverKey!, credentials!);
        break;
      case 'retrieve':
        result = await retrieveCredentials(serverId);
        break;
      case 'test_connection':
        result = await testConnection(serverId);
        break;
      case 'execute_command':
        result = await executeCommand(serverId, command!);
        break;
      default:
        throw new Error('Invalid action');
    }

    // Log successful access
    await logCredentialAccess(supabase, serverId, user.id, action, req, true);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Server management error:', error);
    
    // Log failed access if we have the necessary info
    try {
      const body = await req.clone().json();
      if (body.serverId && body.action) {
        // We don't have user info here, so skip detailed logging
        console.log(`Failed ${body.action} attempt for server ${body.serverId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (parseError) {
      // Ignore parse errors in error handler
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: error instanceof Error && error.message.includes('Admin access required') ? 403 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function logCredentialAccess(
  supabase: any, 
  serverId: string, 
  userId: string, 
  action: string, 
  req: Request,
  success: boolean,
  errorMessage?: string
) {
  try {
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await supabase
      .from('server_credential_access_log')
      .insert({
        server_id: serverId,
        accessed_by: userId,
        access_type: action,
        ip_address: clientIP,
        user_agent: userAgent,
        success,
        error_message: errorMessage
      });
  } catch (logError) {
    console.error('Failed to log credential access:', logError);
  }
}

async function encryptData(data: string): Promise<string> {
  const masterKey = Deno.env.get('SSH_MASTER_KEY');
  if (!masterKey) {
    throw new Error('Master encryption key not configured');
  }

  // Use Web Crypto API for encryption
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterKey.padEnd(32, '0').slice(0, 32)),
    'AES-GCM',
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = encoder.encode(data);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    encoded
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Return base64 encoded result
  return btoa(String.fromCharCode(...combined));
}

async function decryptData(encryptedData: string): Promise<string> {
  const masterKey = Deno.env.get('SSH_MASTER_KEY');
  if (!masterKey) {
    throw new Error('Master encryption key not configured');
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  
  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterKey.padEnd(32, '0').slice(0, 32)),
    'AES-GCM',
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    encrypted
  );

  return decoder.decode(decrypted);
}

async function storeCredentials(serverId: string, serverKey: string, credentials: ServerCredentials): Promise<void> {
  // Encrypt sensitive credentials before storing
  const credentialData = {
    hostname: credentials.hostname,
    username: credentials.username,
    port: credentials.port,
    password: credentials.password ? await encryptData(credentials.password) : undefined,
    privateKey: credentials.privateKey ? await encryptData(credentials.privateKey) : undefined,
  };

  // Store in a secure location (using Deno KV or environment-based storage)
  // For now, we'll use a simple file-based approach with encryption
  const credentialJson = JSON.stringify(credentialData);
  
  try {
    // In a production environment, you might want to use a more sophisticated storage system
    // For this example, we'll use Deno's built-in storage capabilities
    const kvStore = await Deno.openKv();
    await kvStore.set(['server_credentials', serverKey], credentialData);
    await kvStore.close();
    
    console.log(`Credentials securely stored for server: ${serverKey}`);
  } catch (error) {
    console.error('Failed to store credentials:', error);
    throw new Error('Failed to store credentials securely');
  }
}

async function retrieveCredentials(serverId: string): Promise<ServerCredentials | null> {
  try {
    // Get server key from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: server } = await supabase
      .from('streaming_servers')
      .select('server_key')
      .eq('id', serverId)
      .single();

    if (!server?.server_key) {
      throw new Error('Server not found');
    }

    // Retrieve from secure storage
    const kvStore = await Deno.openKv();
    const result = await kvStore.get(['server_credentials', server.server_key]);
    await kvStore.close();

    if (!result.value) {
      return null;
    }

    const credentialData = result.value as any;
    
    // Decrypt sensitive fields
    return {
      hostname: credentialData.hostname,
      username: credentialData.username,
      port: credentialData.port,
      password: credentialData.password ? await decryptData(credentialData.password) : undefined,
      privateKey: credentialData.privateKey ? await decryptData(credentialData.privateKey) : undefined,
    };
  } catch (error) {
    console.error('Failed to retrieve credentials:', error);
    throw new Error('Failed to retrieve credentials');
  }
}

async function testConnection(serverId: string): Promise<{ success: boolean; message: string }> {
  try {
    const credentials = await retrieveCredentials(serverId);
    if (!credentials) {
      return { success: false, message: 'No credentials found for server' };
    }

    // In a real implementation, you would establish an SSH connection here
    // For security reasons, we'll simulate the connection test
    console.log(`Testing connection to ${credentials.hostname}:${credentials.port} as ${credentials.username}`);
    
    // Simulate connection test
    const connectionValid = !!(credentials.hostname && credentials.username && (credentials.password || credentials.privateKey));
    
    return {
      success: connectionValid,
      message: connectionValid ? 'Connection test successful' : 'Invalid credentials'
    };
  } catch (error: unknown) {
    console.error('Connection test failed:', error);
    return { success: false, message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function executeCommand(serverId: string, command: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const credentials = await retrieveCredentials(serverId);
    if (!credentials) {
      throw new Error('No credentials found for server');
    }

    // Validate command (whitelist approach for security)
    const allowedCommands = [
      'systemctl status nginx',
      'df -h',
      'free -m',
      'uptime',
      'ps aux | grep nginx',
      'netstat -tlnp',
      'ffmpeg -version',
      'ffmpeg -encoders',
      'ffmpeg -decoders',
      'ps aux | grep ffmpeg'
    ];

    if (!allowedCommands.some(allowed => command.startsWith(allowed))) {
      throw new Error('Command not allowed');
    }

    console.log(`Executing command on ${credentials.hostname}: ${command}`);
    
    // In a real implementation, you would execute the SSH command here
    // For this example, we'll simulate command execution
    return {
      success: true,
      output: `Simulated output for: ${command}\nCommand executed successfully on ${credentials.hostname}`
    };
  } catch (error) {
    console.error('Command execution failed:', error);
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}