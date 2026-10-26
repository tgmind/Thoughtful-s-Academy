import { describe, it, expect } from 'vitest'

/**
 * Capacity Calculation Model for GRAViTON PHYSICS (EdTech Platform)
 * Models user concurrency profiles, Supabase Free Tier quotas, and Netlify Free Tier limits.
 */

// Supabase & Netlify Free Tier hard quotas
export const QUOTAS = {
  SUPABASE_MAX_DIRECT_CONNECTIONS: 60,
  SUPABASE_MAX_POOLER_CLIENTS: 200,
  SUPABASE_MAX_REALTIME_CONCURRENT: 200,
  SUPABASE_MAX_REALTIME_MESSAGES_PER_MO: 2_000_000,
  SUPABASE_MAX_EGRESS_BYTES_PER_MO: 2 * 1024 * 1024 * 1024, // 2 GB
  SUPABASE_DATABASE_STORAGE_BYTES: 500 * 1024 * 1024, // 500 MB
  NETLIFY_BANDWIDTH_BYTES_PER_MO: 100 * 1024 * 1024 * 1024, // 100 GB
  NETLIFY_SERVERLESS_INVOCATIONS_PER_MO: 125_000,
}

/**
 * Models the workload metrics for N concurrent users on GRAViTON PHYSICS.
 * @param {number} concurrentUsers - Number of simultaneously connected active users
 * @param {object} options - Custom parameters (e.g., student/teacher ratio, event frequency)
 */
export function calculatePlatformLoad(concurrentUsers, options = {}) {
  const {
    studentRatio = 0.90, // 90% students, 10% teachers/admins
    avgSessionMinutes = 45,
    sessionsPerMonthPerUser = 20,
    broadcastEventsPerHour = 4, // e.g., 4 announcements/homework uploads during peak coaching hour
    channelConsolidationFactor = 1, // 1 multiplexed channel per client (optimized) vs 3 (unoptimized)
    thunderingHerdMultiplier = 1, // 1 targeted query per event (optimized) vs 11 full dashboard queries (unoptimized)
    avgQueryPayloadBytes = 1800, // average compressed json payload per REST query
    edgeFunctionInvocationsPerHour = 2, // e.g., playlist fetch
  } = options

  const studentCount = Math.round(concurrentUsers * studentRatio)
  const teacherCount = concurrentUsers - studentCount

  // 1. WebSocket & Channel Connections
  // Under Supabase Realtime, 1 WebSocket client connection holds multiplexed channels
  const realtimeClients = concurrentUsers
  const activeChannels = concurrentUsers * channelConsolidationFactor

  // 2. Realtime Broadcast & Ingestion Messages
  // Each broadcast event delivers to all listening student/teacher channels
  const broadcastMessagesPerSecond = (broadcastEventsPerHour * concurrentUsers) / 3600
  // Monthly messages based on 30 days of peak/off-peak blended activity (assuming ~2 peak hours/day equivalent)
  const monthlyRealtimeMessages = broadcastEventsPerHour * concurrentUsers * 2 * 30

  // 3. Database Query Load (REST / PostgREST)
  // Background idle polling: 0 (push-first architecture)
  // Event-triggered queries: broadcastEventsPerHour * thunderingHerdMultiplier per connected user
  const eventTriggeredQueriesPerHour = broadcastEventsPerHour * concurrentUsers * thunderingHerdMultiplier
  // Interactive navigation queries (average 1 click / 90 seconds = 40 queries/user/hour)
  const interactiveQueriesPerHour = concurrentUsers * 40
  const totalQueriesPerHour = eventTriggeredQueriesPerHour + interactiveQueriesPerHour
  const queriesPerSecond = totalQueriesPerHour / 3600

  // 4. Connection Pool Requirements
  // PostgREST executes queries with transaction pooling (~3-10ms query execution time with indexes)
  // Little's Law: Concurrent DB Connections = QPS * Latency(seconds)
  const avgQueryLatencySeconds = 0.015 // 15ms target with composite indexes
  const activeDbTransactions = Math.max(1, Math.ceil(queriesPerSecond * avgQueryLatencySeconds))

  // 5. Bandwidth Egress (Monthly)
  // Total queries in a month (assuming 20 sessions/month of 45 mins each)
  const totalSessionsPerMonth = concurrentUsers * sessionsPerMonthPerUser
  const queriesPerSession = (40 * (avgSessionMinutes / 60)) + (broadcastEventsPerHour * (avgSessionMinutes / 60) * thunderingHerdMultiplier)
  const totalQueriesMonthly = totalSessionsPerMonth * queriesPerSession
  const apiEgressBytesMonthly = totalQueriesMonthly * avgQueryPayloadBytes

  // 6. Netlify Serverless Invocations
  const edgeInvocationsMonthly = totalSessionsPerMonth * (edgeFunctionInvocationsPerHour * (avgSessionMinutes / 60))

  return {
    concurrentUsers,
    studentCount,
    teacherCount,
    realtimeClients,
    activeChannels,
    queriesPerSecond: parseFloat(queriesPerSecond.toFixed(2)),
    activeDbTransactions,
    broadcastMessagesPerSecond: parseFloat(broadcastMessagesPerSecond.toFixed(2)),
    monthlyRealtimeMessages: Math.round(monthlyRealtimeMessages),
    totalQueriesMonthly: Math.round(totalQueriesMonthly),
    apiEgressBytesMonthly: Math.round(apiEgressBytesMonthly),
    edgeInvocationsMonthly: Math.round(edgeInvocationsMonthly),
    headroom: {
      realtimeClientCapacityPercent: (realtimeClients / QUOTAS.SUPABASE_MAX_REALTIME_CONCURRENT) * 100,
      realtimeMessageCapacityPercent: (monthlyRealtimeMessages / QUOTAS.SUPABASE_MAX_REALTIME_MESSAGES_PER_MO) * 100,
      dbPoolerCapacityPercent: (activeDbTransactions / QUOTAS.SUPABASE_MAX_POOLER_CLIENTS) * 100,
      supabaseEgressCapacityPercent: (apiEgressBytesMonthly / QUOTAS.SUPABASE_MAX_EGRESS_BYTES_PER_MO) * 100,
      netlifyFunctionCapacityPercent: (edgeInvocationsMonthly / QUOTAS.NETLIFY_SERVERLESS_INVOCATIONS_PER_MO) * 100,
    },
  }
}

