/** CLI wrapper: `npm run sync [-- --force] [-- --only=weapons,maps]` */
import "dotenv/config";
import { runSync } from "./index";

const force = process.argv.includes("--force");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7)?.split(",");

runSync({ force, only, log: (line) => console.log(line) })
  .then((r) => {
    if (r.status === "skipped") console.log("nothing to do");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
