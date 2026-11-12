import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CONTACT_PATH = '/api/contact'
const HEALTH_PATH = '/healthz'
const MAX_BODY_BYTES = 48 * 1024
const MAX_NAME_LENGTH = 120
const MAX_EMAIL_LENGTH = 254
const MAX_SUBJECT_LENGTH = 200
const MAX_MESSAGE_LENGTH = 10_000
const MAILJET_SEND_URL = 'https://api.mailjet.com/v3.1/send'
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

function loadLocalEnvironment(filePath) {
  let contents
  try {
    contents = readFileSync(filePath, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) continue

    let value = match[2]
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    } else {
      value = value.replace(/\s+#.*$/, '')
    }

    if (process.env[match[1]] === undefined) {
      process.env[match[1]] = value
    }
  }
}

class RequestError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

function respond(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

function sanitizeSingleLine(value) {
  return value
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
}

function sanitizeMessage(value) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim()
}

function validateContact(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new RequestError(400, 'Please provide valid contact form data.')
  }

  if (
    typeof payload.name !== 'string' ||
    typeof payload.email !== 'string' ||
    typeof payload.message !== 'string' ||
    (payload.subject !== undefined && typeof payload.subject !== 'string')
  ) {
    throw new RequestError(400, 'Please provide valid contact form data.')
  }

  const name = sanitizeSingleLine(payload.name)
  const email = sanitizeSingleLine(payload.email)
  const subject = sanitizeSingleLine(payload.subject ?? '')
  const message = sanitizeMessage(payload.message)

  if (!name || name.length > MAX_NAME_LENGTH) {
    throw new RequestError(400, 'Please enter a valid name.')
  }
  if (
    !email ||
    email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_PATTERN.test(email)
  ) {
    throw new RequestError(400, 'Please enter a valid email address.')
  }
  if (subject.length > MAX_SUBJECT_LENGTH) {
    throw new RequestError(400, 'The subject is too long.')
  }
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    throw new RequestError(400, 'Please enter a valid message.')
  }

  return { name, email, subject, message }
}

function readJsonBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = []
    let size = 0
    let rejected = false

    request.on('data', (chunk) => {
      if (rejected) return
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        rejected = true
        rejectBody(new RequestError(413, 'The submitted message is too large.'))
        return
      }
      chunks.push(chunk)
    })

    request.on('end', () => {
      if (rejected) return
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        rejectBody(new RequestError(400, 'Please provide valid JSON.'))
      }
    })

    request.on('error', (error) => {
      if (!rejected) rejectBody(error)
    })
  })
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })
}

function getMailjetConfig(env) {
  const config = {
    apiKey: env.MAILJET_API_KEY?.trim(),
    apiSecret: env.MAILJET_API_SECRET?.trim(),
    receiver: env.CONTACT_RECEIVER_EMAIL?.trim(),
    sender: env.MAILJET_SENDER_EMAIL?.trim(),
  }

  if (
    !config.apiKey ||
    !config.apiSecret ||
    /^(?:your_|replace_|placeholder|<)/i.test(config.apiKey) ||
    /^(?:your_|replace_|placeholder|<)/i.test(config.apiSecret) ||
    !config.receiver ||
    !config.sender ||
    !EMAIL_PATTERN.test(config.receiver) ||
    !EMAIL_PATTERN.test(config.sender)
  ) {
    return null
  }

  return config
}