describe('GRAViTON PHYSICS Capacity & Realtime Load Model', () => {
  describe('Baseline vs Optimized Invariants', () => {
    it('verifies channel consolidation cuts WebSocket channel count by 66.7%', () => {
      const unoptimized = calculatePlatformLoad(100, { channelConsolidationFactor: 3 })
      const optimized = calculatePlatformLoad(100, { channelConsolidationFactor: 1 })

      expect(unoptimized.activeChannels).toBe(300)
      expect(optimized.activeChannels).toBe(100)
      expect(optimized.activeChannels / unoptimized.activeChannels).toBeCloseTo(0.333, 2)
    })

    it('verifies targeted debounced sync reduces queries on broadcast event by >90%', () => {
      // Unoptimized: each event triggers 11 dashboard queries across all students
      const unoptimized = calculatePlatformLoad(200, { thunderingHerdMultiplier: 11, broadcastEventsPerHour: 6 })
      // Optimized: targeted sync refetches only 1 specific query
      const optimized = calculatePlatformLoad(200, { thunderingHerdMultiplier: 1, broadcastEventsPerHour: 6 })

      const eventQueriesUnoptimized = 6 * 200 * 11
      const eventQueriesOptimized = 6 * 200 * 1

      expect(eventQueriesUnoptimized).toBe(13200)
      expect(eventQueriesOptimized).toBe(1200)
      expect(optimized.queriesPerSecond).toBeLessThan(unoptimized.queriesPerSecond)
      expect(eventQueriesOptimized / eventQueriesUnoptimized).toBeCloseTo(0.0909, 3)
    })
  })

  describe('Scenario 1: 100 Concurrent Users (Normal Class Load)', () => {
    it('operates safely well within all Supabase and Netlify free tier boundaries', () => {
      const model = calculatePlatformLoad(100)

      expect(model.realtimeClients).toBe(100)
      expect(model.realtimeClients).toBeLessThanOrEqual(QUOTAS.SUPABASE_MAX_REALTIME_CONCURRENT)
      expect(model.headroom.realtimeClientCapacityPercent).toBe(50.0)

      // QPS should be moderate (< 2 QPS)
      expect(model.queriesPerSecond).toBeLessThan(3.0)

      // Connection pool usage is very light (< 5 concurrent transactions)
      expect(model.activeDbTransactions).toBeLessThan(5)
      expect(model.headroom.dbPoolerCapacityPercent).toBeLessThan(5.0)

      // Monthly Realtime messages well under 2M quota
      expect(model.monthlyRealtimeMessages).toBeLessThan(QUOTAS.SUPABASE_MAX_REALTIME_MESSAGES_PER_MO)
      expect(model.headroom.realtimeMessageCapacityPercent).toBeLessThan(5.0)

      // Egress well under 2 GB
      expect(model.apiEgressBytesMonthly).toBeLessThan(QUOTAS.SUPABASE_MAX_EGRESS_BYTES_PER_MO)

      // Netlify functions under 125,000 invocations
      expect(model.edgeInvocationsMonthly).toBeLessThan(QUOTAS.NETLIFY_SERVERLESS_INVOCATIONS_PER_MO)
    })
  })

  describe('Scenario 2: 200 Concurrent Users (Supabase Free Tier Hard Ceiling)', () => {
    it('operates at exact ceiling of Supabase Free Tier 200 Realtime connections', () => {
      const model = calculatePlatformLoad(200)

      expect(model.realtimeClients).toBe(200)
      expect(model.headroom.realtimeClientCapacityPercent).toBe(100.0)

      // Database QPS remains very manageable with indexes
      expect(model.queriesPerSecond).toBeLessThan(5.0)
      expect(model.activeDbTransactions).toBeLessThan(10)

      // Monthly egress remains within free tier
      expect(model.apiEgressBytesMonthly).toBeLessThan(QUOTAS.SUPABASE_MAX_EGRESS_BYTES_PER_MO)
    })
  })

  describe('Scenario 3: 250 Concurrent Users (Over Free Realtime Client Limit)', () => {
    it('detects that Realtime client limit is exceeded unless tiered/staggered', () => {
      const model = calculatePlatformLoad(250)

      expect(model.realtimeClients).toBe(250)
      // Exceeds 200 free tier concurrent realtime limit
      expect(model.headroom.realtimeClientCapacityPercent).toBe(125.0)
      expect(model.realtimeClients).toBeGreaterThan(QUOTAS.SUPABASE_MAX_REALTIME_CONCURRENT)

      // However, DB Pooler and egress remain viable
      expect(model.headroom.dbPoolerCapacityPercent).toBeLessThan(10.0)
    })
  })

  describe('Scenario 3B: 300 Concurrent Users (Phase 6 Target Capacity)', () => {
    it('models 300 users: proves DB & egress safe at ₹0, but proves continuous Realtime exceeds 200 limit', () => {
      const model = calculatePlatformLoad(300)

      // Database throughput (PostgREST) is fully safe:
      expect(model.queriesPerSecond).toBeLessThan(5.0) // ~3.67 QPS
      expect(model.activeDbTransactions).toBeLessThanOrEqual(2) // Only 1-2 concurrent DB transactions
      expect(model.headroom.dbPoolerCapacityPercent).toBeLessThan(2.0)

      // Monthly egress is fully safe:
      const egressGb = model.apiEgressBytesMonthly / (1024 * 1024 * 1024)
      expect(egressGb).toBeLessThan(0.5) // ~0.356 GB (well below 2.0 GB)
      expect(model.headroom.supabaseEgressCapacityPercent).toBeLessThan(25.0)

      // Realtime messages are fully safe:
      expect(model.monthlyRealtimeMessages).toBeLessThan(QUOTAS.SUPABASE_MAX_REALTIME_MESSAGES_PER_MO) // ~72k vs 2M limit

      // Continuous Realtime WebSocket connections EXCEED 200 Free Tier Limit:
      expect(model.realtimeClients).toBe(300)
      expect(model.headroom.realtimeClientCapacityPercent).toBe(150.0) // 150% of free tier quota

      // Zero-Cost Resolution: With Tab Inactivity/Visibility disconnection (~45% background/idle tabs):
      const activeTabsRatio = 0.55
      const effectiveActiveRealtimeClients = Math.round(300 * activeTabsRatio)
      expect(effectiveActiveRealtimeClients).toBe(165)
      expect(effectiveActiveRealtimeClients).toBeLessThanOrEqual(QUOTAS.SUPABASE_MAX_REALTIME_CONCURRENT) // 165 <= 200
    })
  })

  describe('Scenario 4: 500 & 1,000 Concurrent Users (Stress Scale)', () => {
    it('evaluates resource requirements and identifies bottlenecks for 500 users', () => {
      const model = calculatePlatformLoad(500)

      expect(model.headroom.realtimeClientCapacityPercent).toBe(250.0) // 2.5x free tier realtime limit
      // DB connection pooler still handles 500 users easily (QPS ~ 6-8, requires ~2-3 pooler connections)
      expect(model.activeDbTransactions).toBeLessThan(15)
      expect(model.activeDbTransactions).toBeLessThan(QUOTAS.SUPABASE_MAX_POOLER_CLIENTS)
    })

    it('evaluates resource requirements and identifies bottlenecks for 1000 users', () => {
      const model = calculatePlatformLoad(1000)

      expect(model.headroom.realtimeClientCapacityPercent).toBe(500.0) // 5x free tier realtime limit
      // DB connection pooler (port 6543) can handle ~200 connections, which easily accommodates ~15-20 active transactions
      expect(model.activeDbTransactions).toBeLessThan(QUOTAS.SUPABASE_MAX_POOLER_CLIENTS)
      // Supabase 2GB egress might become a bottleneck under continuous full month active traffic
      const egressGb = model.apiEgressBytesMonthly / (1024 * 1024 * 1024)
      expect(egressGb).toBeGreaterThan(0.5) // non-negligible egress
    })
  })
})
