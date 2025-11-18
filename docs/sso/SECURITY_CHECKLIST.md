# SSO Security Checklist

> **Document Version**: 1.0
> **Last Updated**: 2025-11-18
> **Purpose**: Security implementation and verification guide for Info Hub ↔ LMS SSO

---

## PKCE (Proof Key for Code Exchange) Implementation

### Overview

PKCE (RFC 7636) prevents authorization code interception attacks by requiring the client to prove possession of a cryptographically random secret.

### Implementation Code

```typescript
import crypto from 'crypto'

/**
 * Generate a cryptographically secure code verifier
 * Requirements: 43-128 characters, base64url encoded
 * Characters allowed: [A-Z] [a-z] [0-9] - . _ ~
 */
export function generateCodeVerifier(): string {
  // Generate 32 random bytes (256 bits of entropy)
  const randomBytes = crypto.randomBytes(32)

  // Convert to base64url encoding
  const verifier = randomBytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  // Ensure minimum length requirement (43 characters)
  if (verifier.length < 43) {
    // Recursively generate a new one (extremely rare case)
    return generateCodeVerifier()
  }

  return verifier
}

/**
 * Generate code challenge from verifier using SHA-256
 * @param verifier - The code verifier string
 * @returns Base64url encoded SHA-256 hash
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(verifier)
    .digest()

  // Convert to base64url encoding
  return hash
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Verify PKCE parameters on the server side
 * @param verifier - Code verifier from client
 * @param challenge - Code challenge stored with authorization code
 * @returns true if verification passes
 */
export function verifyPKCE(verifier: string, challenge: string): boolean {
  // Compute the expected challenge from the verifier
  const computedChallenge = generateCodeChallenge(verifier)

  // Use timing-safe comparison to prevent timing attacks
  if (computedChallenge.length !== challenge.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(computedChallenge),
    Buffer.from(challenge)
  )
}

/**
 * Validate code verifier format
 * RFC 7636: 43-128 characters from [A-Za-z0-9-._~]
 */
export function isValidCodeVerifier(verifier: string): boolean {
  // Check length requirements
  if (verifier.length < 43 || verifier.length > 128) {
    return false
  }

  // Check character set requirements
  const validPattern = /^[A-Za-z0-9\-._~]+$/
  return validPattern.test(verifier)
}

/**
 * Complete PKCE flow example
 */
export class PKCEFlow {
  private verifier: string
  private challenge: string

  constructor() {
    this.verifier = generateCodeVerifier()
    this.challenge = generateCodeChallenge(this.verifier)
  }

  // Client: Get parameters for authorization request
  getAuthorizationParams() {
    return {
      code_challenge: this.challenge,
      code_challenge_method: 'S256' as const
    }
  }

  // Client: Get verifier for token exchange
  getCodeVerifier(): string {
    return this.verifier
  }

  // Server: Store challenge with authorization code
  static storeAuthorizationCode(
    code: string,
    challenge: string,
    userId: string,
    clientId: string
  ): void {
    // Store in database with expiry (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Database insert (pseudo-code)
    // INSERT INTO oauth_authorization_codes
    // (code, code_challenge, user_id, client_id, expires_at)
    // VALUES (code, challenge, userId, clientId, expiresAt)
  }

  // Server: Verify during token exchange
  static async verifyTokenExchange(
    code: string,
    verifier: string,
    clientId: string
  ): Promise<boolean> {
    // Retrieve stored challenge from database (pseudo-code)
    // SELECT code_challenge FROM oauth_authorization_codes
    // WHERE code = ? AND client_id = ? AND expires_at > NOW()

    const storedChallenge = 'retrieved_from_database'

    // Verify PKCE
    return verifyPKCE(verifier, storedChallenge)
  }
}
```

### Test Cases

