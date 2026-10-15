import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"
import process from "node:process"

// 1. Load DATABASE_URL from process.env, .env.local, or .env
let dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  for (const envFile of ['.env.local', '.env']) {
    const envPath = path.resolve(process.cwd(), envFile)
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/)
      if (match) {
        dbUrl = match[1]
        break
      }
    }
  }
}

if (!dbUrl) {
  console.error("Error: DATABASE_URL not found in environment, .env.local, or .env")
  process.exit(1)
}

const args = process.argv.slice(2)
const fileArg = args.find((a) => a.startsWith("--file="))
const targetFile = fileArg ? fileArg.split("=")[1] : null
const isAll = args.includes("--all")

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
  // Apply all pending latest migrations in sequence
  const targetFiles = isAll
    ? fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort()
    : [
        "028_doubt_resolution_hub.sql",
        "029_study_cards_attached_notes.sql",
        "030_messages_robustness.sql",
        "031_subject_chapters.sql",
        "032_realtime_and_messaging_hardening.sql",
      ]

  console.log(`Starting automated database migration (${targetFiles.length} migrations)...`)
  for (const file of targetFiles) {
    const fullPath = path.join(migrationsDir, file)
    if (fs.existsSync(fullPath)) {
      console.log(`\n▶ Applying ${file}...`)
      try {
        execSync("psql \"" + dbUrl + "\" -f \"" + fullPath + "\"", { stdio: "inherit" })
        console.log(`✔ Applied: ${file}`)
      } catch (err) {
        console.error(`✘ Failed to apply ${file}: ${err.message}`)
        process.exit(1)
      }
    }
  }
  console.log("\nAll data migrations successfully applied to the database!")
}
