# Problem reports: admin server setup

The extension (v9.4.0+) has a **Message the admin** card in Setup, plus a chat icon in the header.
Users pick a category, describe the problem and tap **Send to admin**. The extension POSTs the report to your
license server at `POST /api/report` (same server as `/api/auth` and `/api/validate`).

Until that endpoint exists, nothing is lost: reports are **saved on the user's computer and retried automatically**
every 5 minutes (and when they tap Retry). The user sees "Saved on this computer... it will keep retrying".
The moment you deploy the endpoint, queued reports start arriving.

## 1. The endpoint you need to add

`POST /api/report` — JSON body:

| field         | type    | notes                                                                         |
|---------------|---------|-------------------------------------------------------------------------------|
| `token`       | string  | the user's session token (same one `/api/validate` receives)                  |
| `deviceId`    | string  | locked device id                                                              |
| `version`     | string  | extension version                                                             |
| `rid`         | string  | client-generated unique id. **Use it to de-duplicate** (retries resend it)    |
| `category`    | string  | `bug` `phone` `sheet` `contacts` `access` `idea` `other`                      |
| `message`     | string  | 10 to 1500 chars, written by the user                                         |
| `diagnostics` | object? | optional. app/chrome/os versions, which settings are filled in, counts, masked log tail. Phone numbers, IPs and emails are masked by the extension |
| `createdAt`   | number  | ms timestamp from the user's computer                                         |

Responses (HTTP 200 always, like your other endpoints):

* success: `{ "ok": true, "id": "<your report id>" }`
* failure: `{ "ok": false, "reason": "session_expired" | "rate_limited" | "bad_request" | "server_error" }`

The extension treats `session_expired`, `rate_limited` and `server_error` as "keep it queued and retry later".
An HTTP 404/405 is treated as "endpoint not deployed yet".

Server rules to apply: verify the session exactly as `/api/validate` does, rate limit (suggest 10 per hour per user),
validate category/length, de-duplicate by `rid`, store with the user's email and name from the session.

A ready-to-adapt handler is in `api-report.example.js`.

## 2. Dashboard page ("Reports")

Suggested columns: received time, user (name/email), category, message (first line), status, app version.
Row details: full message, the `diagnostics` JSON (pretty printed), device id.
Statuses: `new` (default), `seen`, `resolved`. Add a filter and a badge with the count of `new`.
Admin API sketch (protect it with your existing admin auth):

* `GET  /api/admin/reports?status=new`   -> `{ reports: [...] }`
* `POST /api/admin/reports/:id`          -> body `{ "status": "seen" | "resolved", "note": "optional" }`

## 3. Privacy notes

* The extension never sends passwords, contact names or phone numbers in diagnostics.
* The free-text message is whatever the user writes. The form tells them not to include passwords.
* Consider deleting resolved reports after 90 days.
