import type { GroqResponseLanguage } from "./groq.js";

// This is deliberately a small, high-confidence boundary detector. It is not
// a general sentiment classifier: users may complain about a product or work
// quality without being blocked. It catches direct abusive wording aimed at
// the assistant or another person, including common Hindi/Hinglish variants.
const ABUSIVE_PATTERNS = [
  /\b(?:f[\W_]*u[\W_]*c[\W_]*k|bitch|asshole|bastard|shut\s*up)\b/i,
  /\b(?:chutiya|chutiye|madarchod|behenchod|bhosdike|gandu|harami)\b/i,
  /(?:चूतिया|मादरचोद|बहनचोद|भोसड़ीके|गांडू|हरामी)/u,
];

export function isAbusiveMessage(message: string): boolean {
  const normalized = message.normalize("NFKC").trim();
  return ABUSIVE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function respectfulBoundaryReply(language: GroqResponseLanguage): string {
  if (language === "Hindi") {
    return "मैं सम्मानजनक बातचीत में ही मदद कर सकता हूँ। कृपया गाली या अपमान के बिना अपना सवाल पूछें—मैं घर निर्माण, material, cost या estimate में मदद कर दूँगा।";
  }
  if (language === "Hinglish") {
    return "Main sirf respectful conversation mein help kar sakta hoon. Please gaali ya insult ke bina apna question bhejiye—main construction, material, cost ya estimate mein help kar dunga.";
  }
  return "I can help only with respectful conversation. Please rephrase without abusive language, and I can help with construction, materials, costs, or estimates.";
}
