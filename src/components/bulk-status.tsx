"use client";

import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@ui-sdk/react/alert-dialog";
import { Progress, ProgressIndicator, ProgressTrack } from "@ui-sdk/react/progress";
import { Button } from "./button";
import { CheckIcon } from "./icons";
import { type BulkJob, bulk, useBulk, useNow } from "./manager/bulk";
import { HoldToDelete } from "./manager/hold-button";
import { KINDS } from "./manager/kinds";

const fmt = (ms: number) => {
  const s = Math.max(1, Math.ceil(ms / 1000 - 0.05));
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
};

const secondary =
  "pressable h-8 rounded-concentric bg-raised text-[13px] font-medium transition-[filter,background-color] duration-150 [@media(hover:hover)]:hover:bg-[oklch(0.26_0.005_75)]";

function Bar({ label, value, max, waiting }: { label: string; value: number; max: number; waiting: boolean }) {
  return (
    <Progress aria-label={label} value={value} min={0} max={Math.max(1, max)}>
      <ProgressTrack className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <ProgressIndicator
          className={`h-full rounded-full transition-[width,background-color] duration-300 ease-[var(--ease-out)] motion-reduce:transition-none ${
            waiting ? "bg-fg-3" : "bg-fg"
          }`}
        />
      </ProgressTrack>
    </Progress>
  );
}

function Body({ job }: { job: BulkJob }) {
  const cfg = KINDS[job.kind];
  const total = job.targets.length;
  const processed = job.done + job.failures.length;
  const waiting = job.waitUntil !== null;
  useNow(waiting);
  const plural = (n: number) => (n === 1 ? cfg.noun : cfg.plural);
  const adding = job.action === "import";

  if (job.phase === "confirm") {
    return (
      <>
        <AlertDialogTitle className="display text-[15px] font-semibold">
          Delete all {total} {plural(total)}?
        </AlertDialogTitle>
        <AlertDialogDescription className="mt-1.5 min-h-[60px] text-fg-2">
          {total === 1 ? "It" : "They"}&rsquo;ll be removed from{" "}
          <span dir="auto" className="text-fg [overflow-wrap:anywhere]">
            {job.guildName}
          </span>{" "}
          for everyone. This can&rsquo;t be undone.
          {job.skipped ? ` ${job.skipped} managed ${plural(job.skipped)} will stay.` : ""}
        </AlertDialogDescription>
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-concentric">
          <AlertDialogClose className={`${secondary} text-fg`}>Cancel</AlertDialogClose>
          <HoldToDelete
            label="Hold to delete"
            confirm={`Deletes all ${total} ${plural(total)} from ${job.guildName}`}
            onConfirm={bulk.start}
            className="bg-danger/10"
          />
        </div>
      </>
    );
  }

  if (job.phase === "running") {
    const status = job.stopping
      ? "Stopping after this one…"
      : waiting
        ? `Discord rate limit · resuming in ${fmt(job.waitUntil! - Date.now())}`
        : job.current
          ? `${adding ? "Adding" : "Deleting"} ${cfg.quote(job.current)}`
          : "Starting…";
    return (
      <>
        <div className="flex items-baseline justify-between gap-3">
          <AlertDialogTitle className="display text-[15px] font-semibold">
            {adding ? "Adding" : "Deleting"} {cfg.plural}
          </AlertDialogTitle>
          <span className="tabular shrink-0 text-fg-3">
            <span className="text-fg">{processed}</span> of {total}
          </span>
        </div>
        <div className="mt-4">
          <Bar label={`${adding ? "Adding" : "Deleting"} ${cfg.plural}`} value={processed} max={total} waiting={waiting} />
        </div>
        <AlertDialogDescription render={<div />} className="mt-3 min-h-[38px]">
          <p className={`tabular truncate ${waiting ? "text-fg-2" : "text-fg"}`} title={status}>
            {status}
          </p>
          <p className="mt-0.5 text-[12px] text-fg-3">You can close this. It keeps going while Emoteger is open.</p>
        </AlertDialogDescription>
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-concentric">
          <AlertDialogClose className={`${secondary} text-fg`}>Hide</AlertDialogClose>
          <Button
            variant="quiet"
            disabled={job.stopping}
            onClick={() => bulk.stop()}
            className="!rounded-concentric !text-danger"
          >
            Stop
          </Button>
        </div>
      </>
    );
  }

  const verb = adding ? "added" : "deleted";
  const title = job.aborted
    ? job.done
      ? `Stopped · ${job.done} ${verb}`
      : `Couldn’t ${adding ? "add" : "delete"} ${cfg.plural}`
    : job.stopped
      ? `Stopped · ${job.done} ${verb}`
      : `${adding ? "Added" : "Deleted"} ${job.done} ${plural(job.done)}`;
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <AlertDialogTitle className="display text-[15px] font-semibold">{title}</AlertDialogTitle>
        <span className="tabular shrink-0 text-fg-3">
          <span className="text-fg">{processed}</span> of {total}
        </span>
      </div>
      <div className="mt-4">
        <Bar label={title} value={processed} max={total} waiting={false} />
      </div>
      <AlertDialogDescription render={<div />} className="mt-3 min-h-[38px] text-fg-2">
        {job.aborted ? (
          <>
            <p className="text-danger">{job.done ? job.aborted : `Discord said: ${job.aborted}`}</p>
            <p className="mt-0.5 text-[12px] text-fg-3">
              {job.done
                ? `${total - job.done} ${plural(total - job.done)} weren’t ${verb}.`
                : `Stopped after ${job.failures.length} ${job.failures.length === 1 ? "try" : "tries"}. Nothing was ${verb}.`}
            </p>
          </>
        ) : job.failures.length ? (
          <>
            <p className="text-danger">
              {job.failures.length} couldn&rsquo;t be deleted · {job.failures[0]!.reason}
            </p>
            <p
              className="mt-0.5 line-clamp-2 text-[12px] text-fg-3"
              title={job.failures.map((f) => `${cfg.quote(f.name)}: ${f.reason}`).join("\n")}
            >
              {job.failures.map((f) => cfg.quote(f.name)).join(", ")}
            </p>
          </>
        ) : job.stopped ? (
          <p>
            {total - processed} {plural(total - processed)} left untouched.
          </p>
        ) : (
          <p>
            {adding ? "Added to" : "Removed from"}{" "}
            <span dir="auto" className="text-fg">
              {job.guildName}
            </span>
            .
          </p>
        )}
      </AlertDialogDescription>
      <div className="mt-5 rounded-concentric">
        <AlertDialogClose className={`${secondary} w-full text-fg`}>Done</AlertDialogClose>
      </div>
    </>
  );
}