```typescript
describe('PKCE Security', () => {
  test('generates unique code verifiers', () => {
    const verifiers = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      verifiers.add(generateCodeVerifier())
    }
    expect(verifiers.size).toBe(1000)
  })

  test('verifier has sufficient entropy', () => {
    const verifier = generateCodeVerifier()
    // 32 bytes = 256 bits of entropy
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)
  })

  test('challenge is deterministic for same verifier', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const challenge1 = generateCodeChallenge(verifier)
    const challenge2 = generateCodeChallenge(verifier)
    expect(challenge1).toBe(challenge2)
    expect(challenge1).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })

  test('verification accepts valid PKCE pair', () => {
    const verifier = generateCodeVerifier()
    const challenge = generateCodeChallenge(verifier)
    expect(verifyPKCE(verifier, challenge)).toBe(true)
  })

  test('verification rejects invalid verifier', () => {
    const verifier1 = generateCodeVerifier()
    const verifier2 = generateCodeVerifier()
    const challenge = generateCodeChallenge(verifier1)
    expect(verifyPKCE(verifier2, challenge)).toBe(false)
  })

  test('verification prevents code substitution attack', () => {
    // Attacker intercepts authorization code but doesn't have verifier
    const legitimateVerifier = generateCodeVerifier()
    const legitimateChallenge = generateCodeChallenge(legitimateVerifier)

    // Attacker tries to use their own verifier
    const attackerVerifier = generateCodeVerifier()
    expect(verifyPKCE(attackerVerifier, legitimateChallenge)).toBe(false)
  })

  test('timing-safe comparison prevents timing attacks', () => {
    const verifier = generateCodeVerifier()
    const challenge = generateCodeChallenge(verifier)
    const wrongChallenge = generateCodeChallenge(generateCodeVerifier())

    // Measure multiple verification attempts
    const timings: number[] = []
    for (let i = 0; i < 100; i++) {
      const start = process.hrtime.bigint()
      verifyPKCE(verifier, i % 2 === 0 ? challenge : wrongChallenge)
      const end = process.hrtime.bigint()
      timings.push(Number(end - start))
    }

    // Timing variations should be minimal (< 10% difference)
    const avgTiming = timings.reduce((a, b) => a + b) / timings.length
    const maxDeviation = Math.max(...timings.map(t => Math.abs(t - avgTiming)))
    expect(maxDeviation / avgTiming).toBeLessThan(0.1)
  })
})
```

### Attack Scenarios Prevented

1. **Authorization Code Interception**: Attacker cannot exchange stolen code without verifier
2. **Code Substitution**: Attacker cannot use their own authorization code
3. **Replay Attacks**: Single-use enforcement prevents code reuse
4. **Man-in-the-Middle**: HTTPS + PKCE prevents code theft

### Security Best Practices

- Always use SHA-256 for code challenge (`S256` method)
- Never use plain text code challenge
- Enforce minimum 43 character verifier length
- Store challenges securely with authorization codes
- Use timing-safe comparison for verification
- Implement single-use enforcement for codes

---

## CSRF (Cross-Site Request Forgery) Protection

### Implementation Code

