"use client";

import { useRef } from "react";
import type { SessionUser } from "@/lib/session";
import { UserAvatar } from "./avatar";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, itemClass, popupClass } from "./menu";

export function UserMenu({ user }: { user: SessionUser }) {
  const name = user.globalName ?? user.username;
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <>
      <form ref={formRef} action="/api/auth/logout" method="post" hidden />
      <Menu onAction={(value) => value === "sign-out" && formRef.current?.requestSubmit()}>
        <MenuTrigger
          aria-label="Account"
          className="pressable grid size-8 place-items-center rounded-full outline-offset-1"
        >
          <UserAvatar user={user} size={24} />
        </MenuTrigger>
        <MenuContent sideOffset={8} align="end" className={popupClass}>
          <div className="px-2 pt-1.5 pb-2">
            <div className="truncate font-medium">{name}</div>
            {user.globalName ? <div className="truncate text-[12px] text-fg-3">@{user.username}</div> : null}
          </div>
          <MenuSeparator className="-mx-1 my-1 h-px bg-line" />
          <MenuItem value="sign-out" className={itemClass}>
            Sign out
          </MenuItem>
        </MenuContent>
      </Menu>
    </>
  );
}
