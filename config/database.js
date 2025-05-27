// Database configuration and connection
import pkg from "pg"
const { Pool } = pkg
import dotenv from "dotenv"

dotenv.config()

// PostgreSQL connection pool (Supabase ready)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Supabase requires this to be false
  },
})

// Test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect()
    console.log("✅ Connected to Supabase PostgreSQL")

    const result = await client.query("SELECT NOW() as current_time, version() as pg_version")
    console.log("📅 Database time:", result.rows[0].current_time)
    console.log("🗄️ PostgreSQL version:", result.rows[0].pg_version.split(" ")[0])

    client.release()
  } catch (err) {
    console.error("❌ Error connecting to PostgreSQL database:", err.message)
    console.log("🧠 Error Code:", err.code)

    switch (err.code) {
      case "ECONNREFUSED":
        console.error("🔌 Connection refused — check host or firewall.")
        break
      case "ENOTFOUND":
        console.error("🌍 Host not found — check your DATABASE_URL host.")
        break
      case "3D000":
        console.error("📂 Database does not exist.")
        break
      case "28P01":
        console.error("🔐 Authentication failed — invalid user/password.")
        break
      default:
        console.error("🛑 Unknown error.")
    }

    process.exit(1)
  }
}

// Run queries safely
export const query = async (text, params) => {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log("📊 Query executed", {
      text: text.substring(0, 60) + "...",
      duration,
      rows: res.rowCount,
    })
    return res
  } catch (error) {
    console.error("❌ Query error:", error.message)
    throw error
  }
}

// Transaction helper
export const withTransaction = async (callback) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await callback(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export default pool






































// // Database configuration and connection
// import pkg from "pg"
// const { Pool } = pkg
// import dotenv from 'dotenv'

// dotenv.config()

// // PostgreSQL connection pool
// // export const pool = new Pool({
// //   user: process.env.DB_USER || "postgres",
// //   host: process.env.DB_HOST || "localhost",
// //   database: process.env.DB_NAME || "taskmanager",
// //   password: process.env.DB_PASSWORD || "your_password",
// //   port: process.env.DB_PORT,
// //   max: 20,
// //   idleTimeoutMillis: 30000,
// //   connectionTimeoutMillis: 2000,
// // })

// export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false, // Required by Supabase
//   },
// })


// // Test database connection
// export const testConnection = async () => {
//   try {
//     const client = await pool.connect()
//     console.log("✅ Connected to PostgreSQL database")

//     const result = await client.query("SELECT NOW() as current_time, version() as pg_version")
//     console.log("📅 Database time:", result.rows[0].current_time)
//     console.log("🗄️ PostgreSQL version:", result.rows[0].pg_version.split(" ")[0])

//     client.release()
//   } catch (err) {
//     console.error("❌ Error connecting to PostgreSQL database:", err.message)
//     console.log("Code:", err.code);
//     console.error("💡 Make sure PostgreSQL is running and credentials are correct")

//     if (err.code === "ECONNREFUSED"){
//       console.log("Postserver is not running. Please start");
//     } else if (err.code === "3D000"){
//       console.log("Database not exists");
//     } else if (err.code === "28P01"){
//       console.log("Authentication failed. Check your credentials");
//     }

//     process.exit(1)
//   }
// }

// // Helper function to execute queries with error handling
// export const query = async (text, params) => {
//   const start = Date.now()
//   try {
//     const res = await pool.query(text, params)
//     const duration = Date.now() - start
//     console.log("📊 Query executed", {
//       text: text.substring(0, 50) + "...",
//       duration,
//       rows: res.rowCount,
//     })
//     return res
//   } catch (error) {
//     console.error("❌ Database query error:", error)
//     throw error
//   }
// }

// // Transaction helper
// export const withTransaction = async (callback) => {
//   const client = await pool.connect()
//   try {
//     await client.query("BEGIN")
//     const result = await callback(client)
//     await client.query("COMMIT")
//     return result
//   } catch (error) {
//     await client.query("ROLLBACK")
//     throw error
//   } finally {
//     client.release()
//   }
// }

// export default pool
