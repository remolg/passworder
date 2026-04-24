const logoModules = import.meta.glob(
  [
    "../assets/logos/*.svg",
    "../assets/logos/*.png",
    "../assets/logos/*.jpg",
    "../assets/logos/*.jpeg",
    "../assets/logos/*.webp",
    "../assets/logos/*.avif",
  ],
  { eager: true, import: "default" },
) as Record<string, string>;

interface LogoMetadata {
  id: string;
  label: string;
  tag: string;
}

export interface LogoOption extends LogoMetadata {
  src: string;
}

const LOGO_METADATA: LogoMetadata[] = [
  { id: "metamask", label: "MetaMask", tag: "metamask" },
  { id: "wordpress", label: "WordPress", tag: "wordpress" },
  { id: "gmail", label: "Gmail", tag: "gmail" },
  { id: "mail", label: "Mail", tag: "mail" },
  { id: "steam", label: "Steam", tag: "steam" },
  { id: "instagram", label: "Instagram", tag: "instagram" },
  { id: "discord", label: "Discord", tag: "discord" },
  { id: "microsoft", label: "Microsoft", tag: "microsoft" },
  { id: "lol", label: "League of Legends", tag: "lol" },
  { id: "valorant", label: "Valorant", tag: "valorant" },
  { id: "tft", label: "Teamfight Tactics", tag: "tft" },
  { id: "ea", label: "EA", tag: "ea" },
  { id: "facebook", label: "Facebook", tag: "facebook" },
  { id: "adobe", label: "Adobe", tag: "adobe" },
  { id: "amazon", label: "Amazon", tag: "amazon" },
  { id: "apple", label: "Apple", tag: "apple" },
  { id: "binance", label: "Binance", tag: "binance" },
  { id: "epic-games", label: "Epic Games", tag: "epic-games" },
  { id: "figma", label: "Figma", tag: "figma" },
  { id: "github", label: "GitHub", tag: "github" },
  { id: "gitlab", label: "GitLab", tag: "gitlab" },
  { id: "google", label: "Google", tag: "google" },
  { id: "icloud", label: "iCloud", tag: "icloud" },
  { id: "linkedin", label: "LinkedIn", tag: "linkedin" },
  { id: "netflix", label: "Netflix", tag: "netflix" },
  { id: "notion", label: "Notion", tag: "notion" },
  { id: "outlook", label: "Outlook", tag: "outlook" },
  { id: "reddit", label: "Reddit", tag: "reddit" },
  { id: "snapchat", label: "Snapchat", tag: "snapchat" },
  { id: "spotify", label: "Spotify", tag: "spotify" },
  { id: "telegram", label: "Telegram", tag: "telegram" },
  { id: "tiktok", label: "TikTok", tag: "tiktok" },
  { id: "whatsapp", label: "WhatsApp", tag: "whatsapp" },
  { id: "x", label: "X", tag: "x" },
  { id: "youtube", label: "YouTube", tag: "youtube" },
];

const logoSourceById = new Map(
  Object.entries(logoModules)
    .map(([path, src]) => {
      const filename = path.split("/").pop();
      const id = filename?.replace(/\.[^.]+$/, "");
      return id ? [id, src] : null;
    })
    .filter((entry): entry is [string, string] => Boolean(entry)),
);

export const LOGO_OPTIONS: LogoOption[] = LOGO_METADATA.flatMap((logo) => {
  const src = logoSourceById.get(logo.id);
  return src ? [{ ...logo, src }] : [];
});

const LOGO_OPTIONS_BY_ID = new Map(LOGO_OPTIONS.map((logo) => [logo.id, logo]));

export function getLogoOption(logoId: string | null | undefined) {
  if (!logoId) {
    return null;
  }

  return LOGO_OPTIONS_BY_ID.get(logoId.trim()) ?? null;
}
