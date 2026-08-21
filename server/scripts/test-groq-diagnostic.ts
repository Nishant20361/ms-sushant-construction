import dotenv from "dotenv";
import Groq from "groq-sdk";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });

const apiKey = (process.env.GROQ_API_KEY || "").trim();
const client = new Groq({ apiKey });

async function testModel(model: string) {
  const start = Date.now();
  console.log(`\nTesting Model: ${model}...`);
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Reply only with OK" }],
      max_tokens: 10,
    });
    const durationMs = Date.now() - start;
    const reply = response.choices[0]?.message?.content?.trim() || "";
    console.log(`✅ SUCCESS [${model}]`);
    console.log(`   Reply: "${reply}"`);
    console.log(`   Latency: ${durationMs}ms`);
    return { success: true, model, reply, durationMs };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const status = err?.status || err?.statusCode || "N/A";
    const code = err?.code || err?.error?.code || "N/A";
    const errorType = err?.type || err?.error?.type || err?.name || "N/A";
    const message = err?.message || String(err);

    console.error(`❌ FAILED [${model}]`);
    console.error(`   HTTP Status: ${status}`);
    console.error(`   Message: ${message}`);
    return { success: false, model, status, code, errorType, durationMs, message };
  }
}

async function main() {
  await testModel("llama-3.1-8b-instant");
  await testModel("llama-3.3-70b-versatile");
  await testModel("groq/compound");
  await testModel("groq/compound-mini");
  await testModel("qwen/qwen3.6-27b");
  await testModel("openai/gpt-oss-20b");
}

main();
