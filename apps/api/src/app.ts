import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { appConfig } from "./config.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerCatalogRoutes } from "./routes/catalog.js";
import { registerGenerationRoutes } from "./routes/generations.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerProfileRoutes } from "./routes/profile.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
    trustProxy: appConfig.trustProxy,
  });

  await app.register(cookie, {
    secret: appConfig.sessionSecret,
  });
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, appConfig.webOrigins.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });

  await registerAuthRoutes(app);
  await registerHealthRoutes(app);
  await registerCatalogRoutes(app);
  await registerProfileRoutes(app);
  await registerGenerationRoutes(app);
  await registerAdminRoutes(app);

  return app;
}
