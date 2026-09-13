import { assertTestDatabaseUrl } from "./databaseSafety.js";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL);
// Never inherit operational provider credentials from local .env files.
for (const key of ["GROQ_API_KEY", "AGENTROUTER_API_KEY", "BREVO_API_KEY", "CLOUDINARY_URL", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
  process.env[key] = "";
}