```typescript
import crypto from 'crypto'

/**
 * Generate a cryptographically secure state token
 * Used for CSRF protection in OAuth flow
 */
export function generateState(): string {
  // Generate 32 random bytes for high entropy
  return crypto.randomBytes(32).toString('hex')
}

/**
 * State management for CSRF protection
 */
export class CSRFStateManager {
  private states = new Map<string, {
    createdAt: number
    expiresAt: number
    metadata?: any
  }>()

  private readonly STATE_TTL = 10 * 60 * 1000 // 10 minutes

  /**
   * Generate and store a new state token
   */
  generateState(metadata?: any): string {
    const state = generateState()
    const now = Date.now()

    this.states.set(state, {
      createdAt: now,
      expiresAt: now + this.STATE_TTL,
      metadata
    })

    // Clean up expired states
    this.cleanupExpiredStates()

    return state
  }

  /**
   * Validate state token
   * @param state - State token from callback
   * @returns true if valid and not expired
   */
  validateState(state: string): boolean {
    const stateData = this.states.get(state)

    if (!stateData) {
      console.warn('State not found:', state)
      return false
    }

    if (Date.now() > stateData.expiresAt) {
      console.warn('State expired:', state)
      this.states.delete(state)
      return false
    }

    // State is valid, remove it (single-use)
    this.states.delete(state)
    return true
  }

  /**
   * Get metadata associated with state
   */
  getStateMetadata(state: string): any {
    return this.states.get(state)?.metadata
  }

  /**
   * Clean up expired states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now()
    for (const [state, data] of this.states.entries()) {
      if (now > data.expiresAt) {
        this.states.delete(state)
      }
    }
  }
}

/**
 * Server-side state storage using Redis or database
 */
export class PersistentStateManager {
  /**
   * Store state in Redis with TTL
   */
  async storeState(state: string, metadata?: any): Promise<void> {
    const redis = getRedisClient() // Your Redis client
    const data = JSON.stringify({
      createdAt: Date.now(),
      metadata
    })

    // Store with 10 minute TTL
    await redis.setex(`oauth:state:${state}`, 600, data)
  }

  /**
   * Validate and consume state
   */
  async validateState(state: string): Promise<boolean> {
    const redis = getRedisClient()
    const data = await redis.get(`oauth:state:${state}`)

    if (!data) {
      return false
    }

    // Delete state after validation (single-use)
    await redis.del(`oauth:state:${state}`)

    const parsed = JSON.parse(data)
    const age = Date.now() - parsed.createdAt

    // Check if state is not too old (double-check TTL)
    return age < 600000 // 10 minutes
  }
}

/**
 * Complete CSRF protection implementation
 */
export class CSRFProtection {
  private stateManager: CSRFStateManager

  constructor() {
    this.stateManager = new CSRFStateManager()
  }

  /**
   * Client: Initiate OAuth flow with CSRF protection
   */
  initiateOAuthFlow(redirectUri: string): {
    authUrl: string
    state: string
  } {
    const state = this.stateManager.generateState({
      redirectUri,
      timestamp: Date.now()
    })

    const params = new URLSearchParams({
      client_id: 'lms-esid-2025',
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      // ... other params
    })

    return {
      authUrl: `https://infohub.com/oauth/authorize?${params}`,
      state
    }
  }

  /**
   * Client: Handle OAuth callback with CSRF validation
   */
  handleOAuthCallback(
    receivedState: string,
    authorizationCode: string
  ): boolean {
    // Validate state token
    if (!this.stateManager.validateState(receivedState)) {
      console.error('CSRF validation failed: Invalid state')
      return false
    }

    // State is valid, proceed with token exchange
    console.log('CSRF validation passed, exchanging code:', authorizationCode)
    return true
  }
}
```

### Test Cases

```typescript
describe('CSRF Protection', () => {
  let csrfManager: CSRFStateManager

  beforeEach(() => {
    csrfManager = new CSRFStateManager()
  })

  test('generates unique state tokens', () => {
    const states = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      states.add(generateState())
    }
    expect(states.size).toBe(1000)
  })

  test('state has sufficient entropy', () => {
    const state = generateState()
    // 32 bytes = 256 bits = 64 hex characters
    expect(state.length).toBe(64)
    expect(/^[a-f0-9]{64}$/.test(state)).toBe(true)
  })

  test('validates legitimate state', () => {
    const state = csrfManager.generateState()
    expect(csrfManager.validateState(state)).toBe(true)
  })

  test('rejects unknown state', () => {
    const fakeState = generateState()
    expect(csrfManager.validateState(fakeState)).toBe(false)
  })

  test('enforces single-use states', () => {
    const state = csrfManager.generateState()
    expect(csrfManager.validateState(state)).toBe(true)
    expect(csrfManager.validateState(state)).toBe(false)
  })

  test('expires old states', async () => {
    const state = csrfManager.generateState()

    // Mock time passage (11 minutes)
    jest.advanceTimersByTime(11 * 60 * 1000)

    expect(csrfManager.validateState(state)).toBe(false)
  })

  test('preserves metadata with state', () => {
    const metadata = { userId: '123', returnUrl: '/dashboard' }
    const state = csrfManager.generateState(metadata)

    expect(csrfManager.getStateMetadata(state)).toEqual(metadata)
  })

  test('prevents CSRF attack', () => {
    // Legitimate flow
    const legitimateState = csrfManager.generateState()

    // Attacker tries to forge request with different state
    const attackerState = generateState()

    // Only legitimate state validates
    expect(csrfManager.validateState(legitimateState)).toBe(true)
    expect(csrfManager.validateState(attackerState)).toBe(false)
  })
})
```

### Attack Scenarios Prevented

1. **CSRF Attack**: Attacker cannot forge authorization requests
2. **Session Fixation**: State token binds request to specific session
3. **Replay Attacks**: Single-use enforcement prevents state reuse
4. **State Substitution**: Each state is cryptographically unique

### Security Best Practices

- Use cryptographically secure random generation
- Enforce single-use state tokens
- Implement reasonable TTL (5-10 minutes)
- Store states server-side (Redis/database)
- Include request metadata in state
- Clean up expired states regularly

---

## Webhook Signature Security

### Implementation Code

```typescript
import crypto from 'crypto'

/**
 * Webhook signature generation and verification
 */
