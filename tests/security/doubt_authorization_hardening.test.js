import { describe, it, expect } from 'vitest'

/**
 * Emulates PostgreSQL trigger enforce_doubt_insert_integrity()
 * BEFORE INSERT ON public.doubts
 */
function simulateDoubtInsert(newRow, authUser, profilesDb, studentProfilesDb, batchesDb) {
  const callerProfile = profilesDb.find((p) => p.id === authUser?.uid)
  const isCallerAdmin = callerProfile?.role === 'admin'

  if (isCallerAdmin) {
    return {
      ...newRow,
      id: newRow.id || 'doubt-uuid',
      created_at: newRow.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  // Student check
  if (!authUser?.uid || newRow.student_id !== authUser.uid) {
    throw new Error('Unauthorized: Students may only raise doubts under their authenticated profile.')
  }

  const studentProfile = studentProfilesDb.find((sp) => sp.id === authUser.uid)
  const authenticBatch = batchesDb.find((b) => b.id === studentProfile?.batch_id)

  return {
    ...newRow,
    id: newRow.id || 'doubt-uuid',
    student_id: authUser.uid,
    student_name: callerProfile?.full_name || newRow.student_name || 'Student',
    roll_number: studentProfile?.roll_number || null,
    batch_id: studentProfile?.batch_id || null,
    batch_name: authenticBatch?.name || null,
    status: 'pending',
    addressed_by: null,
    addressed_by_name: null,
    addressed_at: null,
    resolution_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * Emulates PostgreSQL trigger enforce_doubt_mutation_rules()
 * BEFORE UPDATE ON public.doubts
 */
function simulateDoubtUpdate(oldRow, newRow, authUser, profilesDb) {
  const callerProfile = profilesDb.find((p) => p.id === authUser?.uid)
  const isCallerAdmin = callerProfile?.role === 'admin'

  if (isCallerAdmin) {
    return {
      ...oldRow,
      ...newRow,
      updated_at: new Date().toISOString(),
    }
  }

  // Immutable fields check
  const immutableFields = [
    'student_id',
    'student_name',
    'roll_number',
    'batch_id',
    'batch_name',
    'subject',
    'study_card_id',
    'lecture_title',
    'video_url',
    'timestamp_seconds',
    'question',
    'created_at',
  ]

  for (const field of immutableFields) {
    if (oldRow[field] !== newRow[field]) {
      throw new Error('Immutable doubt fields (student identity, lecture, question, timestamp, batch) cannot be modified.')
    }
  }

  if (oldRow.status === 'addressed' && newRow.status === 'pending') {
    throw new Error('Unauthorized: Addressed doubts cannot be reopened except by an administrator.')
  }

  if (newRow.status === 'addressed') {
    return {
      ...oldRow,
      ...newRow,
      addressed_by: authUser.uid,
      addressed_by_name: callerProfile?.full_name || 'Educator',
      addressed_at: newRow.addressed_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  return {
    ...oldRow,
    ...newRow,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Evaluates RLS Policy doubts: teacher select assigned
 */
function evaluateTeacherSelectPolicy(doubt, teacherUid, teacherProfilesDb, batchesDb) {
  if (!doubt.batch_id) return false // Unassigned doubts are not visible to teachers

  const batch = batchesDb.find((b) => b.id === doubt.batch_id)
  if (!batch) return false

  // Must be assigned to this batch
  const isAssigned = batch.teacher_id === teacherUid || (Array.isArray(batch.teacher_ids) && batch.teacher_ids.includes(teacherUid))
  if (!isAssigned) return false

  const tp = teacherProfilesDb.find((p) => p.id === teacherUid)
  const teacherSubject = tp?.subject?.trim()

  if (!teacherSubject) {
    // If no specific subject configured, teacher has broad access in assigned batch
    return true
  }

  // If teacher has subject specialty, it must match doubt subject OR teacher is sole/primary teacher
  const isSoleTeacher = batch.teacher_id === teacherUid && (!batch.teacher_ids || batch.teacher_ids.length <= 1)
  const subjectMatches = teacherSubject.toLowerCase() === (doubt.subject || '').trim().toLowerCase()

  return subjectMatches || isSoleTeacher
}

describe('Doubt Resolution Hub Security & Lifecycle Hardening', () => {
  const mockProfiles = [
    { id: 'student-1', role: 'student', full_name: 'Aarav Patel' },
    { id: 'student-2', role: 'student', full_name: 'Diya Sharma' },
    { id: 'teacher-phys', role: 'teacher', full_name: 'Prof. HC Verma' },
    { id: 'teacher-chem', role: 'teacher', full_name: 'Dr. Balaji' },
    { id: 'teacher-unassigned', role: 'teacher', full_name: 'Unassigned Educator' },
    { id: 'admin-1', role: 'admin', full_name: 'Academy Principal' },
  ]

  const mockTeacherProfiles = [
    { id: 'teacher-phys', subject: 'Physics' },
    { id: 'teacher-chem', subject: 'Chemistry' },
    { id: 'teacher-unassigned', subject: 'Physics' },
  ]

  const mockStudentProfiles = [
    { id: 'student-1', batch_id: 'batch-jee-2026', roll_number: 'JEE-101' },
    { id: 'student-2', batch_id: 'batch-neet-2026', roll_number: 'NEET-202' },
  ]

  const mockBatches = [
    {
      id: 'batch-jee-2026',
      name: 'JEE Mains 2026',
      teacher_id: 'teacher-phys',
      teacher_ids: ['teacher-phys', 'teacher-chem'],
    },
    {
      id: 'batch-neet-2026',
      name: 'NEET Droppers 2026',
      teacher_id: 'teacher-chem',
      teacher_ids: ['teacher-chem'],
    },
  ]

  describe('1. Authoritative Anti-Forgery Insertion Trigger', () => {
    it('binds authentic student roll number and batch from database, overriding tampered inputs', () => {
      const tamperedInsert = {
        student_id: 'student-1',
        student_name: 'Spoofed Name',
        roll_number: 'FAKE-999',
        batch_id: 'batch-neet-2026', // Student 1 is actually in batch-jee-2026!
        batch_name: 'Spoofed Batch',
        subject: 'Physics',
        lecture_title: 'Rotational Dynamics',
        timestamp_seconds: 450,
        question: 'Why does angular momentum stay conserved?',
      }

      const row = simulateDoubtInsert(
        tamperedInsert,
        { uid: 'student-1' },
        mockProfiles,
        mockStudentProfiles,
        mockBatches
      )

      expect(row.student_name).toBe('Aarav Patel')
      expect(row.roll_number).toBe('JEE-101') // Authoritative roll number
      expect(row.batch_id).toBe('batch-jee-2026') // Authoritative batch binding
      expect(row.batch_name).toBe('JEE Mains 2026')
      expect(row.status).toBe('pending')
      expect(row.addressed_by).toBeNull()
    })

    it('rejects attempt to raise a doubt under another student account', () => {
      expect(() => {
        simulateDoubtInsert(
          {
            student_id: 'student-2', // Attacker trying to submit for student-2
            lecture_title: 'Chemical Bonding',
            question: 'Spoofed question',
          },
          { uid: 'student-1' },
          mockProfiles,
          mockStudentProfiles,
          mockBatches
        )
      }).toThrow('Students may only raise doubts under their authenticated profile.')
    })
  })

  describe('2. Column-Level Immutability & Status Transition Trigger', () => {
    const existingDoubt = {
      id: 'doubt-1',
      student_id: 'student-1',
      student_name: 'Aarav Patel',
      roll_number: 'JEE-101',
      batch_id: 'batch-jee-2026',
      batch_name: 'JEE Mains 2026',
      subject: 'Physics',
      study_card_id: 'card-1',
      lecture_title: 'Rotational Dynamics',
      video_url: 'https://youtube.com/watch?v=123',
      timestamp_seconds: 450,
      question: 'Why does angular momentum stay conserved?',
      status: 'pending',
      addressed_by: null,
      addressed_by_name: null,
      addressed_at: null,
      created_at: '2026-10-10T10:00:00Z',
    }

    it('rejects attempts to tamper with student identity, lecture, or question', () => {
      expect(() => {
        simulateDoubtUpdate(
          existingDoubt,
          { ...existingDoubt, question: 'Tampered question text' },
          { uid: 'teacher-phys' },
          mockProfiles
        )
      }).toThrow('Immutable doubt fields (student identity, lecture, question, timestamp, batch) cannot be modified.')

      expect(() => {
        simulateDoubtUpdate(
          existingDoubt,
          { ...existingDoubt, roll_number: 'MODIFIED-ROLL' },
          { uid: 'teacher-phys' },
          mockProfiles
        )
      }).toThrow('Immutable doubt fields (student identity, lecture, question, timestamp, batch) cannot be modified.')
    })

    it('allows teacher to mark doubt as addressed and authoritatively records educator ID and timestamp', () => {
      const updated = simulateDoubtUpdate(
        existingDoubt,
        { ...existingDoubt, status: 'addressed' },
        { uid: 'teacher-phys' },
        mockProfiles
      )

      expect(updated.status).toBe('addressed')
      expect(updated.addressed_by).toBe('teacher-phys')
      expect(updated.addressed_by_name).toBe('Prof. HC Verma')
      expect(updated.addressed_at).toBeDefined()
    })

    it('prevents non-admins from reopening an already addressed doubt', () => {
      const addressedDoubt = {
        ...existingDoubt,
        status: 'addressed',
        addressed_by: 'teacher-phys',
        addressed_at: '2026-10-10T12:00:00Z',
      }

      expect(() => {
        simulateDoubtUpdate(
          addressedDoubt,
          { ...addressedDoubt, status: 'pending' },
          { uid: 'teacher-phys' },
          mockProfiles
        )
      }).toThrow('Addressed doubts cannot be reopened except by an administrator.')
    })

    it('allows administrator full moderation and reopening privileges', () => {
      const addressedDoubt = {
        ...existingDoubt,
        status: 'addressed',
        addressed_by: 'teacher-phys',
      }

      const reopened = simulateDoubtUpdate(
        addressedDoubt,
        { ...addressedDoubt, status: 'pending' },
        { uid: 'admin-1' },
        mockProfiles
      )

      expect(reopened.status).toBe('pending')
    })
  })

  describe('3. Multi-Teacher and Batch Scoping Authorization (RLS Logic)', () => {
    const jeePhysicsDoubt = {
      id: 'doubt-jee-phys',
      batch_id: 'batch-jee-2026',
      subject: 'Physics',
    }

    const jeeChemDoubt = {
      id: 'doubt-jee-chem',
      batch_id: 'batch-jee-2026',
      subject: 'Chemistry',
    }

    const neetChemDoubt = {
      id: 'doubt-neet-chem',
      batch_id: 'batch-neet-2026',
      subject: 'Chemistry',
    }

    const unassignedDoubt = {
      id: 'doubt-unassigned',
      batch_id: null,
      subject: 'General',
    }

    it('permits teacher to view doubts matching their assigned batch and subject', () => {
      expect(evaluateTeacherSelectPolicy(jeePhysicsDoubt, 'teacher-phys', mockTeacherProfiles, mockBatches)).toBe(true)
      expect(evaluateTeacherSelectPolicy(jeeChemDoubt, 'teacher-chem', mockTeacherProfiles, mockBatches)).toBe(true)
    })

    it('strictly forbids a teacher from viewing doubts from batches they are NOT assigned to, even if subject matches', () => {
      // teacher-unassigned teaches Physics, but is not assigned to batch-jee-2026
      expect(evaluateTeacherSelectPolicy(jeePhysicsDoubt, 'teacher-unassigned', mockTeacherProfiles, mockBatches)).toBe(false)

      // teacher-phys teaches Physics in JEE batch, but is NOT assigned to NEET batch
      expect(evaluateTeacherSelectPolicy(neetChemDoubt, 'teacher-phys', mockTeacherProfiles, mockBatches)).toBe(false)
    })

    it('forbids teachers from accessing unassigned doubts (unassigned doubts reserved for Admin queue)', () => {
      expect(evaluateTeacherSelectPolicy(unassignedDoubt, 'teacher-phys', mockTeacherProfiles, mockBatches)).toBe(false)
      expect(evaluateTeacherSelectPolicy(unassignedDoubt, 'teacher-chem', mockTeacherProfiles, mockBatches)).toBe(false)
    })
  })
})
