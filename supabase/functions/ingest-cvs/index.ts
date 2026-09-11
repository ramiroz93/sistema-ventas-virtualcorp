// Edge Function: ingest-cvs
// Lee los archivos nuevos de una carpeta de Google Drive (compartida con una
// cuenta de servicio), extrae su texto y lo guarda en la tabla `cvs`. El
// matching contra cursos (match-course) y la búsqueda de CVs se hacen por
// coincidencia de palabras clave directo en Postgres -- no hace falta
// generar ningún embedding acá (se sacó la dependencia de Voyage AI por sus
// límites de la cuenta gratuita, que trababan la ingesta de forma imprevisible).
//
// Extracción de texto (en el momento, sin depender de nada externo salvo la
// descarga del archivo):
//   - PDF  -> unpdf (envuelve PDF.js). Probado en este mismo entorno con un
//             CV real: funciona.
//   - DOCX -> es un .zip con XML adentro; se descomprime con JSZip y se lee
//             el texto de word/document.xml. Probado con un CV real: funciona.
//   - DOC (formato binario viejo de Word), o cualquier PDF/imagen escaneada
//     sin capa de texto -> no hay método gratuito confiable, queda marcado
//     como "sin_texto_extraido" (no se pierde el archivo, solo no entra al
//     matching semántico).
//
// Se descartó "copiar el archivo y convertirlo a Google Doc" (usando la
// propia API de Drive) porque las cuentas de servicio NO tienen cuota de
// almacenamiento propia en Drive: cualquier archivo que crean (como esa
// copia) es rechazado con "storageQuotaExceeded", salvo que sea una cuenta
// de Google Workspace con Shared Drives. No es nuestro caso.
//
// Cuando un CV se procesa con éxito (texto + embedding), se mueve dentro de
// Drive a la subcarpeta "YA LEIDOS PARA TARTAREK" (GOOGLE_DRIVE_DONE_FOLDER_ID)
// para que quede visible a simple vista qué ya se procesó. Requiere que la
// cuenta de servicio tenga permiso de Editor (no solo Lector) en la carpeta.
//
// Secretos necesarios (Settings > Edge Functions > Secrets):
//   GOOGLE_SERVICE_ACCOUNT_JSON  -- contenido completo del JSON de la cuenta de servicio
//   GOOGLE_DRIVE_FOLDER_ID       -- ID de la carpeta de Drive con los CVs
//   GOOGLE_DRIVE_DONE_FOLDER_ID  -- ID de la subcarpeta "YA LEIDOS PARA TARTAREK"
// (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya están disponibles automáticamente)
//
// Deploy: supabase functions deploy ingest-cvs --project-ref <ref>
// Invocar: POST a la URL de la función (opcionalmente ?limit=N, default 15)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { extractText as extractPdfText, getDocumentProxy } from 'https://esm.sh/unpdf@latest';
import JSZip from 'https://esm.sh/jszip@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'; // lectura + escritura (mover archivos ya procesados)
const MIN_TEXT_LEN = 50; // por debajo de esto, se considera "sin texto extraído"
const BATCH_DEFAULT = 30; // sin límite de Voyage de por medio, se puede procesar bastante más por corrida
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB -- por arriba de esto, casi seguro es un escaneo/fotos y además rompe la memoria de la función

const MIME_PDF = 'application/pdf';
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function b64url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let str = '';
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToDer(pem: string): Uint8Array {
  const b64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function getDriveAccessToken(): Promise<string> {
  const sa = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')!);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: DRIVE_SCOPE,
    aud: sa.token_uri,
    exp: now + 3600,
    iat: now,
  };
  const encHeader = b64url(new TextEncoder().encode(JSON.stringify(header)).buffer);
  const encClaims = b64url(new TextEncoder().encode(JSON.stringify(claims)).buffer);
  const signingInput = `${encHeader}.${encClaims}`;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const jwt = `${signingInput}.${b64url(signature)}`;

  const resp = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error('No se pudo obtener token de Google: ' + JSON.stringify(data));
  return data.access_token;
}