export class WebhookSecurity {
  /**
   * Generate HMAC-SHA256 signature for webhook payload
   * Used by Info Hub when sending webhooks
   */
  static generateSignature(
    payload: object | string,
    secret: string
  ): string {
    const data = typeof payload === 'string'
      ? payload
      : JSON.stringify(payload)

    return crypto
      .createHmac('sha256', secret)
      .update(data, 'utf8')
      .digest('hex')
  }

  /**
   * Verify webhook signature using timing-safe comparison
   * Used by LMS when receiving webhooks
   */
  static verifySignature(
    payload: string,
    receivedSignature: string,
    secret: string
  ): boolean {
    // Calculate expected signature
    const expectedSignature = this.generateSignature(payload, secret)

    // Must be same length for timing-safe comparison
    if (receivedSignature.length !== expectedSignature.length) {
      return false
    }

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    )
  }

  /**
   * Generate webhook secret key
   */
  static generateWebhookSecret(): string {
    return `whsec_${crypto.randomBytes(32).toString('hex')}`
  }

  /**
   * Validate webhook timestamp to prevent replay attacks
   */
  static validateTimestamp(
    timestamp: string,
    maxAgeSeconds: number = 300 // 5 minutes
  ): boolean {
    const webhookTime = new Date(timestamp).getTime()
    const currentTime = Date.now()
    const age = Math.abs(currentTime - webhookTime)

    return age <= maxAgeSeconds * 1000
  }
}

/**
 * Complete webhook sender implementation (Info Hub)
 */
export class WebhookSender {
  private webhookUrl: string
  private webhookSecret: string
  private maxRetries: number = 3

  constructor(webhookUrl: string, webhookSecret: string) {
    this.webhookUrl = webhookUrl
    this.webhookSecret = webhookSecret
  }

  async send(event: string, data: any): Promise<void> {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data
    }

    const payloadString = JSON.stringify(payload)
    const signature = WebhookSecurity.generateSignature(
      payloadString,
      this.webhookSecret
    )

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': payload.timestamp,
            'X-Webhook-Event': event
          },
          body: payloadString,
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        console.log(`✅ Webhook sent successfully: ${event}`)
        return

      } catch (error) {
        lastError = error as Error
        console.warn(`⚠️ Webhook attempt ${attempt} failed:`, error)

        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw new Error(`Webhook failed after ${this.maxRetries} attempts: ${lastError?.message}`)
  }
}

/**
 * Complete webhook receiver implementation (LMS)
 */
export class WebhookReceiver {
  private webhookSecret: string
  private maxTimestampAge: number = 300 // 5 minutes

  constructor(webhookSecret: string) {
    this.webhookSecret = webhookSecret
  }

  async handleWebhook(request: Request): Promise<Response> {
    try {
      // Get headers
      const signature = request.headers.get('X-Webhook-Signature')
      const timestamp = request.headers.get('X-Webhook-Timestamp')
      const event = request.headers.get('X-Webhook-Event')

      if (!signature || !timestamp || !event) {
        return new Response(
          JSON.stringify({ error: 'Missing required headers' }),
          { status: 400 }
        )
      }

      // Get raw body for signature verification
      const rawBody = await request.text()

      // Verify timestamp (prevent replay attacks)
      if (!WebhookSecurity.validateTimestamp(timestamp, this.maxTimestampAge)) {
        return new Response(
          JSON.stringify({ error: 'Webhook timestamp too old' }),
          { status: 400 }
        )
      }

      // Verify signature
      if (!WebhookSecurity.verifySignature(rawBody, signature, this.webhookSecret)) {
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 401 }
        )
      }

      // Parse and process payload
      const payload = JSON.parse(rawBody)

