// Plain JS twin so Turbopack can resolve ./identity.dev.js from identity.ts.
// Keep in sync with identity.dev.ts (the typed source of truth for local edits).

export const DEV_VIEWER = {
  sub: "user:dev",
  email: "dev@example.com",
  name: "Dev Viewer",
  teamId: 1,
  teamRole: "admin",
};
