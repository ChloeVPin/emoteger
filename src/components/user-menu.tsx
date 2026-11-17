"use client";

import { avatarUrl } from "@/lib/cdn";
import type { SessionUser } from "@/lib/session";
import { Menu, itemClass, popupClass } from "./menu";

export function UserMenu({ user }: { user: SessionUser }) {
  const name = user.globalName ?? user.username;
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Account"
        className="pressable grid size-8 place-items-center rounded-full outline-offset-1"
      >
        <img src={avatarUrl(user)} alt="" width={24} height={24} className="size-6 rounded-full" draggable={false} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50">
          <Menu.Popup className={popupClass}>
            <div className="px-2 pt-1.5 pb-2">
              <div className="truncate font-medium">{name}</div>
              {user.globalName ? <div className="truncate text-[12px] text-fg-3">@{user.username}</div> : null}
            </div>
            <Menu.Separator className="-mx-1 my-1 h-px bg-line" />
            <form action="/api/auth/logout" method="post" className="rounded-concentric">
              <Menu.Item
                closeOnClick={false}
                nativeButton
                render={<button type="submit" className={`${itemClass} w-full text-left`} />}
              >
                Sign out
              </Menu.Item>
            </form>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
