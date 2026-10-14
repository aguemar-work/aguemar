import { describe, expect, it } from "vitest";
import { claimsDelToken } from "@/lib/insforge/jwt";

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = (payload: object) => `${b64({ alg: "HS256" })}.${b64(payload)}.firma`;

describe("claimsDelToken", () => {
  it("lee sub, email y exp del payload", () => {
    expect(claimsDelToken(token({ sub: "u1", email: "a@b.pe", exp: 123 }))).toEqual({ sub: "u1", email: "a@b.pe", exp: 123 });
  });
  it("devuelve null sin sub o con token mal formado", () => {
    expect(claimsDelToken(token({ email: "a@b.pe" }))).toBeNull();
    expect(claimsDelToken("no-es-un-jwt")).toBeNull();
    expect(claimsDelToken(undefined)).toBeNull();
  });
  it("tolera caracteres url-safe en el payload", () => {
    expect(claimsDelToken(token({ sub: "ü?>~", email: "ñ@x.pe" }))?.sub).toBe("ü?>~");
  });
});
