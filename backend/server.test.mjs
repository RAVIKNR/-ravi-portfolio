import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createContactServer } from './server.mjs'

const env = {
  MAILJET_API_KEY: 'test-api-key',
  MAILJET_API_SECRET: 'test-api-secret',
  CONTACT_RECEIVER_EMAIL: 'owner@example.com',
  MAILJET_SENDER_EMAIL: 'verified@example.com',
  CONTACT_ALLOWED_ORIGIN: 'http://localhost:5173',
}

let server
let endpoint
let mailjetFetch
let mailjetCalls

before(async () => {
  mailjetCalls = []
  mailjetFetch = async (url, options) => {
    mailjetCalls.push({ url, options })
    return Response.json({ Messages: [{ Status: 'success' }] })
  }
  server = createContactServer({
    env,
    mailjetFetch,
    now: () => new Date('2026-11-12T00:00:00.000Z'),
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  endpoint = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
})

test('validates the request and sends to Mailjet with the visitor as Reply-To', async () => {
  const response = await fetch(`${endpoint}/api/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: env.CONTACT_ALLOWED_ORIGIN,
    },
    body: JSON.stringify({
      name: 'Visitor',
      email: 'visitor@example.net',
      subject: 'A project question',
      message: 'Hello\nI would like to talk.',
    }),
  })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    message: 'Message sent successfully.',
  })
  assert.equal(mailjetCalls.length, 1)

  const { url, options } = mailjetCalls[0]
  assert.equal(url, 'https://api.mailjet.com/v3.1/send')
  assert.equal(
    options.headers.Authorization,
    `Basic ${Buffer.from('test-api-key:test-api-secret').toString('base64')}`,
  )

  const message = JSON.parse(options.body).Messages[0]
  assert.deepEqual(message.From, {
    Email: 'verified@example.com',
    Name: 'Portfolio Contact',
  })
  assert.deepEqual(message.To, [{ Email: 'owner@example.com' }])
  assert.deepEqual(message.ReplyTo, {
    Email: 'visitor@example.net',
    Name: 'Visitor',
  })
  assert.match(message.TextPart, /A project question/)
  assert.match(message.TextPart, /2026-11-12T00:00:00\.000Z/)
  assert.match(message.TextPart, /Hello\nI would like to talk\./)
  assert.match(message.HTMLPart, /width="600"/)
  assert.match(message.HTMLPart, /background-color:#090909/)
  assert.match(message.HTMLPart, /background-color:#111111/)
  assert.match(message.HTMLPart, /WELL, WELL, WELL\.\.\./)
  assert.match(message.HTMLPart, /Trouble just found my inbox\./)
  assert.match(message.HTMLPart, /Someone has an idea\. Apparently, ignoring it wasn't an option\. Let's see what we're dealing with\./)
  assert.match(message.HTMLPart, /THE SUSPECT/)
  assert.match(message.HTMLPart, /THE EVIDENCE/)
  assert.match(message.HTMLPart, /LET'S ENTER THE CHAOS ↗/)
  assert.match(message.HTMLPart, /ANOTHER IDEA\. ANOTHER ADVENTURE\./)
  assert.match(message.HTMLPart, /mailto:visitor%40example\.net/)
  assert.match(message.TextPart, /WELL, WELL, WELL\.\.\./)
  assert.match(message.TextPart, /Trouble just found my inbox\./)
  assert.match(message.TextPart, /Someone has an idea\. Apparently, ignoring it wasn't an option\. Let's see what we're dealing with\./)
  assert.match(message.TextPart, /THE SUSPECT/)
  assert.match(message.TextPart, /THE EVIDENCE/)
  assert.match(message.TextPart, /LET'S ENTER THE CHAOS ↗\nmailto:visitor%40example\.net/)
  assert.match(message.TextPart, /ANOTHER IDEA\. ANOTHER ADVENTURE\./)
  assert.match(message.TextPart, /RAVI YADAV · PORTFOLIO CONTACT/)
})

test('escapes visitor content in HTML and preserves the complete plain-text message', async () => {
  const messageText = 'First paragraph.\n\n<script>alert("x")</script> & goodbye.'
  const response = await fetch(`${endpoint}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '<b>Visitor</b>',
      email: 'visitor+hello@example.net',
      subject: 'Question <em>about work</em>',
      message: messageText,
    }),
  })

  assert.equal(response.status, 200)
  const mailjetMessage = JSON.parse(mailjetCalls.at(-1).options.body).Messages[0]
  assert.match(mailjetMessage.HTMLPart, /&lt;b&gt;Visitor&lt;\/b&gt;/)
  assert.match(mailjetMessage.HTMLPart, /Question &lt;em&gt;about work&lt;\/em&gt;/)
  assert.match(mailjetMessage.HTMLPart, /First paragraph\.<br><br>&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; goodbye\./)
  assert.doesNotMatch(mailjetMessage.HTMLPart, /<script>/)
  assert.match(mailjetMessage.HTMLPart, /mailto:visitor%2Bhello%40example\.net/)
  assert.ok(mailjetMessage.TextPart.includes(messageText))
  assert.match(mailjetMessage.TextPart, /LET'S ENTER THE CHAOS ↗\nmailto:visitor%2Bhello%40example\.net/)
  assert.deepEqual(mailjetMessage.ReplyTo, {
    Email: 'visitor+hello@example.net',
    Name: '<b>Visitor</b>',
  })
})