      // Process based on event type
      await this.processWebhookEvent(event, payload)

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200 }
      )

    } catch (error) {
      console.error('Webhook processing error:', error)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500 }
      )
    }
  }

  private async processWebhookEvent(event: string, payload: any): Promise<void> {
    switch (event) {
      case 'user.created':
        await this.handleUserCreated(payload.data)
        break
      case 'user.updated':
        await this.handleUserUpdated(payload.data)
        break
      case 'user.deleted':
        await this.handleUserDeleted(payload.data)
        break
      default:
        console.warn(`Unknown webhook event: ${event}`)
    }
  }

  private async handleUserCreated(userData: any): Promise<void> {
    // Implementation specific to your application
    console.log('Processing user.created webhook:', userData)
  }

  private async handleUserUpdated(userData: any): Promise<void> {
    console.log('Processing user.updated webhook:', userData)
  }

  private async handleUserDeleted(userData: any): Promise<void> {
    console.log('Processing user.deleted webhook:', userData)
  }
}
```

### Test Cases

```typescript
describe('Webhook Security', () => {
  const secret = 'whsec_abc123xyz789'

  test('generates consistent signature for same payload', () => {
    const payload = { event: 'user.created', data: { id: '123' } }
    const sig1 = WebhookSecurity.generateSignature(payload, secret)
    const sig2 = WebhookSecurity.generateSignature(payload, secret)
    expect(sig1).toBe(sig2)
  })

  test('generates different signatures for different payloads', () => {
    const payload1 = { event: 'user.created', data: { id: '123' } }
    const payload2 = { event: 'user.created', data: { id: '456' } }
    const sig1 = WebhookSecurity.generateSignature(payload1, secret)
    const sig2 = WebhookSecurity.generateSignature(payload2, secret)
    expect(sig1).not.toBe(sig2)
  })

  test('verifies valid signature', () => {
    const payload = JSON.stringify({ event: 'test', data: {} })
    const signature = WebhookSecurity.generateSignature(payload, secret)
    expect(WebhookSecurity.verifySignature(payload, signature, secret)).toBe(true)
  })

  test('rejects invalid signature', () => {
    const payload = JSON.stringify({ event: 'test', data: {} })
    const invalidSignature = 'invalid_signature_123'
    expect(WebhookSecurity.verifySignature(payload, invalidSignature, secret)).toBe(false)
  })

  test('rejects tampered payload', () => {
    const originalPayload = JSON.stringify({ event: 'test', data: { id: '123' } })
    const signature = WebhookSecurity.generateSignature(originalPayload, secret)

    const tamperedPayload = JSON.stringify({ event: 'test', data: { id: '456' } })
    expect(WebhookSecurity.verifySignature(tamperedPayload, signature, secret)).toBe(false)
  })

  test('validates fresh timestamp', () => {
    const timestamp = new Date().toISOString()
    expect(WebhookSecurity.validateTimestamp(timestamp, 300)).toBe(true)
  })

  test('rejects old timestamp', () => {
    const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago
    expect(WebhookSecurity.validateTimestamp(oldTimestamp, 300)).toBe(false)
  })

  test('timing-safe comparison prevents timing attacks', () => {
    const payload = JSON.stringify({ test: 'data' })
    const correctSig = WebhookSecurity.generateSignature(payload, secret)
    const wrongSig = WebhookSecurity.generateSignature(payload, 'wrong_secret')

    const timings: number[] = []

    for (let i = 0; i < 100; i++) {
      const start = process.hrtime.bigint()
      WebhookSecurity.verifySignature(
        payload,
        i % 2 === 0 ? correctSig : wrongSig,
        secret
      )
      const end = process.hrtime.bigint()
      timings.push(Number(end - start))
    }

    // Check that timing variations are minimal
    const avgTime = timings.reduce((a, b) => a + b) / timings.length
    const maxDeviation = Math.max(...timings.map(t => Math.abs(t - avgTime)))
    expect(maxDeviation / avgTime).toBeLessThan(0.15) // < 15% variation
  })
})
```

### Attack Scenarios Prevented

1. **Signature Forgery**: Attacker cannot create valid signature without secret
2. **Payload Tampering**: Any modification invalidates signature
3. **Replay Attacks**: Timestamp validation prevents old webhook replay
4. **Timing Attacks**: Timing-safe comparison prevents secret extraction

### Security Best Practices

- Use HMAC-SHA256 for signatures (never plain hashes)
- Implement timing-safe signature comparison
- Validate webhook timestamps (5-10 minute window)
- Use strong webhook secrets (32+ bytes of entropy)
- Rotate webhook secrets periodically
- Log all webhook validation failures
- Implement rate limiting on webhook endpoints

---

## Authorization Code Security

### Implementation Code

```typescript
import crypto from 'crypto'

/**
 * Secure authorization code management
 */
export class AuthorizationCodeManager {
  private readonly CODE_LENGTH = 32 // bytes
  private readonly CODE_TTL = 10 * 60 * 1000 // 10 minutes

  /**
   * Generate cryptographically secure authorization code
   */
  generateCode(): string {
    return crypto.randomBytes(this.CODE_LENGTH).toString('base64url')
  }

  /**
   * Store authorization code with metadata
   */
  async storeCode(
    code: string,
    userId: string,
    clientId: string,
    redirectUri: string,
    codeChallenge?: string,
    scope?: string
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + this.CODE_TTL)

