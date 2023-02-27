import { readdirSync } from "fs";
import { validateChainInfoFromPath } from "./validate";

const main = async () => {
  const jsonFiles = readdirSync("cosmos");

  let errorMessages: (
    | {
        file: string;
        error: any;
      }
    | undefined
  )[] = await Promise.all(
    jsonFiles.map(async (file) => {
      try {
        await validateChainInfoFromPath(`cosmos/${file}`);
      } catch (e) {
        return {
          file,
          error: e,
        };
      }

      return undefined;
    }),
  );

  errorMessages = errorMessages.filter((e) => e != null);

  for (const e of errorMessages) {
    console.log(`Error on: ${e?.file}, ${e?.error?.message || e?.error}`);
  }

  if (errorMessages.length !== 0) {
    process.exit(1);
  }
};

main();
