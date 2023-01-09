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

  const jsonDirectory = path.join(process.cwd(), "cosmos");

  const fetchChains = (await fs.readdir(jsonDirectory)).map((fileName) =>
    fs.readFile(`${jsonDirectory}/${fileName}`, "utf8"),
  );

  const chainInfos: ChainInfo[] = (await Promise.all(fetchChains)).map(
    (chainInfo) => JSON.parse(chainInfo),
  );

  //Return the content of the data file in json format
  res.status(200).json({ chains: chainInfos });
}
