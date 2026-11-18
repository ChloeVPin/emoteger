"use client";

import { createAgent, registerTools } from "@ui-sdk/react/agent";

const agent =
  typeof document !== "undefined"
    ? createAgent({
        allow: (step) => (step.confirm ? window.confirm(step.confirm) : true),
      })
    : null;

if (agent && typeof window !== "undefined") {
  Object.assign(window, { agent });
  registerTools(agent, { allow: () => true });
}

export { agent };
