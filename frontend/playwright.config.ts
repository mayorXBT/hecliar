import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:3210",
    trace: "on-first-retry",
  },
  // localhost, not 127.0.0.1: Next 16's dev server treats the two as different
  // origins and answers 127.0.0.1 with 403 for every chunk. The page then
  // renders without ever hydrating, so the setup form falls back to a native
  // GET submit and the suite never leaves the setup screen.
  //
  // localhost, not 127.0.0.1: Next 16 dev rejects requests whose origin it
  // does not recognise, and against 127.0.0.1 it answered 403 for every JS
  // chunk. The page then rendered without hydrating, so the setup form fell
  // back to a native GET submit and the suite could never reach the table.
  //
  // The suite drives the robot, which only exists on the in-memory transport;
  // .env.local points at the chain for the friend-mode demo. Port 3210 keeps
  // this off 3000, which other projects on this machine use.
  webServer: {
    command: "npm run dev -- --port 3210",
    url: "http://localhost:3210",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { NEXT_PUBLIC_GAME_TRANSPORT: "local" },
  },
});