    // Store in database
    await db.query(`
      INSERT INTO oauth_authorization_codes
      (code, user_id, client_id, redirect_uri, code_challenge, scope, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [code, userId, clientId, redirectUri, codeChallenge, scope, expiresAt])
  }

  /**
   * Validate and consume authorization code
   */
  async validateCode(
    code: string,
    clientId: string,
    redirectUri: string
  ): Promise<{
    valid: boolean
    userId?: string
    codeChallenge?: string
    scope?: string
    error?: string
  }> {
    // Retrieve code from database
    const result = await db.query(`
      SELECT * FROM oauth_authorization_codes
      WHERE code = $1 AND client_id = $2
    `, [code, clientId])

    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid authorization code' }
    }

    const authCode = result.rows[0]

    // Check if already used (single-use enforcement)
    if (authCode.used_at) {
      // Security: Revoke all tokens for this authorization code
      await this.revokeTokensForCode(code)
      return { valid: false, error: 'Authorization code already used' }
    }

    // Check expiration
    if (new Date(authCode.expires_at) < new Date()) {
      return { valid: false, error: 'Authorization code expired' }
    }

    // Verify redirect_uri matches (prevents code hijacking)
    if (authCode.redirect_uri !== redirectUri) {
      return { valid: false, error: 'Redirect URI mismatch' }
    }

    // Mark as used (single-use enforcement)
    await db.query(`
      UPDATE oauth_authorization_codes
      SET used_at = NOW()
      WHERE code = $1
    `, [code])

    return {
      valid: true,
      userId: authCode.user_id,
      codeChallenge: authCode.code_challenge,
      scope: authCode.scope
    }
  }

  /**
   * Revoke all tokens associated with an authorization code
   * Called when detecting authorization code reuse
   */
  private async revokeTokensForCode(code: string): Promise<void> {
    console.error(`SECURITY ALERT: Authorization code reuse detected for code: ${code}`)

    // Implementation depends on your token storage
    // This is a critical security measure
    await db.query(`
      UPDATE oauth_tokens
      SET revoked = true, revoked_reason = 'code_reuse'
      WHERE authorization_code = $1
    `, [code])
  }

  /**
   * Clean up expired authorization codes
   */
  async cleanupExpiredCodes(): Promise<number> {
    const result = await db.query(`
      DELETE FROM oauth_authorization_codes
      WHERE expires_at < NOW() OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '1 hour')
      RETURNING id
    `)

    return result.rowCount
  }
}

/**
 * Additional security checks for authorization codes
 */
export class AuthorizationCodeSecurity {
  /**
   * Validate authorization code format
   */
  static isValidCodeFormat(code: string): boolean {
    // Base64url characters only
    const validPattern = /^[A-Za-z0-9\-_]+$/

    // Reasonable length (32 bytes = ~43 characters in base64url)
    if (code.length < 40 || code.length > 50) {
      return false
    }

    return validPattern.test(code)
  }

  /**
   * Check for authorization code patterns that might indicate attacks
   */
  static detectSuspiciousCode(code: string): {
    suspicious: boolean
    reason?: string
  } {
    // Check for common test/debug codes
    const testPatterns = [
      /^test/i,
      /^debug/i,
      /^00000/,
      /^11111/,
      /^aaaaa/i
    ]

    for (const pattern of testPatterns) {
      if (pattern.test(code)) {
        return {
          suspicious: true,
          reason: 'Code matches test pattern'
        }
      }
    }

    // Check for sequential characters
    if (/(.)\1{5,}/.test(code)) {
      return {
        suspicious: true,
        reason: 'Code contains sequential characters'
      }
    }

    return { suspicious: false }
  }

  /**
   * Rate limiting for authorization code generation
   */
  static async checkRateLimit(
    clientId: string,
    userId: string
  ): Promise<boolean> {
    const key = `auth_code_rate:${clientId}:${userId}`
    const redis = getRedisClient()

    // Check current count
    const count = await redis.incr(key)

    if (count === 1) {
      // First request, set TTL
      await redis.expire(key, 60) // 1 minute window
    }

    // Allow max 5 authorization codes per minute per user
    return count <= 5
  }
}
```

### Test Cases

```typescript
describe('Authorization Code Security', () => {
  let codeManager: AuthorizationCodeManager

  beforeEach(() => {
    codeManager = new AuthorizationCodeManager()
  })

  test('generates unique authorization codes', () => {
    const codes = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      codes.add(codeManager.generateCode())
    }
    expect(codes.size).toBe(1000)
  })

  test('code has sufficient entropy', () => {
    const code = codeManager.generateCode()
    // 32 bytes = 256 bits of entropy
    expect(code.length).toBeGreaterThanOrEqual(40)
  })

  test('enforces single-use codes', async () => {
    const code = codeManager.generateCode()
    const clientId = 'test-client'
    const redirectUri = 'https://example.com/callback'

    await codeManager.storeCode(code, 'user123', clientId, redirectUri)

    // First use succeeds
    const result1 = await codeManager.validateCode(code, clientId, redirectUri)
    expect(result1.valid).toBe(true)

    // Second use fails
    const result2 = await codeManager.validateCode(code, clientId, redirectUri)
    expect(result2.valid).toBe(false)
    expect(result2.error).toContain('already used')
  })

  test('enforces code expiration', async () => {
    const code = codeManager.generateCode()
    const clientId = 'test-client'
    const redirectUri = 'https://example.com/callback'

    // Store code with past expiration
    await db.query(`
      INSERT INTO oauth_authorization_codes
      (code, client_id, redirect_uri, expires_at)
      VALUES ($1, $2, $3, $4)
    `, [code, clientId, redirectUri, new Date(Date.now() - 1000)])

    const result = await codeManager.validateCode(code, clientId, redirectUri)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('expired')
  })

  test('validates redirect URI binding', async () => {
    const code = codeManager.generateCode()
    const clientId = 'test-client'
    const correctUri = 'https://example.com/callback'
    const wrongUri = 'https://evil.com/callback'

    await codeManager.storeCode(code, 'user123', clientId, correctUri)

    // Wrong redirect URI fails
    const result = await codeManager.validateCode(code, clientId, wrongUri)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Redirect URI mismatch')
  })

  test('detects suspicious code patterns', () => {
    const suspiciousCodes = [
      'test123456789',
      'debug_code_xyz',
      '00000000000000',
      'aaaaaaaaaaaaa'
    ]

    for (const code of suspiciousCodes) {
      const result = AuthorizationCodeSecurity.detectSuspiciousCode(code)
      expect(result.suspicious).toBe(true)
    }

    const legitimateCode = codeManager.generateCode()
    const result = AuthorizationCodeSecurity.detectSuspiciousCode(legitimateCode)
    expect(result.suspicious).toBe(false)
  })

  test('enforces rate limiting', async () => {
    const clientId = 'test-client'
    const userId = 'user123'

    // First 5 requests should pass
    for (let i = 0; i < 5; i++) {
      const allowed = await AuthorizationCodeSecurity.checkRateLimit(clientId, userId)
      expect(allowed).toBe(true)
    }

    // 6th request should fail
    const allowed = await AuthorizationCodeSecurity.checkRateLimit(clientId, userId)
    expect(allowed).toBe(false)
  })
})
```

### Attack Scenarios Prevented

1. **Code Replay**: Single-use enforcement prevents code reuse
2. **Code Substitution**: Client binding prevents using codes for wrong client
3. **Code Hijacking**: Redirect URI validation prevents code theft
4. **Timing Attacks**: Expiration prevents old code usage
5. **Brute Force**: Rate limiting prevents code generation abuse

### Security Best Practices

- Generate codes with high entropy (256 bits)
- Enforce strict single-use policy
- Implement reasonable TTL (5-10 minutes)
- Bind codes to client and redirect URI
- Revoke all tokens on code reuse detection
- Clean up expired codes regularly
- Rate limit code generation per user/client
- Log all validation failures for monitoring

---

## Security Monitoring & Alerts

### Implementation Code

```typescript
/**
 * Security monitoring for SSO operations
 */
export class SSOSecurityMonitor {
  private alertThresholds = {
    failedLogins: 5,        // per user per hour
    invalidCodes: 10,       // per client per hour
    signatureFailures: 3,   // per IP per hour
    pkceFailures: 5        // per client per hour
  }

  /**
   * Log and monitor security events
   */
  async logSecurityEvent(event: {
    type: string
    severity: 'info' | 'warning' | 'critical'
    userId?: string
    clientId?: string
    ipAddress?: string
    details: any
  }): Promise<void> {
    // Log to database
    await db.query(`
      INSERT INTO security_events
      (type, severity, user_id, client_id, ip_address, details, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [event.type, event.severity, event.userId, event.clientId, event.ipAddress, JSON.stringify(event.details)])

