# jobdiscovery

Finds employers with open **New York City** jobs by reading the public job
boards of five hiring systems, keeps those jobs fresh, and classifies each one
(role, industry, seniority, salary, interview process) for search and matching.

| Hiring system | Endpoint | Status |
|---|---|---|
| Greenhouse | `boards-api.greenhouse.io/v1/boards/{token}/jobs` | Documented, public |
| Lever | `api.lever.co/v0/postings/{token}` (and `api.eu.lever.co`) | Documented, public |
| Ashby | `api.ashbyhq.com/posting-api/job-board/{token}` | Documented, public, includes pay |
| SmartRecruiters | `api.smartrecruiters.com/v1/companies/{id}/postings` | Documented, public |
| Workday | `{tenant}.wdN.myworkdayjobs.com/wday/cxs/...` | **Undocumented**; what Workday careers pages call. Can change without notice. |

## How it works

1. **discover** searches the Common Crawl URL index for every board URL on
   those systems (`jobs.lever.co/*`, `*.myworkdayjobs.com`, ...) and saves the
   unique boards. This finds employers by their *job pages*, so an out-of-state
   company with a Manhattan office is included.
2. **poll** fetches each board, keeps postings located in NYC, and stores them
   with a fingerprint.
   * Unchanged posting: only `last_seen_at` moves. Nothing downstream reruns.
   * New or changed: `content_hash != processed_hash`, so later steps
     (classification, embeddings) know to process it.
   * Missing from a successful poll: marked `closed_at`. Failed polls never close anything.
3. **process** classifies new or changed jobs (rules plus a small open model
   that runs for free) and embeds them for matching (see below). Unchanged
   jobs are never processed again.
4. **report** prints the numbers and can export CSVs.

Scheduling is built in: boards with NYC jobs are due daily, boards without
are rechecked every 30 days, dead boards every 90, and errors back off from
6 hours up to 14 days. Running `poll` on a daily cron does the right thing.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[postgres,dev]"
export JOBDISCOVERY_CONTACT="you@yourdomain.com"   # goes in the User-Agent so site owners can reach you
```

Locally it uses a SQLite file (`jobs.sqlite`). Set `DATABASE_URL` to a
`postgresql://...` URL (or pass `--db`) to use Postgres instead; the same
commands and schema work on both.

## First run

Start small to check everything works, then go wide:

```bash
# 1. Quick trial: one crawl, first 2 index pages per pattern
jobdiscovery discover --crawls 1 --max-pages 2
jobdiscovery poll --limit 200
jobdiscovery report

# 2. Full discovery (slow: the Common Crawl index is a shared free service and
#    rate-limits; expect this to take a while. Safe to stop and rerun.)
jobdiscovery discover --crawls 2

# 3. First full poll, then report with CSVs
jobdiscovery poll
jobdiscovery report --csv out/
```

`out/employers_with_nyc_jobs.csv` and `out/open_nyc_jobs.csv` are the two
answers to "how big is this?".

Add boards from links users paste (or any list):

```bash
jobdiscovery add https://jobs.lever.co/somecompany/abc-123
jobdiscovery add --file links.txt --source user
```

## Classifying jobs (`process`)

Two parts, so it needs no paid API:

**Rules** (`jobdiscovery/rules.py`) read the fields postings state in
predictable ways:

| Field | How |
|---|---|
| `salary_min_annual`, `salary_max_annual`, `salary_source` | The hiring system's own pay fields first; otherwise the pay range in the text (NYC postings must include one), skipping bonus, equity and commission figures. Hourly, weekly and monthly pay is annualized. Never guessed. |
| `seniority` | Title words (Intern, Junior, Senior, Staff, Director, VP ...), else years of experience |
| `years_experience_min`, `degree_required`, `visa_sponsorship` | Stated requirements only (`visa_sponsorship` is yes, no or unknown) |
| `work_mode`, `employment_type` | Hiring-system fields first, then the text |

