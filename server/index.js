import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  assignApprovalsToReviewer,
  createDatabase,
  fetchApprovals,
  fetchBootstrap,
  fetchDashboard,
  initDatabase,
  saveSettings,
} from "./db.js";
import { createSattieDatabase, initSattieDatabase } from "./sattie/db.js";
import { createSattieRouter } from "./sattie/routes.js";
import { ensureSattieBootstrap } from "./sattie/seed.js";
import { initializeSattieRuntime } from "./sattie/service.js";

const app = express();
const port = Number(process.env.PORT ?? 6005);
const host = process.env.HOST ?? "127.0.0.1";
const isProduction = process.env.NODE_ENV === "production";
const db = createDatabase();
const sattieDb = createSattieDatabase();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distRoot = path.resolve(projectRoot, "dist");
const distIndexHtml = path.join(distRoot, "index.html");

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/bootstrap", async (_request, response) => {
  try {
    response.json(await fetchBootstrap(db));
  } catch (error) {
    response.status(500).json({ error: String(error) });
  }
});

app.get("/api/dashboard", async (request, response) => {
  try {
    const domainId = String(request.query.domainId ?? "");
    response.json(await fetchDashboard(db, domainId));
  } catch (error) {
    response.status(500).json({ error: String(error) });
  }
});

app.get("/api/approvals", async (request, response) => {
  try {
    const domainId = String(request.query.domainId ?? "");
    response.json(await fetchApprovals(db, domainId));
  } catch (error) {
    response.status(500).json({ error: String(error) });
  }
});

app.put("/api/settings", async (request, response) => {
  try {
    const settings = await saveSettings(db, request.body);
    response.json({ settings });
  } catch (error) {
    response.status(500).json({ error: String(error) });
  }
});

app.post("/api/approvals/assign", async (request, response) => {
  try {
    const { domainId, reviewerId } = request.body;
    response.json(await assignApprovalsToReviewer(db, domainId, reviewerId));
  } catch (error) {
    response.status(500).json({ error: String(error) });
  }
});

app.use("/api/sattie", createSattieRouter({ db: sattieDb }));

async function attachFrontend() {
  if (isProduction) {
    app.use(express.static(distRoot));
    app.get("/{*path}", async (request, response, next) => {
      if (request.path.startsWith("/api/")) {
        next();
        return;
      }

      try {
        response.type("html").send(await fs.readFile(distIndexHtml, "utf8"));
      } catch (error) {
        next(error);
      }
    });
    return;
  }

  const { createServer } = await import("vite");
  const vite = await createServer({
    root: projectRoot,
    appType: "spa",
    server: {
      middlewareMode: true,
    },
  });

  app.use(vite.middlewares);
  app.use(async (request, response, next) => {
    if (
      request.method !== "GET" ||
      request.originalUrl.startsWith("/api/") ||
      request.originalUrl.startsWith("/@") ||
      request.originalUrl.includes(".")
    ) {
      next();
      return;
    }

    try {
      const templatePath = path.resolve(projectRoot, "index.html");
      const template = await fs.readFile(templatePath, "utf8");
      const html = await vite.transformIndexHtml(request.originalUrl, template);
      response.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error);
      next(error);
    }
  });
}

async function start() {
  try {
    await Promise.all([initDatabase(db), initSattieDatabase(sattieDb)]);
    await ensureSattieBootstrap(sattieDb);
    await initializeSattieRuntime(sattieDb);
    await attachFrontend();

    app.listen(port, host, () => {
      console.log(`Unified server running on http://${host}:${port}`);
    });
  } catch (error) {
    console.error("Failed to initialize database", error);
    process.exit(1);
  }
}

void start();
