/**
 * AI Architectural & Construction Image Generator
 *
 * Generates photorealistic 3D architectural visuals, elevation designs,
 * modern house renders, and structural layouts when requested by the user.
 */

export interface ImageGenerationResult {
  isGenerationRequest: boolean;
  imageUrl?: string;
  markdownReply?: string;
}

/**
 * Checks if user message is requesting image generation / 3D design render.
 */
export function isImageGenerationRequest(message: string): boolean {
  const msg = message.toLowerCase().trim();

  const triggers = [
    "image banao",
    "photo banao",
    "tasveer banao",
    "design banao",
    "3d photo",
    "3d design",
    "3d render",
    "house photo",
    "ghar ki photo",
    "ghar ka photo",
    "ghar ka design banao",
    "elevation photo",
    "elevation design",
    "naksha banao",
    "blueprint banao",
    "generate image",
    "create image",
    "generate photo",
    "draw image",
    "draw a house",
    "render house",
    "3d house view",
    "3d exterior",
    "3d interior",
  ];

  return triggers.some((t) => msg.includes(t));
}

/**
 * Build an optimized architectural visual prompt from user query.
 */
export function buildArchitecturalVisualPrompt(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  let houseType = "Modern Indian luxury family house exterior";
  if (msg.includes("3 bedroom") || msg.includes("3bhk") || msg.includes("3 room")) {
    houseType = "Contemporary 3BHK modern Indian villa exterior";
  } else if (msg.includes("2 storey") || msg.includes("2 floor") || msg.includes("2 manzil") || msg.includes("g+1")) {
    houseType = "Double storey modern duplex house with terrace garden";
  } else if (msg.includes("single storey") || msg.includes("1 floor") || msg.includes("1 manzil")) {
    houseType = "Single storey stylish contemporary bungalow exterior";
  } else if (msg.includes("small") || msg.includes("chota") || msg.includes("budget") || msg.includes("low cost")) {
    houseType = "Aesthetic compact modern Indian house elevation design";
  } else if (msg.includes("interior") || msg.includes("living room") || msg.includes("hall")) {
    houseType = "Modern luxury living room interior design with warm lighting and false ceiling";
  }

  return `${houseType}, elegant front elevation, glass balcony, stone wall cladding, ambient warm lighting, landscaped driveway, blue sky, architectural visualization, 8k resolution, cinematic photorealistic 3D render`;
}

/**
 * Generate high-definition AI image URL and civil engineering advice.
 */
export function generateConstructionImage(
  userMessage: string,
  language: "Hindi" | "English" | "Hinglish" | "Other" = "Hindi"
): ImageGenerationResult {
  if (!isImageGenerationRequest(userMessage)) {
    return { isGenerationRequest: false };
  }

  const prompt = buildArchitecturalVisualPrompt(userMessage);
  const seed = Math.floor(Math.random() * 1_000_000);
  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`;

  let replyText = "";
  if (language === "Hindi") {
    replyText = `✨ **आपके लिए 3D Architectural Design तैयार किया गया है:**\n\n![3D House Design](${imageUrl})\n\n🏡 **डिज़ाइन व निर्माण सुझाव:**\n• **Front Elevation:** आधुनिक ग्लास बालकनी, स्टोन क्लैडिंग और वेदरप्रूफ एक्सटीरियर पेंट (Asian Paints / Berger WeatherCoat)।\n• **RCC Slab व स्ट्रक्चर:** मजबूत ढलाई के लिए **ACC Concrete+ F2R Cement** और **Tata Tiscon 550D Rebar** का उपयोग करें।\n• **दीवारें व फिनिशिंग:** 9-इंच बाहरी दीवारें और सीलन से बचाव के लिए **Dr. Fixit 101 LW+** वॉटरप्रूफिंग अवश्य कराएं।\n\nयदि आप इस घर के लिए सीमेंट, सरिया या कुल निर्माण खर्च (Cost Estimate) जानना चाहते हैं, तो बेझिझक पूछें! 😊`;
  } else if (language === "Hinglish") {
    replyText = `✨ **Aapke liye 3D Architectural Design generate kar diya gaya hai:**\n\n![3D House Design](${imageUrl})\n\n🏡 **Design & Construction Tips:**\n• **Elevation:** Modern glass balcony, stone cladding aur weatherproof exterior paint.\n• **Structure & Slab:** Strong dhalai ke liye **ACC Concrete+ F2R Cement** aur **Tata Tiscon 550D Steel** use karein.\n• **Waterproofing:** Foundation aur roof slab me **Dr. Fixit 101 LW+** chemical zaroor dalein.\n\nAap is design ke liye total material ya cost estimate bhi pooch sakte hain! 😊`;
  } else {
    replyText = `✨ **Here is your custom 3D Architectural Visualization:**\n\n![3D House Design](${imageUrl})\n\n🏡 **Key Construction Recommendations:**\n• **Front Elevation:** Contemporary stone cladding, ambient lighting, and weather-shield coating.\n• **RCC Framing:** Built with **ACC Concrete+ F2R Cement** and **Tata Tiscon 550D Rebar** for high seismic strength.\n• **Waterproofing:** Apply **Dr. Fixit 101 LW+** in concrete mix to ensure 100% damp-proof construction.\n\nFeel free to ask for detailed material quantities or cost breakdown for this layout! 😊`;
  }

  return {
    isGenerationRequest: true,
    imageUrl,
    markdownReply: replyText,
  };
}
