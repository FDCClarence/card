import mysql from 'mysql2/promise'

let pool

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set.')
  }
  return databaseUrl
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      uri: getDatabaseUrl(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
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
