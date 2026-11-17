"use client";

import { AnimatePresence, motion } from "motion/react";
import { UploadIcon } from "../icons";

export function DropOverlay({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="pointer-events-none fixed inset-0 z-50 grid bg-bg/85 p-3"
        >
          <div className="grid place-items-center rounded-[16px] [background-image:url(&quot;data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect x='1' y='1' width='calc(100%25 - 2px)' height='calc(100%25 - 2px)' fill='none' rx='15' ry='15' stroke='%23ffffff33' stroke-width='1.5' stroke-dasharray='6%2c 6'/%3e%3c/svg%3e&quot;)]">
            <div className="flex flex-col items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-raised text-fg">
                <UploadIcon />
              </span>
              <span className="text-[14px] font-medium">Drop to upload</span>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