function Ring({ value, waiting }: { value: number; waiting: boolean }) {
  const r = 6;
  const c = 2 * Math.PI * r;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="-rotate-90">
      <circle cx="8" cy="8" r={r} fill="none" stroke="var(--color-line-strong)" strokeWidth="2" />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke={waiting ? "var(--color-fg-3)" : "var(--color-fg)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        style={{ transition: "stroke-dashoffset 300ms var(--ease-out), stroke 150ms ease" }}
      />
    </svg>
  );
}

export function BulkDialog() {
  const job = useBulk();
  return (
    <AlertDialog open={Boolean(job?.open)} onOpenChange={(open) => bulk.setOpen(open)}>
      <AlertDialogBackdrop className="fixed inset-0 z-50 m-0 border-0 bg-black/55 p-0 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
      <AlertDialogContent className="fixed inset-x-0 top-[round(down,calc(50dvh-120px),1px)] bottom-auto z-50 mx-auto my-0 h-fit w-[380px] max-w-[calc(100vw-2rem)] rounded-[24px] border-0 bg-overlay p-4 shadow-(--shadow-float) outline-none transition-[scale,opacity] duration-150 ease-[var(--ease-out)] data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0 motion-reduce:transition-none">
        {job ? (
          <div key={job.phase} className="phase-in rounded-concentric">
            <Body job={job} />
          </div>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function BulkIndicator({ variant = "pill" }: { variant?: "pill" | "row" }) {
  const job = useBulk();
  if (!job || job.open || job.phase === "confirm") return null;
  const total = job.targets.length;
  const processed = job.done + job.failures.length;
  const cfg = KINDS[job.kind];
  const verb = job.action === "import" ? "Adding" : "Deleting";
  const done = job.phase === "done";
  const icon = done ? (
    <span className="grid size-4 place-items-center text-fg-2">
      <CheckIcon size={13} />
    </span>
  ) : (
    <Ring value={total ? processed / total : 0} waiting={job.waitUntil !== null} />
  );
  const label = done ? "Show summary" : `${verb} ${processed} of ${total}`;

  if (variant === "row") {
    return (
      <Button
        variant="ghost"
        onClick={() => bulk.setOpen(true)}
        aria-label={label}
        className="phase-in !h-8 w-full !justify-start !gap-2 !rounded-[6px] !px-2 !text-[13px]"
      >
        {icon}
        <span className="min-w-0 flex-1 truncate text-left">
          {done ? (job.action === "import" ? "Import finished" : "Deletion finished") : job.waitUntil ? "Waiting on Discord" : `${verb} ${cfg.plural}`}
        </span>
        <span className="tabular text-[12px] text-fg-3">
          {processed}/{total}
        </span>
      </Button>
    );
  }

  return (
    <Button
      variant="quiet"
      onClick={() => bulk.setOpen(true)}
      aria-label={label}
      title={done ? "Finished" : job.waitUntil ? "Waiting on Discord's rate limit" : verb}
      className="phase-in !h-7 !gap-1.5 !rounded-full !pr-2.5 !pl-1.5 !text-[12px]"
    >
      {icon}
      <span className="tabular text-fg-2">
        {processed}/{total}
      </span>
    </Button>
  );
}

export function BulkStatus() {
  return (
    <>
      <BulkIndicator />
      <BulkDialog />
    </>
  );
}
