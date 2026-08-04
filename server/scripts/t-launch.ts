import puppeteer from "puppeteer";

const exe = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
try {
  const b = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: exe,
  });
  console.log("LAUNCH OK");
  await b.close();
} catch (e: any) {
  console.log("LAUNCH FAILED name:", e?.name);
  console.log("LAUNCH FAILED message:", (e?.message || "").split("\n")[0]);
}
