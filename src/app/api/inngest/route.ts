import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { discoverFunctions } from "@/inngest/functions/discover";

// Inngest calls this endpoint to run functions. Requests are verified with
// INNGEST_SIGNING_KEY in production; no session auth applies here.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [...discoverFunctions],
});
