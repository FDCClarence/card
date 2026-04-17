import './env.js'
import mysql from 'mysql2/promise'

let pool

/**
 * TLS for MySQL: only enable when explicitly requested or host looks like a
 * managed cloud hostname. Auto-enabling TLS for every non-localhost host breaks
 * Docker Compose service names (`mysql`), LAN IPs, and many self-hosted DBs.
 *
 * - MYSQL_SSL=true / DATABASE_SSL=true  → use TLS (rejectUnauthorized: false)
 * - MYSQL_SSL=false / DATABASE_SSL=false → never TLS
 */
function getSslOption(connectionUrl) {
  if (process.env.MYSQL_SSL === 'false' || process.env.DATABASE_SSL === 'false') {
    return undefined
  }
  if (process.env.MYSQL_SSL === 'true' || process.env.DATABASE_SSL === 'true') {
    return { rejectUnauthorized: false }
  }
  if (!connectionUrl) return undefined
  try {
    const { hostname } = new URL(connectionUrl)
    const host = hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return undefined
    }
    // Private LAN — almost never TLS for MySQL in dev
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host)) {
      return undefined
    }
    // Docker Compose service name (mysql, db, …) — no dot in hostname
    if (!host.includes('.')) {
      return undefined
    }
    // Likely cloud / managed — Railway, RDS, Azure, etc.
    if (
      /railway|rlwy|amazonaws\.com|azure|planetscale|digitalocean|aiven|render\.com|mongodb\.net/i.test(
        host,
      )
    ) {
      return { rejectUnauthorized: false }
    }
    // Other internet hosts: opt-in only (set MYSQL_SSL=true in env)
    return undefined
  } catch {
    return undefined
  }
}

function getPoolConfig() {
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl) {
    const ssl = getSslOption(databaseUrl)
    return {
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ...(ssl ? { ssl } : {}),
    }
  }

  const host = process.env.MYSQLHOST ?? process.env.MYSQL_HOST
  const user = process.env.MYSQLUSER ?? process.env.MYSQL_USER
  const password = process.env.MYSQLPASSWORD ?? process.env.MYSQL_PASSWORD ?? ''
  const database = process.env.MYSQLDATABASE ?? process.env.MYSQL_DATABASE
  const port = Number(process.env.MYSQLPORT ?? process.env.MYSQL_PORT ?? 3306)

  if (host && user && database) {
    const ssl = getSslOption(`mysql://${encodeURIComponent(user)}@${host}:${port}/${database}`)
    return {
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ...(ssl ? { ssl } : {}),
    }
  }

  throw new Error(
    'Database is not configured. Set DATABASE_URL, or MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE, and MYSQL_PASSWORD (optional MYSQL_PORT).',
  )
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(getPoolConfig())
  }
  return pool
}

export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params)
  return rows
}

export async function checkDbConnection() {
  await query('SELECT 1')
}
