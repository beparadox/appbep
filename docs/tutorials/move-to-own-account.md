# Runbook: move Appbep into its own AWS account

**Why.** Appbep was deployed into the AWS Organization's **management account**, which also hosts
Mathisthenics. AWS recommends using the management account only to run the organization (billing,
accounts, Identity Center) and putting each application in its own **member account**. In a
shared account, a deploy role meant for one app can reach the other app's resources. A separate
account makes that impossible.

**What moves.** Nothing stateful: the DynamoDB table is empty and the site is rebuilt from git on
every deploy. This is a fresh deploy in a new account plus a DNS switch.

**Decisions (2026-11-06)**

- New account root email: the `+appbep` Gmail alias.
- A short outage during the cutover is fine (under an hour expected).
- The domain **registration** stays in the management account. Only the **hosted zone** (the DNS
  records) moves.
- The old April buckets (`appbep`, `appbep.com`) stay untouched for now and get decided later.

**Rules**

- Don't touch Mathisthenics: its stacks, the `mathisthenics.com` zone, the `CDKToolkit` stack
  (the default CDK bootstrap) or the **GitHub OIDC provider**, which Mathisthenics's deploy role uses.
- Identity Center: only _add_ an assignment for the new account; change nothing else.

Placeholders used below: `MGMT_ID` is the management account, `APPBEP_ID` the new account, and
`NEW_ZONE_ID` the new hosted zone. Keep the real values out of git (they belong in `.env.local`
and GitHub repo variables).

---

## Phase A: prepare (the site stays up)

### A1. Create the member account (you, console)

Sign in to the management account, then go to **AWS Organizations → AWS accounts → Add an AWS account → Create an AWS account**.

- Account name: `Appbep`
- Email: the `+appbep` Gmail alias
- IAM role name: leave the default (`OrganizationAccountAccessRole`)

It takes a minute or two. Note the new **account ID** (`APPBEP_ID`).

> Optional hardening: **Organizations → IAM → Root access management** (centralized root access)
> removes root passwords from member accounts entirely. It's a good idea and doesn't affect
> anything below.

### A2. Give yourself access (you, console)

**IAM Identity Center** (region **us-east-2**, where it lives) → **AWS accounts** → tick `Appbep` →
**Assign users or groups** → your user → permission set **AdministratorAccess** → Submit.

### A3. Add a CLI profile (you, terminal)

Append to `~/.aws/config` (it reuses the SSO session you already log in with):

```ini
[profile appbep]
sso_session = mathisthenics-sso
sso_account_id = APPBEP_ID
sso_role_name = AdministratorAccess
region = us-east-1
output = json
```

Then run:

```bash
aws sso login --profile appbep
aws sts get-caller-identity --profile appbep   # "Account" must be APPBEP_ID
```

### A4. Bootstrap CDK in the new account (terminal)

```bash
cd ~/dev/appbep/infra
npx cdk bootstrap aws://APPBEP_ID/us-east-1 --profile appbep
```

This creates the new account's own `CDKToolkit` stack and the `cdk-hnb659fds-*` roles. Appbep only
deploys to us-east-1, so no other region is needed.

### A5. Create the new hosted zone (you, console, logged in to the **Appbep** account)

**Route 53 → Hosted zones → Create hosted zone**: `appbep.com`, Public. Note:

- the **zone ID** (`NEW_ZONE_ID`)
- its **4 name servers** (the `NS` record)

It isn't live until step B1, so it's harmless to create now.

### A6. GitHub deploy role (you, console, **Appbep** account)

1. **IAM → Identity providers → Add provider**: OpenID Connect, URL
   `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`.
2. **IAM → Roles → Create role → Custom trust policy**, named `appbep-github-deploy`:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::APPBEP_ID:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
             "token.actions.githubusercontent.com:sub": "repo:beparadox@872477/appbep@1447725704:ref:refs/heads/main"
           }
         }
       }
     ]
   }
   ```

   (The `sub` is the same as on the old role. GitHub uses _immutable_ subject IDs for this repo,
   and that's a GitHub setting, not an AWS one, so it doesn't change.)

3. No managed policies. Add an **inline policy** `assume-cdk-bootstrap-roles`:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "UseCdkBootstrapRoles",
         "Effect": "Allow",
         "Action": "sts:AssumeRole",
         "Resource": [
           "arn:aws:iam::APPBEP_ID:role/cdk-hnb659fds-deploy-role-APPBEP_ID-us-east-1",
           "arn:aws:iam::APPBEP_ID:role/cdk-hnb659fds-file-publishing-role-APPBEP_ID-us-east-1",
           "arn:aws:iam::APPBEP_ID:role/cdk-hnb659fds-lookup-role-APPBEP_ID-us-east-1"
         ]
       }
     ]
   }
   ```

