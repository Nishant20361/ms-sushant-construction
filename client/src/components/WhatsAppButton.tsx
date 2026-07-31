import { useSettings } from "../context/SettingsContext";

export default function WhatsAppButton() {
  const { settings } = useSettings();
  const number = settings?.whatsappNumber;

  if (!number) return null;

  // Strip non-digits, drop leading 0/+91 if present
  const digits = number.replace(/\D/g, "").replace(/^(0|91)?(?=\d{10}$)/, "");
  if (digits.length !== 10) return null;

  const href = `https://wa.me/91${digits}`;
  const text = encodeURIComponent(
    `Namaste ${settings?.companyName || ""}, I would like to enquire about your construction materials.`
  );

  return (
    <a
      href={`${href}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 left-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:scale-105 hover:bg-green-600"
    >
      <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1a8.2 8.2 0 01-3.3-2.1c-.3-.3-.4-.4-.1-.7l.8-.9c.2-.2.3-.4.4-.6.1-.3 0-.5-.1-.7-.1-.1-1.3-3.2-1.8-4.3-.5-1-.9-.9-1.2-.9H7c-.3 0-.8.1-1.2.6-.4.5-1.6 1.6-1.6 4s1.7 4.6 1.9 4.9c.2.3 3.3 5 8 7 4.8 2.1 4.8-1.4 5.7-1.6.9-.2 1.4-.3 1.6-.5.2-.2.3-.7.2-1.2-.1-.4-.9-1.9-1.1-2.2-.2-.3-.5-.4-.9-.5zM12 22a10 10 0 01-8.5-15L2 4l3.1-.8A10 10 0 1112 22zm5.9-14.9A8.5 8.5 0 006.6 4.2l-1.5.4.5-1.5a9.5 9.5 0 012.5-2.1A8.3 8.3 0 0112 1.9a8.6 8.6 0 016.1 2.5A8.5 8.5 0 0117.9 7.1z"/>
      </svg>
    </a>
  );
}

