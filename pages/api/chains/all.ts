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

  const svmChainsDirectory = path.join(process.cwd(), "svm");
  const svmChainInfos: ChainInfo[] = await (async () => {
    try {
      const svmChains = await Promise.all(
        (
          await fs.readdir(svmChainsDirectory)
        ).map((fileName) =>
          fs.readFile(`${svmChainsDirectory}/${fileName}`, "utf8"),
        ),
      );
      return svmChains.map((chainInfo) => {
        const svmChainInfo = JSON.parse(chainInfo);
        return {
          ...svmChainInfo,
          rest: svmChainInfo.rpc,
          svm: {
            rpc: svmChainInfo.rpc,
            websocket: svmChainInfo.websocket,
          },
        };
      });
    } catch {
      return [];
    }
  })();

  res.status(200).json({
    chains: cosmosChainInfos.concat(evmChainInfos).concat(svmChainInfos),
  });
}
