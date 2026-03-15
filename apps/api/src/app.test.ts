import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(async () => "hashed-password"),
    compare: vi.fn(async () => true),
  },
}));

let app: FastifyInstance;

beforeAll(async () => {
  const { buildApp } = await import("./app.js");
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe("buildApp", () => {
  it("serves health endpoint without external dependencies", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      service: "superava-api",
    });
  });

  it("rejects unauthorized profile access before hitting business logic", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/profile",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "unauthorized" });
  });
});