Don't change the GitHub variables yet (that's C1). CI keeps pointing at the old account until the
move is done.

### A7. Guard against deploying to the wrong account

`scripts/deploy.sh` refuses to deploy unless the logged-in account matches `APPBEP_ACCOUNT_ID`
from `.env.local`. That way a stale `AWS_PROFILE=admin` can't quietly create a second Appbep in
the management account.

---

## Phase B: cutover (the outage starts here)

CloudFront won't let two distributions claim `appbep.com`, so the old stack must be gone before
the new one deploys.

### B1. Point the domain at the new zone (you, console, **management** account)

**Route 53 → Registered domains → appbep.com → Actions → Edit name servers**. Replace the four
name servers with the new zone's four from A5.

Check propagation (it can take minutes, sometimes longer):

```bash
dig +short NS appbep.com @8.8.8.8   # should list the NEW name servers
```

### B2. Destroy the old stack (terminal, **management** account)

```bash
cd ~/dev/appbep/infra
AWS_PROFILE=admin npx cdk destroy Appbep
```

Expect 5–15 minutes, because CloudFront has to disable before it can be deleted. Two resources
are kept on purpose (`RemovalPolicy.RETAIN`) and get deleted by hand in D2: the site bucket
`appbep-sitebucket…` and the DynamoDB table `Appbep-Table…`.

### B3. Deploy to the new account (terminal)

Edit `.env.local`:

```bash
AWS_PROFILE=appbep
APPBEP_HOSTED_ZONE_ID=NEW_ZONE_ID
APPBEP_ACCOUNT_ID=APPBEP_ID
```

Then run `npm run deploy`. The certificate step waits for DNS validation; that's why B1 comes
first.

### B4. Verify

```bash
curl -sI https://appbep.com | head -1                      # HTTP/2 200
curl -sI https://www.appbep.com | head -1
curl -sI https://appbep.com/exhibits/bam-cube | head -3     # 301 to the trailing slash
curl -s  https://appbep.com/api/nope                        # {"error":"not_found"} = API reachable
```

Also open it on your phone (cellular, not Wi-Fi, to dodge your home DNS cache).

The outage ends here.

---

## Phase C: CI

### C1. Point GitHub at the new account (you, GitHub)

**Repo → Settings → Secrets and variables → Actions → Variables**:

- `AWS_DEPLOY_ROLE_ARN` = `arn:aws:iam::APPBEP_ID:role/appbep-github-deploy`
- `APPBEP_HOSTED_ZONE_ID` = `NEW_ZONE_ID`

### C2. Prove it

**Actions → Deploy → Run workflow** on `main`. Expect green, and a no-op deploy (no changes).

---

## Phase D: clean up the management account

Wait **2 days** after B1 before deleting the old zone: resolvers can cache `.com` name-server
records for up to 48 hours.

1. **IAM role** `appbep-github-deploy` (management account): delete it. **Leave the GitHub OIDC
   provider**, because Mathisthenics uses it.
2. **Retained resources** from B2: empty and delete the `appbep-sitebucket…` bucket, then delete
   the `Appbep-Table…` table. Look first; only delete names that start with `appbep-sitebucket` /
   `Appbep-Table`.
3. **Old hosted zone** `appbep.com` (the old zone ID, _not_ `NEW_ZONE_ID`): delete the leftover
   records (the certificate-validation `CNAME`s), then delete the zone. Double-check the zone ID
   before you click, because both zones are named `appbep.com`.
4. Leave `CDKToolkit` alone (shared with Mathisthenics).
5. Later: decide about the old `appbep` (18 MB of old-site assets plus `blog/`) and `appbep.com`
   (empty redirect) buckets.

## Done when

- [ ] `https://appbep.com` and `www` are served from the Appbep account
- [ ] A Deploy run on `main` is green against the new account
- [ ] `npm run deploy` refuses to run against the management account
- [ ] Nothing named `Appbep…` or `appbep-site…` is left in the management account
