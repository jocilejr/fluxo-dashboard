import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const functionName = pathParts[0];

  // Lista de funções disponíveis
  const availableFunctions = [
    'webhook-receiver',
    'webhook-groups', 
    'webhook-abandoned',
    'typebot-stats',
    'admin-create-user',
    'admin-delete-user',
    'admin-reset-password',
    'setup-totp',
    'verify-totp',
    'delivery-access',
    'pdf-proxy'
  ];

  // Health check / root
  if (!functionName || functionName === 'main' || functionName === 'health') {
    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        message: 'Supabase Edge Functions Running',
        available_functions: availableFunctions,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }

  // Verifica se a função existe na lista
  if (!availableFunctions.includes(functionName)) {
    return new Response(
      JSON.stringify({ 
        error: 'Function not found',
        function: functionName,
        available: availableFunctions
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404 
      }
    );
  }

  try {
    // Dynamic import da função
    const functionModule = await import(`../${functionName}/index.ts`);
    
    // Cria uma nova URL para a função com o path restante
    const newUrl = new URL(req.url);
    newUrl.pathname = '/' + pathParts.slice(1).join('/');
    
    // Cria novo request com a URL modificada
    const newRequest = new Request(newUrl.toString(), {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });
    
    // Se a função exporta um handler default
    if (typeof functionModule.default === 'function') {
      return await functionModule.default(newRequest);
    }
    
    // Se a função usa serve() pattern, ela já está servindo
    // Retorna erro se não conseguiu processar
    return new Response(
      JSON.stringify({ error: 'Function handler not found' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error loading function ${functionName}:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Function error',
        function: functionName,
        message: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
