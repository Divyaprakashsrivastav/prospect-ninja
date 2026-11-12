const { spawn } = require("child_process");
const { loadEnvLocal } = require("./loadEnvLocal");

loadEnvLocal();

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/run-with-env.js <command> [...args]");
  process.exit(1);
}

const child = spawn(args[0], args.slice(1), {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
