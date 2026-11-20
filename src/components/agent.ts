"use client";

import { createAgent, registerTools } from "@ui-sdk/react/agent";

const agent =
  typeof document !== "undefined"
    ? createAgent({
        allow: (step) => (step.confirm ? window.confirm(step.confirm) : true),
      })
    : null;

if (agent) {
  // window.agent is a console handle for trying the bridge by hand; production doesn't need it.
  if (process.env.NODE_ENV !== "production") Object.assign(window, { agent });
  registerTools(agent, { allow: () => true });
}

export { agent };
