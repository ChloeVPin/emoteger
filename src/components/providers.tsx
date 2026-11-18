"use client";

import "./agent";
import { Toast, ToastAction, ToastDescription, ToastRegion, ToastTitle } from "@ui-sdk/react/toast";
import { MotionConfig } from "motion/react";
import { CheckIcon, CloseIcon } from "./icons";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
      {children}
      <ToastRegion side="bottom" align="center" data-agent-hidden>
        {(item) => (
          <Toast>
            <span data-show="success" aria-hidden="true" className="size-4 shrink-0 place-items-center text-fg-2">
              <CheckIcon size={14} />
            </span>
            <span data-show="error" aria-hidden="true" className="size-4 shrink-0 place-items-center text-danger">
              <CloseIcon size={14} />
            </span>
            <span data-show="loading" aria-hidden="true" className="spinner !size-3.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <ToastTitle className="truncate font-medium" />
              {item.description ? <ToastDescription className="truncate text-fg-2" /> : null}
            </div>
            {item.action ? (
              <ToastAction className="pressable h-6 shrink-0 rounded-[6px] bg-raised px-2 text-[12px] font-medium text-fg" />
            ) : null}
          </Toast>
        )}
      </ToastRegion>
    </MotionConfig>
  );
}
