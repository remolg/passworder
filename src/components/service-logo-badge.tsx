import { getLogoOption } from "@/lib/logo-catalog";
import { cn } from "@/lib/utils";

interface ServiceLogoBadgeProps {
  service: string;
  logoId?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

export function ServiceLogoBadge({
  service,
  logoId,
  className,
  imageClassName,
  fallbackClassName,
}: ServiceLogoBadgeProps) {
  const logo = getLogoOption(logoId);

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden rounded-[14px] bg-white/[0.03]",
        className,
      )}
    >
      {logo ? (
        <img
          src={logo.src}
          alt={logo.label}
          className={cn("h-8 w-8 object-contain", imageClassName)}
          draggable={false}
        />
      ) : (
        <span className={cn("text-[20px] font-semibold text-primary", fallbackClassName)}>
          {getServiceInitials(service)}
        </span>
      )}
    </div>
  );
}

export function getServiceInitials(service: string) {
  const chunks = service
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (chunks.length === 0) {
    return "?";
  }

  return chunks.map((chunk) => chunk[0]?.toUpperCase() ?? "").join("");
}