async function sendContactEmail(contact, config, mailjetFetch, now) {
  const submittedAt = now().toISOString()
  const subject = contact.subject || `Portfolio contact from ${contact.name}`
  const safeName = escapeHtml(contact.name)
  const safeEmail = escapeHtml(contact.email)
  const safeSubject = escapeHtml(contact.subject || '(none)')
  const safeMessage = escapeHtml(contact.message).replace(/\r\n|\r|\n/g, '<br>')
  const replyUrl = `mailto:${encodeURIComponent(contact.email)}`

  const textPart = [
    'RAVI.                                      CONTACT / INCOMING',
    '',
    'WELL, WELL, WELL...',
    'Trouble just found my inbox.',
    "Someone has an idea. Apparently, ignoring it wasn't an option. Let's see what we're dealing with.",
    '',
    'THE SUSPECT',
    '',
    'NAME',
    contact.name,
    '',
    'EMAIL',
    contact.email,
    '',
    'SUBJECT',
    contact.subject || '(none)',
    '',
    'RECEIVED',
    submittedAt,
    '',
    'THE EVIDENCE',
    '',
    contact.message,
    '',
    "LET'S ENTER THE CHAOS ↗",
    replyUrl,
    '',
    'ANOTHER IDEA. ANOTHER ADVENTURE.',
    'RAVI YADAV · PORTFOLIO CONTACT',
  ].join('\n')

  const htmlPart = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Contact / Incoming</title>
  </head>
  <body style="margin:0;padding:0;background-color:#090909;color:#F3F1ED;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#090909" style="width:100%;background-color:#090909;">
      <tr>
        <td align="center" style="padding:32px 16px;background-color:#090909;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#111111" style="width:100%;max-width:600px;background-color:#111111;">
            <tr>
              <td style="padding:28px 32px 22px;border-bottom:1px solid #303030;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="left" style="color:#F3F1ED;font-size:19px;font-weight:700;letter-spacing:3px;">RAVI<span style="color:#F07842;">.</span></td>
                    <td align="right" style="color:#929292;font-size:10px;font-weight:600;letter-spacing:1.6px;">CONTACT / INCOMING</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:42px 32px 34px;">
                <p style="margin:0 0 15px;color:#F07842;font-size:10px;font-weight:700;letter-spacing:2px;line-height:1.5;">WELL, WELL, WELL...</p>
                <h1 style="margin:0;color:#F3F1ED;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;line-height:1.2;letter-spacing:-0.5px;">Trouble just found my inbox.</h1>
                <p style="margin:14px 0 0;color:#929292;font-size:14px;line-height:1.7;">Someone has an idea. Apparently, ignoring it wasn't an option. Let's see what we're dealing with.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid #303030;">
                  <tr>
                    <td colspan="2" style="padding:18px 0 8px;border-bottom:1px solid #303030;color:#F07842;font-size:10px;font-weight:700;letter-spacing:1.5px;line-height:1.6;">THE SUSPECT</td>
                  </tr>
                  <tr>
                    <td width="112" valign="top" style="width:112px;padding:17px 12px 17px 0;border-bottom:1px solid #303030;color:#929292;font-size:10px;font-weight:700;letter-spacing:1.5px;line-height:1.6;">NAME</td>
                    <td valign="top" style="padding:15px 0;border-bottom:1px solid #303030;color:#F3F1ED;font-size:14px;line-height:1.7;overflow-wrap:anywhere;word-break:break-word;">${safeName}</td>
                  </tr>
                  <tr>
                    <td width="112" valign="top" style="width:112px;padding:17px 12px 17px 0;border-bottom:1px solid #303030;color:#929292;font-size:10px;font-weight:700;letter-spacing:1.5px;line-height:1.6;">EMAIL</td>
                    <td valign="top" style="padding:15px 0;border-bottom:1px solid #303030;color:#F3F1ED;font-size:14px;line-height:1.7;overflow-wrap:anywhere;word-break:break-word;">${safeEmail}</td>
                  </tr>
                  <tr>
                    <td width="112" valign="top" style="width:112px;padding:17px 12px 17px 0;border-bottom:1px solid #303030;color:#929292;font-size:10px;font-weight:700;letter-spacing:1.5px;line-height:1.6;">SUBJECT</td>
                    <td valign="top" style="padding:15px 0;border-bottom:1px solid #303030;color:#F3F1ED;font-size:14px;line-height:1.7;overflow-wrap:anywhere;word-break:break-word;">${safeSubject}</td>
                  </tr>
                  <tr>
                    <td width="112" valign="top" style="width:112px;padding:17px 12px 17px 0;border-bottom:1px solid #303030;color:#929292;font-size:10px;font-weight:700;letter-spacing:1.5px;line-height:1.6;">RECEIVED</td>
                    <td valign="top" style="padding:15px 0;border-bottom:1px solid #303030;color:#929292;font-size:12px;line-height:1.7;">${submittedAt}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 32px 0;">
                <p style="margin:0 0 16px;color:#F07842;font-size:10px;font-weight:700;letter-spacing:2px;line-height:1.5;">THE EVIDENCE</p>
                <div style="color:#F3F1ED;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.85;overflow-wrap:anywhere;word-break:break-word;">${safeMessage}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 32px 38px;">
                <a href="${replyUrl}" style="color:#F07842;font-size:10px;font-weight:700;letter-spacing:1.5px;line-height:1.6;text-decoration:none;">LET'S ENTER THE CHAOS ↗</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 24px;border-top:1px solid #303030;">
                <p style="margin:0 0 7px;color:#929292;font-size:9px;font-weight:700;letter-spacing:1.6px;line-height:1.6;">ANOTHER IDEA. ANOTHER ADVENTURE.</p>
                <p style="margin:0;color:#777777;font-size:9px;font-weight:600;letter-spacing:1.2px;line-height:1.6;">RAVI YADAV · PORTFOLIO CONTACT</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const mailjetResponse = await mailjetFetch(MAILJET_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${config.apiKey}:${config.apiSecret}`,
      ).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: config.sender, Name: 'Portfolio Contact' },
          To: [{ Email: config.receiver }],
          ReplyTo: { Email: contact.email, Name: contact.name },
          Subject: subject,
          TextPart: textPart,
          HTMLPart: htmlPart,
        },
      ],
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!mailjetResponse.ok) {
    console.error(`Mailjet contact delivery failed (HTTP ${mailjetResponse.status}).`)
    return false
  }

  const result = await mailjetResponse.json()
  return result?.Messages?.[0]?.Status === 'success'
}

export function createContactServer({
  env = process.env,
  mailjetFetch = fetch,
  now = () => new Date(),
} = {}) {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')

    if (url.pathname === HEALTH_PATH && request.method === 'GET') {
      respond(response, 200, { status: 'ok' })
      return
    }

    if (url.pathname !== CONTACT_PATH) {
      respond(response, 404, { error: 'Not found.' })
      return
    }

    const origin = request.headers.origin
    const allowedOrigin = env.CONTACT_ALLOWED_ORIGIN?.trim()
    if (origin && (!allowedOrigin || origin !== allowedOrigin)) {
      respond(response, 403, { error: 'Origin not allowed.' })
      return
    }

    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', allowedOrigin)
      response.setHeader('Vary', 'Origin')
    }

    if (request.method === 'OPTIONS') {
      response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      response.writeHead(204)
      response.end()
      return
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST, OPTIONS')
      respond(response, 405, { error: 'Method not allowed.' })
      return
    }

    const contentLength = Number(request.headers['content-length'])
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      request.resume()
      respond(response, 413, { error: 'The submitted message is too large.' })
      return
    }

    if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] ?? '')) {
      request.resume()
      respond(response, 415, { error: 'Content-Type must be application/json.' })
      return
    }

    try {
      const contact = validateContact(await readJsonBody(request))
      const config = getMailjetConfig(env)
      if (!config) {
        respond(response, 503, { error: 'Contact service is not configured.' })
        return
      }

      const sent = await sendContactEmail(contact, config, mailjetFetch, now)
      if (!sent) {
        console.error('Mailjet did not accept the contact message.')
        respond(response, 502, {
          error: 'Message delivery failed. Please try again later.',
        })
        return
      }

      respond(response, 200, { message: 'Message sent successfully.' })
    } catch (error) {
      if (error instanceof RequestError) {
        respond(response, error.statusCode, { error: error.message })
        return
      }

      console.error('Mailjet contact delivery failed.')
      respond(response, 502, {
        error: 'Message delivery failed. Please try again later.',
      })
    }
  })
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  loadLocalEnvironment(fileURLToPath(new URL('./.env', import.meta.url)))
  const port = Number(process.env.PORT ?? 10_000)
  const server = createContactServer()
  server.listen(port, '0.0.0.0', () => {
    console.log(`Contact API listening on port ${port}.`)
  })
}