    // Check thresholds and alert if necessary
    await this.checkThresholds(event)

    // Send to SIEM if configured
    if (process.env.SIEM_ENDPOINT) {
      await this.sendToSIEM(event)
    }
  }

  /**
   * Check if security thresholds are exceeded
   */
  private async checkThresholds(event: any): Promise<void> {
    const hourAgo = new Date(Date.now() - 3600000)

    switch (event.type) {
      case 'login_failed':
        const loginFailures = await db.query(`
          SELECT COUNT(*) FROM security_events
          WHERE type = 'login_failed'
          AND user_id = $1
          AND created_at > $2
        `, [event.userId, hourAgo])

        if (loginFailures.rows[0].count >= this.alertThresholds.failedLogins) {
          await this.sendAlert('Excessive login failures', event)
        }
        break

      case 'invalid_authorization_code':
        const codeFailures = await db.query(`
          SELECT COUNT(*) FROM security_events
          WHERE type = 'invalid_authorization_code'
          AND client_id = $1
          AND created_at > $2
        `, [event.clientId, hourAgo])

        if (codeFailures.rows[0].count >= this.alertThresholds.invalidCodes) {
          await this.sendAlert('Excessive invalid authorization codes', event)
        }
        break
    }
  }

  /**
   * Send security alert
   */
  private async sendAlert(message: string, event: any): Promise<void> {
    console.error(`SECURITY ALERT: ${message}`, event)

    // Send email/SMS/Slack notification
    // Implementation depends on your notification system
  }

  /**
   * Send to SIEM system
   */
  private async sendToSIEM(event: any): Promise<void> {
    // Send to Splunk, ELK, etc.
    await fetch(process.env.SIEM_ENDPOINT!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SIEM_TOKEN}`
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        source: 'sso-system',
        ...event
      })
    })
  }
}
```

---

## Security Checklist Summary

### Pre-Deployment Checklist

#### PKCE Implementation
- [ ] Code verifier: 43-128 characters, high entropy
- [ ] Code challenge: SHA-256 hash, base64url encoded
- [ ] Server-side PKCE verification implemented
- [ ] Timing-safe comparison used
- [ ] Test coverage > 90%

#### CSRF Protection
- [ ] State tokens: 32 bytes entropy minimum
- [ ] Single-use state enforcement
- [ ] State expiration (10 minutes)
- [ ] State validation on callback
- [ ] Server-side state storage

#### Webhook Security
- [ ] HMAC-SHA256 signatures implemented
- [ ] Timing-safe signature verification
- [ ] Timestamp validation (5 minute window)
- [ ] Retry logic with exponential backoff
- [ ] Webhook secret rotation plan

#### Authorization Codes
- [ ] High entropy generation (32 bytes)
- [ ] Single-use enforcement
- [ ] Expiration (10 minutes)
- [ ] Client/redirect URI binding
- [ ] Token revocation on code reuse

#### General Security
- [ ] All endpoints use HTTPS
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] Error messages don't leak information
- [ ] Logging and monitoring active

