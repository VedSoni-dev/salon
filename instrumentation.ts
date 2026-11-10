// Startup hook. With PUBLIK_SELF_TEST set, the built app proves its publik wiring and exits:
//   npm run build && PUBLIK_SELF_TEST=1 npm start
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.PUBLIK_SELF_TEST) {
    const { selfTest } = await import("./lib/publik");
    console.log(await selfTest());
    process.exit(0);
  }
}
