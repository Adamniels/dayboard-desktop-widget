// One-off CLI to connect a Google account (decision 3). Run on the Mini:
//   pnpm --filter @dayboard/api google:connect
// It does the loopback OAuth consent, stores the refresh token, lists calendars, and lets
// Adam pick which to sync and which is the primary write target.
import { createServer } from "node:http";
import { createInterface } from "node:readline/promises";
import { URL } from "node:url";
import { google } from "googleapis";
import { env } from "../env";
import { makeOAuthClient } from "../sync/client";
import { saveCalendarSelection, upsertCredential } from "../repo/google";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

function waitForCode(redirectUri: string): Promise<string> {
  const { port, pathname } = new URL(redirectUri);
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (!req.url?.startsWith(pathname)) {
        res.writeHead(404).end();
        return;
      }
      const code = new URL(req.url, redirectUri).searchParams.get("code");
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<p>Dayboard connected. You can close this tab and return to the terminal.</p>");
      server.close();
      if (code) resolve(code);
      else reject(new Error("No authorization code in the redirect"));
    });
    server.listen(Number(port));
  });
}

async function main(): Promise<void> {
  if (!env.google.clientId || !env.google.clientSecret) {
    throw new Error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first (see .env.example).");
  }

  const client = makeOAuthClient();
  const authUrl = client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: SCOPES });

  console.log("\nOpen this URL in a browser to authorize Dayboard:\n");
  console.log(authUrl + "\n");

  const code = await waitForCode(env.google.redirectUri);
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Revoke prior access and retry with prompt=consent.");
  }

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const me = await oauth2.userinfo.get();
  const accountEmail = me.data.email ?? "unknown";

  await upsertCredential({
    accountEmail,
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token ?? null,
    accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scope: SCOPES.join(" "),
  });
  console.log(`Connected ${accountEmail} and stored the refresh token.\n`);

  const calApi = google.calendar({ version: "v3", auth: client });
  const list = await calApi.calendarList.list();
  const calendars = (list.data.items ?? []).map((c) => ({ id: c.id ?? "", summary: c.summary ?? c.id ?? "" }));

  calendars.forEach((c, i) => console.log(`  [${i}] ${c.summary} (${c.id})`));

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const pick = await rl.question("\nWhich calendars to sync? Comma-separated numbers: ");
  const chosen = pick
    .split(",")
    .map((s) => calendars[Number(s.trim())])
    .filter((c): c is { id: string; summary: string } => c != null);
  if (chosen.length === 0) {
    rl.close();
    throw new Error("No calendars selected.");
  }
  const primaryAnswer = await rl.question("Which one is the primary write target (number)? ");
  const primaryId = calendars[Number(primaryAnswer.trim())]?.id;
  rl.close();

  await saveCalendarSelection(
    chosen.map((c) => ({ id: c.id, summary: c.summary, primaryWrite: c.id === primaryId })),
  );
  console.log(`\nSaved ${chosen.length} calendar(s). Sync will pick them up on the next cycle.\n`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
