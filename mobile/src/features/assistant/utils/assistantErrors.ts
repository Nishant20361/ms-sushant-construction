import { ApiError, NetworkError, TimeoutError } from "@/services/apiClient";
const isHindiOrHinglish = (message: string) => /[\u0900-\u097F]/.test(message) || /\b(kaise|kya|kyu|kyon|mujhe|ghar|hai|hain|nahi|nhi|dobara|kr|karo)\b/i.test(message);

export function assistantErrorMessage(error: unknown, question = ""): string {
  const hindiStyle = isHindiOrHinglish(question);
  if (hindiStyle) {
    if (error instanceof TimeoutError) return "AI assistant ko connect hone mein thoda samay lag raha hai. Kripya thodi der baad dobara try karein.";
    if (error instanceof NetworkError) return "Abhi AI assistant se connect nahi ho pa raha. Internet connection check karke dobara try karein.";
    if (error instanceof ApiError && error.status === 429) return "Abhi requests zyada hain. Kripya ek pal baad dobara try karein.";
    return "Abhi AI assistant se jawab nahi mil pa raha. Kripya thodi der baad dobara try karein.";
  }
  if (error instanceof TimeoutError) return "The assistant is taking longer than expected. Please try again shortly.";
  if (error instanceof NetworkError) return "We couldn't connect to the assistant. Check your connection and try again.";
  if (error instanceof ApiError && error.status === 429) return "Too many requests. Please wait a moment and try again.";
  if (error instanceof ApiError && error.status >= 500) return "The assistant is temporarily unavailable. Please try again.";
  if (error instanceof ApiError && error.status === 400) return "Please review your question and try again.";
  return "We couldn't get an answer right now. Please try again.";
}
