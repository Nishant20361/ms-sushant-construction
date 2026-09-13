export function assertTestDatabaseUrl(value: string | undefined, applicationUrl?: string): string {
  if (!value) throw new Error("TEST_DATABASE_URL must point to an isolated local test database.");
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.username ||
      !["localhost", "127.0.0.1", "[::1]", "postgres", "db"].includes(url.hostname) ||
      !/(^|[_-])test($|[_-])/i.test(decodeURIComponent(url.pathname.slice(1)))) {
    throw new Error("Tests require a local PostgreSQL database with 'test' in its name; remote and production databases are refused.");
  }
  if (applicationUrl) {
    const app = new URL(applicationUrl);
    const host = (name: string) => ["localhost", "127.0.0.1", "[::1]"].includes(name) ? "loopback" : name;
    if (host(url.hostname) === host(app.hostname) && (url.port || "5432") === (app.port || "5432") &&
        decodeURIComponent(url.pathname) === decodeURIComponent(app.pathname)) {
      throw new Error("TEST_DATABASE_URL must not address the application database, even with different credentials or query parameters.");
    }
  }
  return value;
}
