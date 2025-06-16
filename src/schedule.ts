import { readdirSync } from "fs";
import {
  validateCosmosChainInfoFromPath,
  validateEvmChainInfoFromPath,
} from "./validate";
import * as core from "@actions/core";

const main = async () => {
  const cosmosJsonFiles = readdirSync("cosmos");
  const evmJsonFiles = readdirSync("evm");
  core.setOutput("hasError", false);

  let errorMessages: (
    | {
        file: string;
        error: any;
      }
    | undefined
  )[] = await Promise.all(
    cosmosJsonFiles
      .map(async (file) => {
        try {
          await validateCosmosChainInfoFromPath(`cosmos/${file}`);
        } catch (e) {
          return {
            file,
            error: e,
          };
        }

        return undefined;
      })
      .concat(
        evmJsonFiles.map(async (file) => {
          try {
            await validateEvmChainInfoFromPath(`evm/${file}`);
          } catch (e) {
            return {
              file,
              error: e,
            };
          }
          return undefined;
        }),
      ),
  );

  errorMessages = errorMessages.filter((e) => e != null);

  for (const e of errorMessages) {
    console.log(`Error on: ${e?.file}, ${e?.error?.message || e?.error}`);
  }

  if (errorMessages.length !== 0) {
    core.setOutput("hasError", true);
    core.setOutput(
      "errorMessage",
      errorMessages
        .map((e) => `${e?.file}: ${e?.error?.message || e?.error}`)
        .join("\\n \\n"),
    );
    process.exit(1);
  }
};

main();
