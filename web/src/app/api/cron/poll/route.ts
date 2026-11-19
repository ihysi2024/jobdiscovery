import { NextResponse } from "next/server";

// Vercel Cron calls this on the schedule in vercel.json and it starts the
// "Daily poll" GitHub Action. GitHub's own schedule skips most runs on this
// repo, so this is the dependable trigger; poll.yml's cron stays as a backup.
//
// Needs two Vercel environment variables (never commit or paste them):
//   CRON_SECRET            any long random string; Vercel sends it to this route
//   GITHUB_DISPATCH_TOKEN  fine-grained GitHub token, only this repo, Actions: read and write

export const dynamic = "force-dynamic";

const REPO = "ihysi2024/jobdiscovery";
const WORKFLOW = "poll.yml";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_DISPATCH_TOKEN is not set" }, { status: 500 });
  }
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
    },
    body: JSON.stringify({ ref: "main" }),
    cache: "no-store",
  });
  if (res.status !== 204) {
    // Log GitHub's answer (no token in it) so a failed start shows in Vercel's logs.
    const text = (await res.text()).slice(0, 300);
    console.error(`poll dispatch failed: ${res.status} ${text}`);
    return NextResponse.json({ error: `GitHub answered ${res.status}` }, { status: 502 });
  }
  return NextResponse.json({ started: WORKFLOW });
}
