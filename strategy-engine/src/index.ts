// Main Entry point

import {
  exampleManualStrategy,
  exampleSingleAgent,
} from "./integration/integration.ts";
import "dotenv/config";

async function main() {
  const mode = process.env.MODE || "development";

  if (mode === "production") {
  } else {
    // Development mode - run examples
    await exampleSingleAgent();
  }
}

// run if executed directly
// if (import.meta.url === `file://${process.argv[1]}`) {
//   main().catch(console.error);
// }
main().catch(console.error);
