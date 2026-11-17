import type { SVGProps } from "react";

/*
  Icons from IconMCP (https://iconmcp.com, MIT): outline style, 16px grid, 1.5px stroke.
  New icons should use the same settings so the set stays consistent.
*/

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><circle cx="7" cy="7" r="4.75"/><line x1="10.375" y1="10.375" x2="13.75" y2="13.75"/></g>
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><line x1="8" y1="2.75" x2="8" y2="13.25"/><line x1="2.75" y1="8" x2="13.25" y2="8"/></g>
  </Icon>
);

export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><rect x="5.25" y="5.25" width="8.5" height="8.5" rx="2"/><path d="M3.5 10.75 L2.875 10.75 C2.53 10.75 2.25 10.47 2.25 10.125 L2.25 4.25 C2.25 3.145 3.145 2.25 4.25 2.25 L10.125 2.25 C10.47 2.25 10.75 2.53 10.75 2.875 L10.75 3.5"/></g>
  </Icon>
);

export const LinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <g transform="rotate(-45 8 8)"><path d="M7 5.75 H4.75 A2.25 2.25 0 0 0 4.75 10.25 H7"/><path d="M9 5.75 H11.25 A2.25 2.25 0 0 1 11.25 10.25 H9"/><line x1="5.75" y1="8" x2="10.25" y2="8"/></g>
  </Icon>
);

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><line x1="8" y1="2.25" x2="8" y2="9.25"/><path d="M4.75 6 L8 9.25 L11.25 6"/><path d="M2.5 10.5 L2.5 12 C2.5 12.828 3.172 13.5 4 13.5 L12 13.5 C12.828 13.5 13.5 12.828 13.5 12 L13.5 10.5"/></g>
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><path d="M3.5 4.25 L4.105 11.907 C4.187 12.948 5.055 13.75 6.098 13.75 L9.902 13.75 C10.945 13.75 11.813 12.948 11.895 11.907 L12.5 4.25"/><line x1="2.25" y1="4.25" x2="13.75" y2="4.25"/><path d="M6 4.25 L6 3.25 C6 2.698 6.448 2.25 7 2.25 L9 2.25 C9.552 2.25 10 2.698 10 3.25 L10 4.25"/><line x1="6.75" y1="7" x2="6.75" y2="11"/><line x1="9.25" y1="7" x2="9.25" y2="11"/></g>
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><path d="M2.75 8.5 L6.25 12 L13.25 4.5"/></g>
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><line x1="3.75" y1="3.75" x2="12.25" y2="12.25"/><line x1="12.25" y1="3.75" x2="3.75" y2="12.25"/></g>
  </Icon>
);

export const ChevronsIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><path d="M4.75 6 L8 2.75 L11.25 6"/><path d="M4.75 10 L8 13.25 L11.25 10"/></g>
  </Icon>
);

export const ArrowUpRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><line x1="3.5" y1="12.5" x2="12.5" y2="3.5"/><path d="M6 3.5 L12.5 3.5 L12.5 10"/></g>
  </Icon>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><line x1="2.75" y1="8" x2="13.25" y2="8"/><path d="M8.5 3.25 L13.25 8 L8.5 12.75"/></g>
  </Icon>
);

export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><line x1="8" y1="9.25" x2="8" y2="2.25"/><path d="M4.75 5.5 L8 2.25 L11.25 5.5"/><path d="M2.5 10.5 L2.5 12 C2.5 12.828 3.172 13.5 4 13.5 L12 13.5 C12.828 13.5 13.5 12.828 13.5 12 L13.5 10.5"/></g>
  </Icon>
);

export const MoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><circle cx="3.25" cy="8" r="0.99" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="0.99" fill="currentColor" stroke="none"/><circle cx="12.75" cy="8" r="0.99" fill="currentColor" stroke="none"/></g>
  </Icon>
);

