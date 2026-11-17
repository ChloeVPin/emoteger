"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
      {children}
      <Toaster
        position="bottom-center"
        gap={8}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "flex w-full items-center gap-2.5 rounded-[10px] bg-overlay px-3 py-2.5 text-[13px] text-fg shadow-(--shadow-float)",
            title: "font-medium",
            description: "text-fg-2",
            error: "[&_[data-icon]]:text-danger",
            success: "[&_[data-icon]]:text-fg-2",
          },
        }}
      />
    </MotionConfig>
  );
}
