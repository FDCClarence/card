import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-change-me'

/**
 * Express middleware that verifies the Bearer JWT and attaches userId to req.
 * Responds 401 if the token is missing, malformed, or expired.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token.' })
  }

  const token = authHeader.slice('Bearer '.length)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.sub
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}