export const SmileIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><circle cx="8" cy="8" r="6"/><circle cx="6" cy="6.5" r="0.99" fill="currentColor" stroke="none"/><circle cx="10" cy="6.5" r="0.99" fill="currentColor" stroke="none"/><path d="M5.25 9.5 C6 10.75 7 11.25 8 11.25 C9 11.25 10 10.75 10.75 9.5"/></g>
  </Icon>
);

export const StickerIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><path d="M4.5 2.5 L11.5 2.5 C12.605 2.5 13.5 3.395 13.5 4.5 L13.5 8.5 L8.5 13.5 L4.5 13.5 C3.395 13.5 2.5 12.605 2.5 11.5 L2.5 4.5 C2.5 3.395 3.395 2.5 4.5 2.5 Z"/><path d="M13.5 8.5 H10.75 A2.25 2.25 0 0 0 8.5 10.75 V13.5"/></g>
  </Icon>
);

export const CompassIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><circle cx="8" cy="8" r="6"/><path d="M10.106 6.419 L9.063 8.853 C9.023 8.947 8.947 9.023 8.853 9.063 L6.419 10.106 C6.087 10.248 5.752 9.913 5.894 9.581 L6.937 7.147 C6.977 7.053 7.053 6.977 7.147 6.937 L9.581 5.894 C9.913 5.752 10.248 6.087 10.106 6.419 Z"/></g>
  </Icon>
);

export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><line x1="2.75" y1="3.75" x2="13.25" y2="3.75"/><line x1="2.75" y1="8" x2="13.25" y2="8"/><line x1="2.75" y1="12.25" x2="13.25" y2="12.25"/></g>
  </Icon>
);

export const LogOutIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><path d="M6.25 2.25 L4.75 2.25 C3.922 2.25 3.25 2.922 3.25 3.75 L3.25 12.25 C3.25 13.078 3.922 13.75 4.75 13.75 L6.25 13.75"/><line x1="6.75" y1="8" x2="13.5" y2="8"/><path d="M10.5 5 L13.5 8 L10.5 11"/></g>
  </Icon>
);

export const ServersIcon = (p: IconProps) => (
  <Icon {...p}>
    <g><rect x="3" y="1.75" width="10" height="12.5" rx="2"/><line x1="3" y1="6" x2="13" y2="6"/><line x1="3" y1="10" x2="13" y2="10"/><line x1="5.25" y1="3.875" x2="6.5" y2="3.875"/><line x1="5.25" y1="8" x2="6.5" y2="8"/><line x1="5.25" y1="12.125" x2="6.5" y2="12.125"/></g>
  </Icon>
);

export const DiscordIcon = ({ size = 18, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M19.27 5.33A17.6 17.6 0 0 0 14.9 4l-.2.4a16.3 16.3 0 0 1 3.96 1.29 15.3 15.3 0 0 0-13.3 0A16.3 16.3 0 0 1 9.3 4.4L9.1 4a17.6 17.6 0 0 0-4.37 1.33C1.97 9.4 1.22 13.38 1.6 17.3a17.7 17.7 0 0 0 5.37 2.7l.43-.6.73-1.03a11.5 11.5 0 0 1-1.8-.86l.44-.34a12.6 12.6 0 0 0 10.46 0l.44.34c-.57.34-1.17.63-1.8.86l.73 1.03.43.6a17.7 17.7 0 0 0 5.37-2.7c.44-4.55-.74-8.5-3.13-11.97ZM8.68 14.9c-1.04 0-1.9-.95-1.9-2.12s.84-2.13 1.9-2.13c1.07 0 1.92.96 1.9 2.13 0 1.17-.84 2.12-1.9 2.12Zm6.64 0c-1.04 0-1.9-.95-1.9-2.12s.84-2.13 1.9-2.13c1.07 0 1.92.96 1.9 2.13 0 1.17-.83 2.12-1.9 2.12Z" />
  </svg>
);