**A small open model**, Qwen3.5 4B (4-bit, about 3 GB), served by
[llama.cpp](https://github.com/ggml-org/llama.cpp)'s `llama-server`, fills in
what needs judgment. Its output is constrained to a JSON schema, so values
always come from the fixed lists in `jobdiscovery/taxonomy.py`:

| Field | Values |
|---|---|
| `role_family`, `industry` | Fixed lists covering every field, not just tech |
| `role_title`, `company_name`, `summary` | Cleaned title, employer, one-sentence description |
| `skills` | Up to 8 skills, tools or licenses the posting asks for |
| `interview_process` | Stages and timeline, only when the posting describes them |

Then `BAAI/bge-small-en-v1.5` (384 dimensions, via fastembed) turns each job
into a vector for matching. On Postgres with pgvector (Supabase has it) the
vectors go in a `vector(384)` column; elsewhere they're stored as JSON.

Results live in the `job_features` table, keyed by posting; `model` records
how each row was made (`rules+qwen3.5-4b`). A job is processed again only if
its content fingerprint changes. Failures are retried on the next run, up to 3 times.

**Where it runs:**

* **Daily, on GitHub** (`classify.yml`): starts after each daily poll, splits
  the queue across 4 runners and runs the model on each. Free for a public repo.
* **On a Mac**, for the first big batch: `./scripts/classify_local.sh`
  installs llama.cpp, starts the model, classifies everything queued, and
  stops the model. It asks for `DATABASE_URL` without showing it. Stop it
  any time; rerunning picks up where it left off.

Other backends: `--backend rules` (no model at all; fills only the rule
fields) and `--backend claude` (Claude Haiku via the API; needs
`pip install -e ".[claude]"` and `ANTHROPIC_API_KEY`, about $0.0004 per job).

```bash
pip install -e ".[process]"
llama-server -hf bartowski/Qwen_Qwen3.5-4B-GGUF:Q4_K_M --no-mmproj --jinja --reasoning-budget 0 -c 16384 -np 4 &
jobdiscovery process --limit 20      # try a few first
jobdiscovery process --shard 0/2     # half the queue (run 1/2 elsewhere at the same time)
```

## Deploying: runs every day on GitHub Actions

Four workflows are included in `.github/workflows/`:

| Workflow | When | What |
|---|---|---|
| `poll.yml` | Daily, 09:47 UTC | `poll` every due board, then `check`. Fails (and GitHub emails you) if anything looks wrong. |
| `classify.yml` | After each daily poll | `process` new/changed jobs with Qwen3.5 4B on 4 runners at once. |
| `discover.yml` | Sundays, 13:23 UTC | Searches the latest Common Crawl indexes for new boards. |
| `tests.yml` | Every push | Runs the tests on SQLite and on a real Postgres. |

All of them can also be started by hand from the **Actions** tab ("Run workflow").

### One-time setup

1. **Create a Postgres database.** Any hosted Postgres works; Supabase and
   Neon both have free tiers. Which connection string to copy matters:
   * **Supabase:** click **Connect** and copy the **Session pooler** string
     (`postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:5432/postgres`).
     Not "Direct connection": that one is IPv6-only, and GitHub Actions runners
     only have IPv4. Not "Transaction pooler" (port 6543) either.
   * **Neon:** click **Connect**, turn **Connection pooling off**, and copy the
     direct string (no `-pooler` in the hostname, ends in `?sslmode=require...`).
   * Replace `[YOUR-PASSWORD]` with your real database password.
   * Why not the transaction-mode poolers: the poller relies on prepared
     statements and per-session behavior that those poolers don't support.
2. **Add it to the repo.** Settings → Secrets and variables → Actions:
   * Secret `DATABASE_URL`: the connection string.
   * Variable `JOBDISCOVERY_CONTACT`: an email address site owners can reach you at.
   * Optional secret `ALERT_WEBHOOK_URL`: a Slack or Discord incoming webhook for alerts.
3. **Seed it.** Actions → Weekly discovery → Run workflow, with `max_pages`
   set to `2` for a quick first test. Then Actions → Daily poll → Run workflow.
4. **Check the run summary.** Each run prints the `report` table at the bottom
   of its page.

After that, nothing needs to be run by hand. Tables are created automatically on first run.

### What protects an unattended run

* **No overlaps.** Each run takes a lock in the database (`runs` table), and the
  workflows also use GitHub's `concurrency` groups. A run whose heartbeat stops
  for 30 minutes is treated as dead and its lock is released.
* **Time budget.** `--max-minutes` stops starting new work before GitHub's
  6-hour limit. Unfinished boards stay due; discovery saves every index page as it goes.
* **Health check** (`jobdiscovery check`) fails the run and alerts when:
  * the last poll is older than 36 hours or didn't finish;
  * more than half the boards failed (an API changed or is blocking us);
  * open NYC jobs dropped more than 40% in one run;
  * no NYC jobs are stored even though boards report some;
  * the last classification run failed (for example, a bad API key).
* **Run history** is kept in the `runs` table, with stats for every run.

## Being a good citizen

* Requests identify the project and a contact address (`JOBDISCOVERY_CONTACT`).
* Per-host concurrency is capped (see `API_HOST_LIMITS` in `cli.py`); each
  Workday tenant gets at most 2 concurrent requests.
* 429 and 5xx responses back off exponentially and honor `Retry-After`.
* Only NYC postings are stored by default (`--all-locations` stores everything).

## Tests

```bash
pytest
# also run the Postgres tests (drops this project's tables in that database):
TEST_DATABASE_URL=postgresql://user@localhost:5432/jobs_test pytest
```

Tests run against a fake internet (`tests/fake_ats.py`) shaped like each API,
including an end-to-end discover → poll → report run. They don't touch the network.

## Known limits and next steps

* **Common Crawl coverage is a sample.** A board that no crawl happened to
  visit won't be found. Running `discover` across more crawls (`--crawls 6`)
  and adding user-submitted links closes most of the gap.
* **For full-scale discovery**, Common Crawl's columnar index (Parquet on S3,
  queryable with Athena or DuckDB) is much faster than the CDX API used here.
* **Location matching** (`nyc.py`) is deliberately conservative. Ambiguous
  strings like "Remote - New York" are excluded. Tune it with the tests in
  `tests/test_nyc.py`.
* **Not covered yet:** careers sites with schema.org `JobPosting` data
  (iCIMS, Taleo, custom sites), Workable, and government job portals. These
  slot in as more pollers writing the same `Posting` shape.
* **Company names** aren't resolved yet; boards are identified by token.
* Timestamps and JSON are stored as text so the same schema runs on SQLite
  and Postgres. When the web app reads from this database directly, convert
  them to `timestamptz` and `jsonb`.
