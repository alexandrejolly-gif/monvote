import crypto from 'crypto';
import sharp from 'sharp';

// ============ CONFIGURATION ============
const RATE_LIMITS = {
  upload_tract: {
    per_ip: { count: 5, window_hours: 24 },
    per_fingerprint: { count: 3, window_hours: 24 },
    per_commune: { count: 10, window_hours: 24 }
  },
  quiz_complete: {
    per_ip: { count: 50, window_hours: 24 }
  },
  candidat_search: {
    per_ip: { count: 100, window_hours: 24 }
  }
};

// ============ HASHING ============
export function hashIdentifier(value) {
  const salt = process.env.RATE_LIMIT_SALT || 'default-salt-change-me';
  return crypto
    .createHash('sha256')
    .update(value + salt)
    .digest('hex');
}

// ============ RATE LIMITING ============
export async function checkRateLimit(supabase, { ip, fingerprint, commune, action }) {
  const limits = RATE_LIMITS[action];
  if (!limits) {
    console.log(`⚠️  No rate limit configured for action: ${action}`);
    return { blocked: false };
  }

  const now = new Date();

  // Vérifier chaque type de limite
  const checks = [
    { type: 'ip', value: ip, limit: limits.per_ip },
    { type: 'fingerprint', value: fingerprint, limit: limits.per_fingerprint },
    { type: 'commune', value: commune, limit: limits.per_commune }
  ];

  for (const check of checks) {
    if (!check.value || !check.limit) continue;

    const hash = hashIdentifier(check.value);
    const windowStart = new Date(now - check.limit.window_hours * 60 * 60 * 1000);

    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('count, window_start, updated_at')
        .eq('identifier_type', check.type)
        .eq('identifier_hash', hash)
        .eq('action_type', action)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows, c'est OK
        console.error('Rate limit check error:', error);
        continue;
      }

      if (data && new Date(data.window_start) > windowStart) {
        // Dans la fenêtre active
        if (data.count >= check.limit.count) {
          console.log(`🚫 Rate limit exceeded for ${check.type} on action ${action}`);
          return {
            blocked: true,
            reason: `Limite atteinte (${check.type}: ${data.count}/${check.limit.count})`,
            retry_after: check.limit.window_hours * 3600,
            limit_type: check.type
          };
        }

        // Incrémenter le compteur
        await supabase
          .from('rate_limits')
          .update({
            count: data.count + 1,
            updated_at: now.toISOString()
          })
          .eq('identifier_type', check.type)
          .eq('identifier_hash', hash)
          .eq('action_type', action);

      } else {
        // Nouvelle fenêtre ou pas de données
        await supabase
          .from('rate_limits')
          .upsert({
            identifier_type: check.type,
            identifier_hash: hash,
            action_type: action,
            count: 1,
            window_start: now.toISOString(),
            updated_at: now.toISOString()
          }, {
            onConflict: 'identifier_type,identifier_hash,action_type'
          });
      }
    } catch (error) {
      console.error(`Rate limit error for ${check.type}:`, error.message);
      // En cas d'erreur, on laisse passer (fail open)
      continue;
    }
  }

  return { blocked: false };
}

// ============ HASH PERCEPTUEL ANTI-DOUBLON ============
export async function computePerceptualHash(imageBuffer) {
  try {
    // Redimensionner à 8x8 et convertir en niveaux de gris
    const resized = await sharp(imageBuffer)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    const pixels = Array.from(resized);
    const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;

    // Créer un hash binaire
    let hash = '';
    for (const pixel of pixels) {
      hash += pixel > avg ? '1' : '0';
    }

    // Convertir en hexadécimal
    return parseInt(hash, 2).toString(16).padStart(16, '0');
  } catch (error) {
    console.error('Perceptual hash error:', error);
    throw new Error('Impossible de calculer le hash perceptuel');
  }
}

export async function checkDuplicateHash(supabase, imageHash, communeCode) {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('id, image_hash, created_at')
      .eq('commune_code', communeCode)
      .in('status', ['approved', 'auto_approved'])
      .not('image_hash', 'is', null);

    if (error) {
      console.error('Duplicate check error:', error);
      return { isDuplicate: false };
    }

    for (const sub of data || []) {
      if (!sub.image_hash) continue;

      const distance = hammingDistance(imageHash, sub.image_hash);

      if (distance < 5) {
        console.log(`🔍 Duplicate detected: distance=${distance}`);
        return {
          isDuplicate: true,
          existingId: sub.id,
          existingDate: sub.created_at,
          hammingDistance: distance
        };
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Duplicate hash check error:', error);
    return { isDuplicate: false };
  }
}

function hammingDistance(h1, h2) {
  try {
    const b1 = parseInt(h1, 16).toString(2).padStart(64, '0');
    const b2 = parseInt(h2, 16).toString(2).padStart(64, '0');
    let d = 0;
    for (let i = 0; i < 64; i++) {
      if (b1[i] !== b2[i]) d++;
    }
    return d;
  } catch (error) {
    console.error('Hamming distance error:', error);
    return 999; // Distance maximale en cas d'erreur
  }
}

// ============ PARTAGE SÉCURISÉ ============
export function generateShareUrl(sessionId, topResult) {
  const payload = {
    sid: sessionId,
    ts: Date.now(),
    top: topResult.candidat.nom,
    score: topResult.score
  };

  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const secret = process.env.SHARE_SECRET || 'default-share-secret-change-me';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex')
    .slice(0, 16);

  return {
    url: `/r/${data}?s=${signature}`,
    token: data,
    signature
  };
}

export function verifyShareUrl(data, signature) {
  try {
    const secret = process.env.SHARE_SECRET || 'default-share-secret-change-me';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex')
      .slice(0, 16);

    if (signature !== expected) {
      return { valid: false, error: 'Signature invalide' };
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());

    // Vérifier l'expiration (7 jours)
    if (Date.now() - payload.ts > 7 * 24 * 60 * 60 * 1000) {
      return { valid: false, error: 'Lien expiré (> 7 jours)' };
    }

    return { valid: true, payload };
  } catch (error) {
    console.error('Share URL verification error:', error);
    return { valid: false, error: 'Lien invalide' };
  }
}

// ============ AUDIT LOG ============
export async function logAudit(supabase, action, details = {}, context = {}) {
  try {
    const { error } = await supabase
      .from('audit_log')
      .insert({
        action,
        entity_type: details.entity_type || null,
        entity_id: details.entity_id || null,
        details,
        actor_type: context.actor_type || 'system',
        ip_hash: context.ip ? hashIdentifier(context.ip) : null,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Audit log error:', error);
    } else {
      console.log(`📝 Audit: ${action}`);
    }
  } catch (error) {
    console.error('Audit log exception:', error);
  }
}

// ============ FINGERPRINT EXTRACTION ============
export function extractFingerprint(req) {
  // Extraire le fingerprint depuis les headers ou cookies
  const fingerprintHeader = req.headers['x-fingerprint'];
  const userAgent = req.headers['user-agent'];
  const acceptLanguage = req.headers['accept-language'];

  if (fingerprintHeader) {
    return fingerprintHeader;
  }

  // Fallback: créer un fingerprint basique
  const data = `${userAgent}|${acceptLanguage}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

export function extractIP(req) {
  // Extraire l'IP en gérant les proxies
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// Export default pour compatibilité
export default {
  hashIdentifier,
  checkRateLimit,
  computePerceptualHash,
  checkDuplicateHash,
  generateShareUrl,
  verifyShareUrl,
  logAudit,
  extractFingerprint,
  extractIP
};
