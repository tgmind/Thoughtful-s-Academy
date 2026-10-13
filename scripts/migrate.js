import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"
import process from "node:process"

// 1. Load DATABASE_URL from .env.local if not in process.env
let dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  const envLocalPath = path.resolve(process.cwd(), ".env.local")
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, "utf8")
    const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/)
    if (match) {
      dbUrl = match[1]
    }
  }
}

if (!dbUrl) {
  console.error("Error: DATABASE_URL not found in environment or .env.local")
  process.exit(1)
}

const args = process.argv.slice(2)
const fileArg = args.find((a) => a.startsWith("--file="))
const targetFile = fileArg ? fileArg.split("=")[1] : null

const migrationsDir = path.resolve(process.cwd(), "supabase/migrations")

if (targetFile) {
  const filePath = path.isAbsolute(targetFile)
    ? targetFile
    : path.join(migrationsDir, targetFile)

  if (!fs.existsSync(filePath)) {
    console.error("Error: Migration file not found: " + filePath)
    process.exit(1)
  }

  console.log("Applying migration: " + path.basename(filePath) + "...")
  try {
    execSync("psql \"" + dbUrl + "\" -f \"" + filePath + "\"", { stdio: "inherit" })
    console.log("Successfully applied: " + path.basename(filePath))
  } catch (err) {
    console.error("Failed to apply migration: " + err.message)
    process.exit(1)
  }
} else {
  const defaultFile = path.join(migrationsDir, "028_doubt_resolution_hub.sql")
  if (fs.existsSync(defaultFile)) {
    console.log("Applying migration: 028_doubt_resolution_hub.sql...")
    try {
      execSync("psql \"" + dbUrl + "\" -f \"" + defaultFile + "\"", { stdio: "inherit" })
      console.log("Successfully applied: 028_doubt_resolution_hub.sql")
    } catch (err) {
      console.error("Failed to apply migration: " + err.message)
      process.exit(1)
    }
  }
}
