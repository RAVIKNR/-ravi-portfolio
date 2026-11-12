# Contact API

This dependency-free Node.js service accepts `POST /api/contact`, validates the
existing portfolio form fields, and sends a notification with Mailjet's HTTPS
Email API (`https://api.mailjet.com/v3.1/send`). `GET /healthz` is available for
service health checks.

## Local checks

Run the API tests with `npm test`. To run the server locally, use Node.js 20.6
or newer and set the variables in `.env`, then run `npm start`. On local
startup, the server loads `backend/.env` without replacing variables already
set in the process environment. On Render, set the variables in the dashboard;
Render supplies `PORT`.

## Render setup

Create a separate **Web Service** from the same repository:

- Root Directory: `frontend/backend` when the repository root is
  `C:\ravi-portfolio`
- Runtime: Node
- Build Command: `npm install --omit=dev`
- Start Command: `npm start`

Set these variables in the backend service's Render dashboard:

- `MAILJET_API_KEY`
- `MAILJET_API_SECRET`
- `CONTACT_RECEIVER_EMAIL`
- `MAILJET_SENDER_EMAIL`
- `CONTACT_ALLOWED_ORIGIN` — the exact deployed portfolio origin, with no path
  or trailing slash

Render supplies `PORT`. Do not add Mailjet credentials to the frontend service.
In the existing frontend service, set the build-time variable
`VITE_CONTACT_FORM_ENDPOINT` to
`https://<contact-api-service>.onrender.com/api/contact`, then redeploy the
frontend so the API URL is included in its build.
