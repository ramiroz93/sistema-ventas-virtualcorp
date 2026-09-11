// Edge Function: match-course
// Dado un curso de la tabla `ideas_cursos`, busca los CVs que mejor encajan
// por coincidencia de palabras clave (contra `cvs.texto_extraido`, vía la
// función de Postgres `match_cvs_por_palabras`). Guarda el resultado en
// `cv_matches`.
//
// Se dispara automáticamente vía el trigger `on_idea_curso_insertada`
// (después de insert en ideas_cursos), pero también se puede invocar a mano
// desde la app para recalcular matches (ej: después de cargar más CVs).
//
// Nota: se usó Voyage AI (embeddings + pgvector) para esto originalmente,
// pero los límites de la cuenta gratuita sin tarjeta trababan la búsqueda de
// forma impredecible. Se reemplazó por coincidencia de palabras clave
// (gratis, instantáneo, sin límite) -- el mismo criterio que ya se usaba
// para el campo "motivo".
//
// Body esperado: { "curso_id": "uuid" }
//
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ya están disponibles automáticamente)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MATCH_COUNT = 10;
const MIN_COINCIDENCIAS = 2; // mínimo de palabras clave del curso que deben aparecer en el CV

const STOPWORDS = new Set([
  'de','la','el','en','y','a','los','las','del','un','una','que','con','para','por','se','su','sus',
  'al','lo','como','mas','más','o','este','esta','estos','estas','son','es','ser','sobre','entre',
  'sin','desde','hasta','durante','muy','tambien','también','le','les','uno','unos','unas','tu','tus',
  'mi','mis','nuestro','nuestra','curso','area','área','tema','temas','años','año','vida','hoja',
  'nombre','datos','general','completo','curriculum','vitae',
]);

function quitarAcentos(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Extrae palabras clave "significativas" del texto del curso (nombre original,
// con tildes -- el acento-insensible lo maneja unaccent() en el lado de Postgres).
function extraerPalabrasClave(texto: string): Map<string, string> {
  const map = new Map<string, string>();
  const matches = texto.match(/[A-Za-zÀ-ÿ0-9]+/g) || [];
  for (const original of matches) {
    const norm = quitarAcentos(original).toLowerCase();
    if (norm.length < 4 || STOPWORDS.has(norm) || map.has(norm)) continue;
    map.set(norm, original);
  }
  return map;
}

const MAX_KEYWORDS_MOTIVO = 6;

// Solo se llama sobre el puñado de CVs que ya ganaron el ranking -- acá sí es
// barato buscar cuáles palabras puntuales aparecieron, para mostrarlas
// (y para que el usuario pueda marcar una como "demasiado genérica").
function palabrasEncontradasEn(palabrasCurso: Map<string, string>, textoCv: string): string[] {
  const cvNorm = quitarAcentos(textoCv).toLowerCase();
  const encontradas: string[] = [];
  for (const [norm, original] of palabrasCurso) {
    if (encontradas.length >= MAX_KEYWORDS_MOTIVO) break;
    const re = new RegExp('\\b' + norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
    if (re.test(cvNorm)) encontradas.push(original);
  }
  return encontradas;
}

function construirMotivo(encontradas: string[]): string {
  return encontradas.length
    ? 'Coincidencias encontradas en el CV: ' + encontradas.join(', ') + '.'
    : 'Sin coincidencias literales de palabras clave destacadas.';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { curso_id } = await req.json();
    if (!curso_id) {
      return new Response(JSON.stringify({ error: 'Falta curso_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: curso, error: cursoErr } = await admin
      .from('ideas_cursos')
      .select('id, nombre, detalle, contenido')
      .eq('id', curso_id)
      .single();
    if (cursoErr || !curso) throw cursoErr || new Error('Curso no encontrado');

    // Palabras que ya se marcaron como "demasiado genéricas" (aprendizaje por
    // feedback: se descartan para siempre, en todos los cursos).
    const { data: descartadasData } = await admin.from('palabras_descartadas').select('palabra_norm');
    const descartadas = new Set((descartadasData || []).map((d: { palabra_norm: string }) => d.palabra_norm));

    // CVs ya rechazados manualmente para ESTE curso -- no volver a sugerirlos.
    const { data: rechazadosData } = await admin.from('cv_matches_rechazados').select('cv_id').eq('curso_id', curso_id);
    const excluirIds = (rechazadosData || []).map((r: { cv_id: string }) => r.cv_id);

    // Título + descripción + contenido técnico -- las palabras genéricas que
    // puedan colarse desde el título/descripción se filtran con la lista de
    // "palabras_descartadas" (feedback del usuario), no excluyendo el campo entero.
    const textoCursoCompleto = [curso.nombre, curso.detalle, curso.contenido].filter(Boolean).join('\n\n');
    const palabrasCursoTodas = extraerPalabrasClave(textoCursoCompleto);
    // Tope de palabras clave: cursos con contenido muy largo generaban un
    // patrón de búsqueda enorme que, con miles de CVs cargados, hacía dar
    // timeout. Con 40 palabras significativas alcanza y sobra para un buen match.
    const MAX_PALABRAS_MATCH = 25;
    const palabrasCurso = new Map([...palabrasCursoTodas].filter(([norm]) => !descartadas.has(norm)).slice(0, MAX_PALABRAS_MATCH));
    const palabras = Array.from(palabrasCurso.values());

    if (!palabras.length) {
      await admin.from('cv_matches').delete().eq('curso_id', curso_id);
      return new Response(
        JSON.stringify({ curso_id, matches_encontrados: 0, aviso: 'El curso no tiene palabras clave suficientes en su contenido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: matches, error: matchErr } = await admin.rpc('match_cvs_por_palabras', {
      palabras,
      top_n: MATCH_COUNT,
      min_coincidencias: MIN_COINCIDENCIAS,
      excluir_ids: excluirIds,
    });
    if (matchErr) throw matchErr;

    const totalPalabras = palabras.length;
    const idsCv = (matches || []).map((m: { id: string }) => m.id);
    const { data: cvsData } = idsCv.length
      ? await admin.from('cvs').select('id, texto_extraido').in('id', idsCv)
      : { data: [] as { id: string; texto_extraido: string | null }[] };
    const textoPorCv = new Map((cvsData || []).map((c: { id: string; texto_extraido: string | null }) => [c.id, c.texto_extraido || '']));

    const filas = (matches || []).map((m: { id: string; coincidencias: number }) => {
      const encontradas = palabrasEncontradasEn(palabrasCurso, textoPorCv.get(m.id) || '');
      return {
        curso_id,
        cv_id: m.id,
        similarity_score: Math.min(1, m.coincidencias / totalPalabras),
        palabras_encontradas: encontradas,
        motivo: construirMotivo(encontradas),
      };
    });

    // Reemplazo completo: se borran los matches viejos de este curso y se
    // insertan los nuevos (evita que queden matches obsoletos mezclados).
    await admin.from('cv_matches').delete().eq('curso_id', curso_id);
    if (filas.length > 0) {
      const { error: insErr } = await admin.from('cv_matches').insert(filas);
      if (insErr) throw insErr;
    }

    return new Response(
      JSON.stringify({ curso_id, matches_encontrados: filas.length, palabras_clave_usadas: palabras }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const err = e as { message?: string; details?: string; hint?: string; code?: string };
    return new Response(JSON.stringify({
      error: err?.message || String(e),
      details: err?.details,
      hint: err?.hint,
      code: err?.code,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
