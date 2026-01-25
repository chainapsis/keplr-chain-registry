// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import path from "path";
import { promises as fs } from "fs";
import { ChainInfo } from "@keplr-wallet/types";
import Cors from "cors";

type Data = {
  chains: ChainInfo[];
};

const cors = Cors({
  methods: ["GET"],
});

export default async function (
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  await new Promise((resolve, reject) => {
    cors(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }

      return resolve(result);
    });
  });

  const cosmosChainsDirectory = path.join(process.cwd(), "cosmos");
  const cosmosChains = (await fs.readdir(cosmosChainsDirectory)).map(
    (fileName) => fs.readFile(`${cosmosChainsDirectory}/${fileName}`, "utf8"),
  );
  const cosmosChainInfos: ChainInfo[] = (await Promise.all(cosmosChains)).map(
    (chainInfo) => JSON.parse(chainInfo),
  );

  const evmChainsDirectory = path.join(process.cwd(), "evm");
  const evmChains = await Promise.all(
    (
      await fs.readdir(evmChainsDirectory)
    ).map((fileName) =>
      fs.readFile(`${evmChainsDirectory}/${fileName}`, "utf8"),
    ),
  );
  const evmChainInfos: ChainInfo[] = (await Promise.all(evmChains)).map(
    (chainInfo) => {
      const evmChainInfo = JSON.parse(chainInfo);
      const evmChainId = parseInt(evmChainInfo.chainId.replace("eip155:", ""));
      const { websocket, features, ...restEVMChainInfo } = evmChainInfo;
      return {
        ...restEVMChainInfo,
        rest: evmChainInfo.rpc,
        evm: {
          chainId: evmChainId,
          rpc: evmChainInfo.rpc,
          websocket,
        },
        features: ["eth-address-gen", "eth-key-sign"].concat(features ?? []),
      };
    },
  );

  // Return the content of the data file in json format
  res.status(200).json({ chains: cosmosChainInfos.concat(evmChainInfos) });
}
