// Ayo & Nchò server: serves the web app. Online rooms (WebSockets) come in the second week — see docs/build-plan.md.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use("/engine", express.static(path.join(__dirname, "..", "engine")));
app.use(express.static(path.join(__dirname, "..", "web")));
app.get("/healthz", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ayo-ncho listening on ${port}`));
