import Image from "next/image";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const imageSizes = {
  sm: 32,
  md: 40,
  lg: 48,
};

export function Logo({ className = "", showText = true, size = "md" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/zpath-logo.jpg"
        alt="ZPATH logo"
        width={imageSizes[size]}
        height={imageSizes[size]}
        className={`${sizes[size]} rounded-xl object-cover shadow-sm`}
        priority
      />
      {showText && (
        <span className="font-display text-xl font-bold text-gradient-hero">ZPATH</span>
      )}
    </div>
  );
}