test('rejects invalid email addresses without calling Mailjet', async () => {
  const callCount = mailjetCalls.length
  const response = await fetch(`${endpoint}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Visitor',
      email: 'not-an-email',
      message: 'Hello',
    }),
  })

  assert.equal(response.status, 400)
  assert.equal(mailjetCalls.length, callCount)
})

test('returns a generic error when Mailjet does not accept a message', async () => {
  const failingServer = createContactServer({
    env,
    mailjetFetch: async () => Response.json({
      Messages: [{ Status: 'error', Errors: [{ ErrorMessage: 'private detail' }] }],
    }),
  })
  await new Promise((resolve) => failingServer.listen(0, '127.0.0.1', resolve))

  try {
    const response = await fetch(
      `http://127.0.0.1:${failingServer.address().port}/api/contact`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Visitor',
          email: 'visitor@example.net',
          message: 'Hello',
        }),
      },
    )
    const body = await response.text()

    assert.equal(response.status, 502)
    assert.equal(body, '{"error":"Message delivery failed. Please try again later."}')
    assert.equal(body.includes('private detail'), false)
  } finally {
    await new Promise((resolve, reject) => {
      failingServer.close((error) => (error ? reject(error) : resolve()))
    })
  }
})

test('rejects requests from origins other than the configured portfolio', async () => {
  const callCount = mailjetCalls.length
  const response = await fetch(`${endpoint}/api/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://untrusted.example',
    },
    body: JSON.stringify({
      name: 'Visitor',
      email: 'visitor@example.net',
      message: 'Hello',
    }),
  })

  assert.equal(response.status, 403)
  assert.equal(mailjetCalls.length, callCount)
})

test('allows the configured local origin to preflight a JSON POST', async () => {
  const response = await fetch(`${endpoint}/api/contact`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  })

  assert.equal(response.status, 204)
  assert.equal(response.headers.get('access-control-allow-origin'), env.CONTACT_ALLOWED_ORIGIN)
  assert.match(response.headers.get('access-control-allow-methods') ?? '', /POST/)
  assert.match(response.headers.get('access-control-allow-headers') ?? '', /Content-Type/i)
})

test('rejects oversized request bodies before calling Mailjet', async () => {
  const callCount = mailjetCalls.length
  const response = await fetch(`${endpoint}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Visitor',
      email: 'visitor@example.net',
      message: 'x'.repeat(49 * 1024),
    }),
  })

  assert.equal(response.status, 413)
  assert.equal(mailjetCalls.length, callCount)
})

test('does not send with placeholder Mailjet credentials', async () => {
  const placeholderServer = createContactServer({
    env: {
      ...env,
      MAILJET_API_KEY: 'YOUR_NEW_MAILJET_API_KEY',
      MAILJET_API_SECRET: 'YOUR_NEW_MAILJET_API_SECRET',
    },
    mailjetFetch: async () => {
      assert.fail('Mailjet must not be called with placeholder credentials.')
    },
  })
  await new Promise((resolve) => placeholderServer.listen(0, '127.0.0.1', resolve))

  try {
    const response = await fetch(
      `http://127.0.0.1:${placeholderServer.address().port}/api/contact`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Visitor',
          email: 'visitor@example.net',
          message: 'Hello',
        }),
      },
    )

    assert.equal(response.status, 503)
  } finally {
    await new Promise((resolve, reject) => {
      placeholderServer.close((error) => (error ? reject(error) : resolve()))
    })
  }
})

test('fails safely when server-side Mailjet configuration is missing', async () => {
  const unconfiguredServer = createContactServer({
    env: { CONTACT_ALLOWED_ORIGIN: env.CONTACT_ALLOWED_ORIGIN },
    mailjetFetch: async () => {
      assert.fail('Mailjet must not be called without server credentials.')
    },
  })
  await new Promise((resolve) => unconfiguredServer.listen(0, '127.0.0.1', resolve))

  try {
    const response = await fetch(
      `http://127.0.0.1:${unconfiguredServer.address().port}/api/contact`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Visitor',
          email: 'visitor@example.net',
          message: 'Hello',
        }),
      },
    )

    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), {
      error: 'Contact service is not configured.',
    })
  } finally {
    await new Promise((resolve, reject) => {
      unconfiguredServer.close((error) => (error ? reject(error) : resolve()))
    })
  }
})
