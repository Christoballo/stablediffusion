import crypto from "node:crypto";
import express, { type Request, type Response } from "express";
import { config } from "../config.js";
import { saveWebhookEvent } from "../storage/db.js";

/**
 * Express server for official Meta webhooks ("comments" field).
 * GET  /webhook – subscription verification handshake
 * POST /webhook – signed event delivery (X-Hub-Signature-256)
 */
export function createWebhookApp(): express.Express {
  const app = express();
  app.use(
    express.json({
      verify: (req, _res, buffer) => {
        (req as Request & { rawBody?: Buffer }).rawBody = buffer;
      },
    }),
  );

  app.get("/webhook", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === config.WEBHOOK_VERIFY_TOKEN && typeof challenge === "string") {
      res.status(200).send(challenge);
      return;
    }
    res.sendStatus(403);
  });

  app.post("/webhook", (req: Request, res: Response) => {
    if (!isValidSignature(req)) {
      res.sendStatus(401);
      return;
    }
    saveWebhookEvent(req.body);
    res.sendStatus(200);
  });

  return app;
}

function isValidSignature(req: Request): boolean {
  if (!config.META_APP_SECRET) return false;
  const signature = req.header("x-hub-signature-256");
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!signature || !rawBody) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", config.META_APP_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function startWebhookServer(): void {
  const app = createWebhookApp();
  app.listen(config.WEBHOOK_PORT, () => {
    console.log(`Webhook server listening on port ${config.WEBHOOK_PORT} (GET/POST /webhook)`);
  });
}
