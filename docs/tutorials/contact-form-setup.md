# Walkthrough: switching on the contact form

The code is done: the `/contact` page, the `POST /api/contact` Lambda route, and the AWS
pieces (an SES identity for appbep.com with its DNS records, and the Lambda's permissions).
What's left are the parts that involve **accounts and secrets**, which never go in git. You
do those by hand, in this order. Allow about an hour, most of it waiting for emails and DNS.

Until you finish, nothing breaks: the page says "The contact form isn't open yet", and the
API answers `503 not_configured`.

```
 visitor ── /contact page ── Turnstile widget (Cloudflare) ── token
                │
                └─ POST /api/contact ─▶ Lambda ─┬─ SSM: your inbox address, Turnstile secret
                                                ├─ Cloudflare: is this token real?
                                                ├─ DynamoDB: under 3 messages today?
                                                └─ SES: email to you, Reply-To = visitor
```

| Piece                         | Where it lives                               | Public?             |
| ----------------------------- | -------------------------------------------- | ------------------- |
| Turnstile **site key**        | `web/src/pages/contactConfig.ts` (git)       | yes, by design      |
| Turnstile **secret key**      | SSM `/appbep/contact/turnstile-secret` (AWS) | **no**              |
| Your inbox address            | SSM `/appbep/contact/to` (AWS)               | **no**              |
| Sending domain + DKIM records | SES + Route 53, created by CDK               | DNS is public, fine |

Use the **`appbep`** profile and **us-east-1** for everything AWS below (in the console,
check the region menu at the top right says N. Virginia).

---

## Step 1: deploy the code

Merge the contact form commit to `main` and let the Deploy workflow finish. That creates:

- an SES **domain identity** for `appbep.com`, plus three DKIM `CNAME` records in Route 53.
  DKIM is a signature on each email that proves it really came from appbep.com; without it,
  Gmail would likely file the messages as spam.
- a `_dmarc` TXT record (`p=none`: "I sign my mail; just report problems, don't block").

**Check:** SES console → **Identities** → `appbep.com`. Within a few minutes (rarely up to a
day) its status becomes **Verified** and "DKIM configuration" says **Successful**.

## Step 2: create the Turnstile widget (Cloudflare)

Turnstile is Cloudflare's free "are you human" check. Most people never see a puzzle.

1. Sign up at **dash.cloudflare.com** (free; you don't need to move your domain or DNS to
   Cloudflare).
2. Left menu: **Turnstile** → **Add widget**.
   - Widget name: `appbep.com contact form`
   - Hostnames: `appbep.com` and `www.appbep.com`
   - Widget mode: **Managed** (Cloudflare decides when to show a checkbox)
   - Pre-clearance: **No**
3. Create. You get two keys:
   - **Site key**: public. Paste it into `web/src/pages/contactConfig.ts`:
     `export const TURNSTILE_SITE_KEY = '0x4AAAA...';`
   - **Secret key**: private. Don't paste it anywhere except the command in step 3. If it
     ever leaks, Cloudflare's widget page has **Rotate secret key**.

## Step 3: put the two private settings in AWS (SSM Parameter Store)

Parameter Store keeps small settings and secrets. Standard parameters are free.
`SecureString` means encrypted at rest; only things with permission can read it (your
admin login and the API Lambda).

From a terminal (signed in with `aws sso login --profile appbep` if needed):

```bash
# 1. Where messages go. Use your +contact alias.
aws ssm put-parameter --profile appbep --region us-east-1 \
  --name /appbep/contact/to --type String \
  --value 'YOUR_ADDRESS+contact@gmail.com'

# 2. The Turnstile secret. `read -s` keeps it out of your screen and shell history.
read -rsp 'Turnstile secret key: ' S; echo
aws ssm put-parameter --profile appbep --region us-east-1 \
  --name /appbep/contact/turnstile-secret --type SecureString --value "$S"
unset S
```

**Check:** `aws ssm get-parameters-by-path --profile appbep --region us-east-1 --path /appbep/contact`
lists both (the secret shows as encrypted gibberish, which is right).

To change one later, run the same command with `--overwrite`. The Lambda remembers settings
for up to 5 minutes, so a change can take that long to show up.

## Step 4: verify your inbox in SES

New AWS accounts start in the SES **sandbox**: they can only send to addresses they've
verified. That's fine here, because the form only ever sends to **you**. The visitor's
address goes in `Reply-To`, which isn't a recipient. So you never need to ask AWS for
"production access". (Sandbox limits: 200 emails a day, 1 a second. Far more than enough.)

1. SES console → **Identities** → **Create identity** → **Email address**.
2. Enter the same `+contact` address as in step 3 → **Create identity**.
3. Open the email from Amazon Web Services in your Gmail and click the link (it expires in
   24 hours). The identity turns **Verified**.

## Step 5: ship the site key

Commit the change to `contactConfig.ts` (step 2) on a branch, open a PR, merge. When the
deploy finishes, `/contact` shows the form instead of "not open yet".

## Step 6: test it for real

1. On your phone, open **appbep.com/contact**, fill it in with a different email of yours
   (or a friend's), and send. You should see "Thanks! Your message is on its way."
2. The email arrives at your `+contact` address within a minute, from
   `appbep.com contact form <contact-form@appbep.com>`. Check Spam the first time; if it's
   there, mark it **Not spam**, and add a Gmail filter on `to:(+contact)` to label it.
3. Press **Reply**: it should be addressed to the visitor, not to contact-form@appbep.com.
4. Optional checks from a terminal:
   ```bash
   curl -s -X POST https://appbep.com/api/contact -d '{}'      # {"error":"invalid_request"}
   ```

## Step 7: link to it

The page is at `/contact`. Where and how to link it from the front page is up to you, in your
own words (for example, a `{ label: 'Contact', href: '/contact' }` entry in `site.links` in
`web/src/site.ts`).

---

## If something goes wrong

The Lambda logs every failure: CloudWatch → **Log groups** → the one starting `Appbep-ApiLogs`.

| The page says                           | Likely cause                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| "isn't open yet"                        | Site key not in `contactConfig.ts` (page), or an SSM parameter missing/misnamed (API 503) |
| "are you human check didn't go through" | Wrong secret in SSM, or the widget's hostnames don't include the one you're on            |
| "Something went wrong"                  | SES refused (502): the appbep.com identity or your inbox identity isn't Verified yet      |
| "That's the limit for today"            | Working as intended: 3 per visitor per UTC day                                            |
| Turnstile box never appears             | An ad/tracker blocker blocking `challenges.cloudflare.com`; try another browser           |

## How the spam defenses work (for the curious)

All of these run on the server; anything only in the browser, a bot can skip.

1. **Content checks**: name, email shape, 10-5,000 characters, at most 2 links. Done first,
   because a Turnstile token works only once: someone fixing a typo shouldn't redo the check.
2. **Honeypot**: a "Website" field placed off-screen. People never fill it in; naive bots fill
   in everything. If it's filled, the API says "sent!" and drops it, so the bot learns nothing.
3. **Fill time**: sent less than 3 seconds after the page loaded? A bot. Same fake "sent!".
4. **Turnstile**: the Lambda asks Cloudflare whether the token is real.
5. **Daily limit**: 3 messages per visitor per day. The visitor is stored as a keyed hash of
   their IP and the date (`HMAC-SHA256`, keyed with the Turnstile secret), never the IP
   itself, and the record deletes itself after 2 days (DynamoDB TTL).
6. **API throttling**: the whole API is capped at 10 requests/second.

Cost: SES charges $0.10 per 1,000 emails. Turnstile, SSM and this much DynamoDB are free.
