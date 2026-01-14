// Vérification de l'authentification admin

export function verifyAdmin(req) {
  const adminKey = process.env.ADMIN_SECRET_KEY;

  if (!adminKey) {
    return {
      valid: false,
      error: 'Admin key not configured'
    };
  }

  // Vérifier dans les query params
  const queryKey = req.query?.key;

  // Vérifier dans les headers
  const headerKey = req.headers?.['x-admin-key'];

  // Vérifier dans le body
  const bodyKey = req.body?.admin_key;

  const providedKey = queryKey || headerKey || bodyKey;

  if (!providedKey) {
    return {
      valid: false,
      error: 'Admin key required'
    };
  }

  if (providedKey !== adminKey) {
    return {
      valid: false,
      error: 'Invalid admin key'
    };
  }

  return {
    valid: true
  };
}

export function requireAdmin(req, res, next) {
  const auth = verifyAdmin(req);

  if (!auth.valid) {
    return res.status(401).json({
      success: false,
      error: auth.error
    });
  }

  next();
}
