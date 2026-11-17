import Image from "next/image";

export function Logo({ size = 28, priority = false, className = "" }: { size?: number; priority?: boolean; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      priority={priority}
      draggable={false}
      className={`select-none ${className}`}
    />
  );
}
