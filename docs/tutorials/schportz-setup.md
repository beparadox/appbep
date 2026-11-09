# Walkthrough: switching on Schportz voting

Schportz has three parts (the Angry Packers Fan quiz works the same way and shares the key). Two work as soon as the code deploys:

- **The quiz**: 33 questions from `content/quizzes/schportz.json`, a static file.
- **The headlines**: a scheduled Lambda (`FeedsFn`) fetches 8 sports feeds every 30 minutes
  and saves them to `/feeds/schportz.json` in the site bucket. It also runs once right after
  each deploy, so the headlines are there straight away. (The same job writes
  `/feeds/apf.json` for the Angry Packers Fan page.)

The third, **voting**, needs one setting that must stay out of git: a random key used to
hash visitors' IP addresses, so the site can allow one vote per person per question without
storing anyone's IP. Until it exists, voting answers `503 not_configured` and the page still
shows the answer and the old 2010 vote shares.

## Step 1: create the hashing key

The key is just 32 random bytes. You never need to see or copy it: `openssl` makes it and
hands it straight to AWS.

```bash
aws ssm put-parameter --profile appbep --region us-east-1 \
  --name /appbep/hash-key --type SecureString \
  --value "$(openssl rand -hex 32)"
```

**Check:** it prints `{"Version": 1, "Tier": "Standard"}`. The Lambda picks it up within 5
minutes.

Don't change it later unless you have to: a new key makes every visitor "new" again, so
anyone could vote a second time on each question.

## Step 2: try it

1. Open **appbep.com/exhibits/schportz/** and answer the question.
2. You should see the answer typed out, each choice's percentage, and "Total votes".
3. Reload: the page remembers your answer (in this browser) and shows the results.
4. Optional, from a terminal:
   ```bash
   curl -s https://appbep.com/api/quiz/schportz/2011-07-18/tally
   # {"quiz":"schportz","id":"2011-07-18","counts":[...],"total":...}
   ```

## How it works

- **Question of the day**: the page cycles through all 33 questions, one per calendar day.
  `<<` and `>>` browse the rest, like in 2011.
- **Votes** go to DynamoDB: one `TALLY` item per question with five counters, plus one small
  `VOTER#<hash>` item per voter that deletes itself after 30 days. Both are written in one
  transaction, so a vote is counted exactly once or not at all.
- **The 2010 votes**: 24 questions still had their original vote counts in the 2010 database
  dump (`votes2010` in the JSON). The page adds them to the new counts and says so ("Total
  votes: 61 (48 from 2010)").
- **Headlines**: each feed keeps its last good copy if a fetch fails, so a site having a bad
  day doesn't blank its tab. Logs: CloudWatch log group starting `Appbep-FeedsLogs`.

## Changing the feeds

The lists are in `api/src/feeds/sources.ts` (one per page). To check a feed URL still works:

```bash
curl -sL "https://www.espn.com/espn/rss/nfl/news" | grep -c "<item"
```

A number above 0 means it's a working RSS feed. Edit the list, merge, and the next run uses it.
