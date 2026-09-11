// Edge Function: link-login
// Recibe un link_token de la tabla `usuarios` y devuelve un token_hash
// que el cliente puede canjear con supabase.auth.verifyOtp() para obtener
// una sesión real de Supabase Auth (con auth.uid() válido para las RLS).
//
// Deploy: pegar este código en Supabase Dashboard > Edge Functions > Create a function
// (nombre de la función: link-login) o con la CLI: supabase functions deploy link-login
//
// No hace falta configurar secretos: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
// ya están disponibles automáticamente dentro de cualquier Edge Function.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Falta token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: usuario, error: errUsuario } = await admin
      .from('usuarios')
      .select('id, activo')
      .eq('link_token', token)
      .eq('activo', true)
      .maybeSingle();

    if (errUsuario || !usuario) {
      return new Response(JSON.stringify({ error: 'Link inválido o usuario inactivo' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: authUser, error: errAuth } = await admin.auth.admin.getUserById(usuario.id);
    if (errAuth || !authUser?.user?.email) {
      return new Response(JSON.stringify({ error: 'Usuario sin cuenta de acceso' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: linkData, error: errLink } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.user.email,
    });

    if (errLink || !linkData?.properties?.hashed_token) {
      return new Response(JSON.stringify({ error: 'No se pudo generar sesión' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ token_hash: linkData.properties.hashed_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
