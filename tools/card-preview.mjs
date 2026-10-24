#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { CARD_PREVIEW_CASES } from "./card-preview-cases.mjs";
import { readDisplaySources, validateDisplaySources, projectRoot } from "./verify-display-copy.mjs";
import { assertQuestionDataset, canPreviewDrafts, canShowReviewedContent, mergeLegacyFollowUps } from "../shared/content-policy.mjs";

const port = Number(process.env.OMOI_PREVIEW_PORT || 4176);
const mimeTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json; charset=utf-8" };
const targets = { couples: "Couples", family: "Family", friends: "Friends", adults: "Adults", "self-care": "Self-Care" };

async function previewCases() {
  const manifest = JSON.parse(await readFile(resolve(projectRoot, "shared/series-manifest.json"), "utf8"));
  const sources = new Map();
  for (const series of new Set(CARD_PREVIEW_CASES.map((entry) => entry.series))) {
    const source = readDisplaySources(series);
    const report = validateDisplaySources(series, source);
    if (report.issues.length) throw new Error(report.issues.join("\n"));
    const release = manifest.series[series];
    const allowDrafts = canPreviewDrafts(release, { protocol: "http:", hostname: "127.0.0.1" });
    if (release.status !== "published") throw new Error(`${series}: この確認画面では公開済みシリーズを選んでください。`);
    let questions;
    if (source.followUpData) {
      questions = mergeLegacyFollowUps(source.questions, source.followUpData, series, { allowDrafts });
    } else {
      assertQuestionDataset(source.questionData, series, { published: true });
      questions = source.questions.filter((question) => canShowReviewedContent(question.reviewStatus, { allowDrafts }));
    }
    sources.set(series, { questions, entries: report.entries });
  }
  return CARD_PREVIEW_CASES.map((entry) => {
    const source = sources.get(entry.series);
    const question = source.questions.find(({ id }) => id === entry.id);
    if (!question || (entry.side === "followUp" && !question.followUp)) throw new Error(`${entry.id}: 確認できる質問がありません。`);
    return { ...entry, target: targets[entry.series], question, entries: { [entry.id]: source.entries[entry.id] } };
  });
}

const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  try {
    const host = request.headers.host;
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
      response.writeHead(403); response.end("Local preview only"); return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405); response.end("Method not allowed"); return;
    }
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (url.pathname === "/preview/data") {
      response.setHeader("Content-Type", mimeTypes[".json"]);
      response.end(JSON.stringify({ cases: await previewCases() })); return;
    }
    const previewFiles = { "/": "tools/card-preview.html", "/preview/": "tools/card-preview.html", "/preview/app.mjs": "tools/card-preview-app.mjs", "/preview/styles.css": "tools/card-preview.css" };
    const file = previewFiles[url.pathname] || (url.pathname.startsWith("/shared/") ? url.pathname.slice(1) : null);
    if (!file || file.includes("..") || file.includes("\\")) {
      response.writeHead(404); response.end("Not found"); return;
    }
    let data = await readFile(resolve(projectRoot, file));
    // Local text-enlargement check; this does not alter production styling.
    if (file === "tools/card-preview.html" && url.searchParams.get("text-scale") === "2") {
      data = data.toString().replace("</head>", "<style>html { font-size: 200%; }</style></head>");
    }
    response.setHeader("Content-Type", mimeTypes[extname(file)] || "application/octet-stream");
    response.end(data);
  } catch (error) {
    console.error(error.message);
    response.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: error.message }));
  }
});
server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
server.listen(port, "127.0.0.1", () => console.log(`カード表示の確認: http://127.0.0.1:${port}/preview/`));
