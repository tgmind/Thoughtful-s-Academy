# Local Development Setup & Environment Bootstrap Guide

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Target Environment:** Node.js 18+ / Linux, macOS, or Windows (WSL2)  
**Lead DevOps Engineer:** Senior DevOps Specialist  

---

## 1. Prerequisites & System Requirements

Before setting up the project locally, verify the following dependencies:
- **Node.js:** `>= 18.18.0` (Recommended: `v20.x LTS`)
- **Package Manager:** `npm` `>= 9.x` (Bundled with Node)
- **Git:** `>= 2.30`
- **Modern Web Browser:** Chrome, Edge, Firefox, or Safari with Web Audio API and Service Worker support.

---

## 2. Step-by-Step Installation & Configuration

### Step 1: Clone Repository & Install Dependencies
```bash
# Clone the project repository
git clone https://github.com/thoughtful-academy/coaching-institute.git
cd coaching-institute

# Install dependencies deterministically
npm install
```

### Step 2: Configure Environment Variables
Copy the example environment template to create a local `.env` file:
```bash
cp .env.example .env
```

Open `.env` and verify the Supabase connection parameters:
```env
# Supabase Project Gateway (Required for database & auth)
VITE_SUPABASE_URL="https://<your-project-id>.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Step 3: Launch Local Development Server
```bash
npm run dev
```
- **Local Address:** `http://localhost:5173`
- **Network Address:** `http://<your-lan-ip>:5173` (Vite binds to `0.0.0.0` by default, enabling testing on physical phones and tablets over local Wi-Fi).

---

## 3. Local Serverless Function Emulation

In local development, `vite.config.js` bundles an in-memory dev proxy (`youtubePlaylistDevPlugin`) that intercepts calls to `/api/youtube-playlist`. You do **not** need to run `netlify dev` or spin up local AWS Lambda emulators for YouTube playlist syndication testing.
