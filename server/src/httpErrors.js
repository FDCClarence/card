/**
 * Map MySQL / pool errors to HTTP status + JSON body for API responses.
 */
export function httpPayloadFromDbError(error) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('Database is not configured')) {
    return {
      status: 503,
      body: {
        error:
          'Database is not configured on the server. Set DATABASE_URL (or MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE, MYSQL_PASSWORD).',
      },
    }
  }
  const code = error?.code
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT') {
    return {
      status: 503,
      body: { error: 'Cannot reach the database. Check DATABASE_URL and that MySQL is running.' },
    }
  }
  if (code === 'ER_ACCESS_DENIED_ERROR' || code === 'ER_BAD_DB_ERROR') {
    return {
      status: 503,
      body: { error: 'Database rejected the connection. Check credentials and database name in DATABASE_URL.' },
    }
  }
  if (code === 'ER_BAD_FIELD_ERROR' || code === 'ER_NO_SUCH_TABLE') {
    return {
      status: 503,
      body: {
        error:
          'Database schema does not match the app (missing table/column). Run migrations so the database matches the server.',
      },
    }
  }
  if (code === 'PROTOCOL_CONNECTION_LOST' || code === 'ECONNRESET') {
    return {
      status: 503,
      body: { error: 'Database connection was lost. Retry; if it persists, check MySQL and TLS settings (try MYSQL_SSL=false for local Docker).' },
    }
  }
  return null
}