async function listDriveFiles(token: string, folderId: string) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size)&pageSize=1000`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await resp.json();
  if (!resp.ok) throw new Error('Error listando Drive: ' + JSON.stringify(data));
  return data.files as { id: string; name: string; mimeType: string; size?: string }[];
}

async function downloadDriveFile(token: string, fileId: string): Promise<ArrayBuffer> {
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error('Error descargando archivo: ' + (await resp.text()));
  return await resp.arrayBuffer();
}

// Normaliza un nombre de archivo para comparar (sin tildes, mayúsculas,
// extensión, ni sufijos como "(1)") y así detectar posibles duplicados aunque
// el nombre no sea idéntico letra por letra.
function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\.(pdf|docx?|doc)$/i, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Versión normalizada (sin tildes, minúscula, recortada) del texto extraído,
// calculada UNA sola vez acá para que el matching (match_cvs_por_palabras) no
// tenga que recalcularla en cada búsqueda -- con miles de CVs cargados eso
// era lo que hacía que las búsquedas se volvieran lentas hasta dar timeout.
const TEXTO_NORM_MAX_CHARS = 4000;
function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().slice(0, TEXTO_NORM_MAX_CHARS);
}

function extractTextFromDocumentXml(xml: string): string {
  const withBreaks = xml.replace(/<\/w:p>/g, '\n');
  const matches = [...withBreaks.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
  return matches.map((m) => m[1]).join('');
}

async function extractDocxText(buf: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) return '';
  return extractTextFromDocumentXml(docXml);
}

async function extractPdfTextSafe(buf: ArrayBuffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const result = await extractPdfText(pdf, { mergePages: true });
    return (result.text || '').toString();
  } catch {
    return '';
  }
}

async function moveDriveFile(token: string, fileId: string, fromFolder: string, toFolder: string): Promise<void> {
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${toFolder}&removeParents=${fromFolder}`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resp.ok) throw new Error('Error moviendo archivo: ' + (await resp.text()));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '') || BATCH_DEFAULT;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const folderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')!;
    const token = await getDriveAccessToken();

    const files = await listDriveFiles(token, folderId);

    // Paginado a propósito: por defecto Supabase/PostgREST corta las
    // consultas en 1000 filas -- con miles de CVs ya cargados, traer todo de
    // una sola vez dejaba la lista incompleta y el sistema volvía a intentar
    // insertar CVs que ya existían (choque con la restricción de duplicados).
    const existentes: { id: string; drive_file_id: string; nombre_archivo: string }[] = [];
    const PAGE_SIZE = 1000;
    for (let desde = 0; ; desde += PAGE_SIZE) {
      const { data: pagina, error: selErr } = await admin
        .from('cvs')
        .select('id, drive_file_id, nombre_archivo')
        .range(desde, desde + PAGE_SIZE - 1);
      if (selErr) throw selErr;
      existentes.push(...(pagina || []));
      if (!pagina || pagina.length < PAGE_SIZE) break;
    }
    const yaProcesados = new Set(existentes.map((r) => r.drive_file_id));

    // Mapa nombre normalizado -> id, para detectar posibles duplicados por nombre parecido
    const nombresConocidos = new Map<string, string>();
    (existentes || []).forEach((r: { id: string; nombre_archivo: string }) => {
      nombresConocidos.set(normalizarNombre(r.nombre_archivo), r.id);
    });

    const pendientes = files.filter((f) => !yaProcesados.has(f.id)).slice(0, limit);

    let ok = 0, sinTexto = 0, errores = 0, duplicados = 0;
    const detalleErrores: string[] = [];

    for (const file of pendientes) {
      try {
        let texto = '';
        const tamano = parseInt(file.size || '0', 10);

        if (tamano > MAX_FILE_SIZE_BYTES) {
          // Archivo demasiado pesado (casi siempre fotos/escaneos de alta
          // resolución) -- ni se intenta descargar/parsear, porque satura la
          // memoria de la función. Queda marcado como sin texto extraído.
          texto = '';
        } else if (file.mimeType === MIME_PDF) {
          const buf = await downloadDriveFile(token, file.id);
          texto = await extractPdfTextSafe(buf);
        } else if (file.mimeType === MIME_DOCX) {
          const buf = await downloadDriveFile(token, file.id);
          texto = await extractDocxText(buf);
        } else {
          // .doc u otro formato sin soporte gratuito de extracción
          texto = '';
        }
        // Postgres no admite el caracter nulo (ni otros caracteres de control) en columnas
        // de texto -- algunos PDF/DOCX mal formados los dejan colados en la
        // extracción y rompen el insert si no se limpian antes.
        texto = texto.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();

        const estado = texto.length >= MIN_TEXT_LEN ? 'ok' : 'sin_texto_extraido';

        const nombreNorm = normalizarNombre(file.name);
        const posibleDuplicadoDe = nombresConocidos.get(nombreNorm) || null;

        const { data: nuevaFila, error: insErr } = await admin.from('cvs').insert({
          drive_file_id: file.id,
          drive_file_url: `https://drive.google.com/file/d/${file.id}/view`,
          nombre_archivo: file.name,
          texto_extraido: estado === 'ok' ? texto : null,
          texto_norm: estado === 'ok' ? normalizarTexto(texto) : null,
          estado_extraccion: estado,
          posible_duplicado_de: posibleDuplicadoDe,
        }).select('id').single();
        if (insErr) {
          if (insErr.code === '23505') {
            // Otra corrida (el cron u otra invocación en paralelo) ya insertó
            // este mismo archivo entre que se listó y que se intentó guardar.
            // No es un error real, solo una carrera inofensiva -- se saltea.
            continue;
          }
          throw insErr;
        }

        if (!posibleDuplicadoDe) nombresConocidos.set(nombreNorm, nuevaFila.id);
        else duplicados++;

        if (estado === 'ok') {
          ok++;
          const doneFolderId = Deno.env.get('GOOGLE_DRIVE_DONE_FOLDER_ID');
          if (doneFolderId) {
            try {
              await moveDriveFile(token, file.id, folderId, doneFolderId);
            } catch (moveErr) {
              console.error('CV guardado pero no se pudo mover en Drive:', file.name, moveErr);
            }
          }
        } else {
          sinTexto++;
        }
      } catch (e) {
        errores++;
        const err = e as { message?: string; details?: string; hint?: string; code?: string };
        const msg = err?.message || String(e);
        detalleErrores.push(`${file.name}: ${msg}${err?.details ? ' | details: ' + err.details : ''}${err?.code ? ' | code: ' + err.code : ''}`);
        console.error('Error procesando', file.name, e);
      }
    }

    return new Response(
      JSON.stringify({
        pendientes_en_carpeta_origen: files.length,
        procesados_ahora: pendientes.length,
        ok,
        sin_texto_extraido: sinTexto,
        posibles_duplicados: duplicados,
        errores,
        detalle_errores: detalleErrores,
        restantes: files.length - pendientes.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
