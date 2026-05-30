import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";
import { assertNodeVersion } from "./runtime/assert-node-version";

const isProduction = process.env.NODE_ENV === "production";

function resolveCorsOrigins(): string[] | boolean {
  const configured = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  // Fail closed in production: with no allowlist, reject cross-origin requests.
  // In development, allow the local web app by default.
  return isProduction ? false : ["http://localhost:3000"];
}

async function bootstrap() {
  assertNodeVersion();

  // Disable the default body parser so our size-limited parsers below are authoritative.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // Trust the reverse proxy so req.ip / rate limiting use the real client IP.
  // TRUST_PROXY may be a hop count or boolean; defaults to 1 in production.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy !== undefined) {
    const numeric = Number(trustProxy);
    app.set("trust proxy", Number.isNaN(numeric) ? trustProxy : numeric);
  } else if (isProduction) {
    app.set("trust proxy", 1);
  }

  // Security headers (HSTS, no-sniff, frameguard, etc.).
  app.use(helmet());

  // Bound request body size to limit abuse / DoS via large payloads.
  const bodyLimit = process.env.BODY_LIMIT ?? "1mb";
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  app.setGlobalPrefix("api/v1");

  app.enableCors({
    origin: resolveCorsOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    maxAge: 600,
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
}

void bootstrap();
