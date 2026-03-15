const BRAND_COLORS = {
  YANDEX: "#FC3F1D",
  VK: "#0077FF",
  TELEGRAM: "#26A5E4",
} as const;

type LoginProvider = "YANDEX" | "VK" | "TELEGRAM";

export function SocialProviderIcon({
  provider,
  className = "h-8 w-8",
  faded = false,
}: {
  provider: LoginProvider;
  className?: string;
  faded?: boolean;
}) {
  const color = BRAND_COLORS[provider];
  const opacity = faded ? 0.4 : 1;
  switch (provider) {
    case "YANDEX":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ opacity }}>
          <path
            fill={color}
            d="M13.14 4H10.8c-2.82 0-4.7 1.45-4.7 3.98 0 2.03 1.12 3.23 2.86 4.38l2.33 1.53L7.08 20h2.74l3.62-5.4V20h2.48V4h-2.78Zm.3 8.41-2.77-1.84c-1.21-.8-1.95-1.47-1.95-2.62 0-1.33.96-2.04 2.49-2.04h2.23v6.5Z"
          />
        </svg>
      );
    case "VK":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ opacity }}>
          <path
            fill={color}
            d="M4.87 4.5C3.83 4.5 3 5.33 3 6.37v11.26c0 1.04.83 1.87 1.87 1.87h14.26c1.04 0 1.87-.83 1.87-1.87V6.37c0-1.04-.83-1.87-1.87-1.87H4.87Zm11.98 10.33h-1.4c-.53 0-.69-.42-1.64-1.38-.84-.8-1.21-.91-1.42-.91-.3 0-.39.08-.39.48v1.26c0 .34-.11.54-1 .54-1.48 0-3.12-.9-4.28-2.57-1.74-2.44-2.22-4.27-2.22-4.63 0-.2.08-.39.48-.39h1.41c.36 0 .5.16.64.55.69 2 1.84 3.75 2.31 3.75.18 0 .26-.08.26-.53V8.94c-.05-.95-.55-1.03-.55-1.37 0-.17.14-.34.37-.34h2.2c.29 0 .4.16.4.51V10.5c0 .29.13.39.21.39.18 0 .33-.1.66-.43 1.03-1.15 1.77-2.91 1.77-2.91.1-.21.27-.41.64-.41h1.4c.42 0 .51.21.42.51-.16.74-1.73 3.68-1.72 3.68-.14.22-.19.32 0 .58.14.2.58.57.88.92.55.63.98 1.16 1.09 1.53.12.37-.06.56-.44.56Z"
          />
        </svg>
      );
    case "TELEGRAM":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ opacity }}>
          <path
            fill={color}
            d="M21.42 4.59a1.5 1.5 0 0 0-1.59-.22L3.9 10.83c-.81.34-.76 1.51.08 1.77l3.95 1.26 1.5 4.58c.24.75 1.18.97 1.72.41l2.2-2.27 3.98 2.92c.69.5 1.67.12 1.84-.71L21.7 6.02c.11-.52-.06-1.05-.28-1.43ZM9.16 13.3l8.1-5.1c.14-.09.3.1.18.22l-6.69 6.03a.92.92 0 0 0-.28.49l-.45 2.83-.86-2.63a.77.77 0 0 0-.5-.49L6.4 13.9l2.76-.6Z"
          />
        </svg>
      );
  }
}