### Production Security Checklist

#### Infrastructure
- [ ] TLS 1.2+ enforced
- [ ] HSTS headers configured
- [ ] CSP headers configured
- [ ] Database connections encrypted
- [ ] Secrets in secure vault

#### Monitoring
- [ ] Failed authentication alerts
- [ ] Suspicious pattern detection
- [ ] Rate limit breach alerts
- [ ] Webhook failure alerts
- [ ] Security event logging

#### Incident Response
- [ ] Token revocation procedure
- [ ] User lockout capability
- [ ] Audit trail complete
- [ ] Rollback plan ready
- [ ] Security team contacts

### Compliance Checklist

#### OWASP Requirements
- [ ] A01: Broken Access Control - Mitigated
- [ ] A02: Cryptographic Failures - Mitigated
- [ ] A03: Injection - Mitigated
- [ ] A04: Insecure Design - Mitigated
- [ ] A07: Identification/Authentication - Mitigated

#### OAuth 2.0 Compliance
- [ ] RFC 6749: Core specification
- [ ] RFC 7636: PKCE implementation
- [ ] RFC 6819: Threat model
- [ ] RFC 8252: Native app BCP
- [ ] RFC 7662: Token introspection

---

## Security Contact Information

**Security Team**: security@kcis.edu.tw
**Emergency Contact**: +886-2-1234-5678
**Security Documentation**: https://docs.kcis.edu.tw/security
**Incident Response**: https://incident.kcis.edu.tw