// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import path from "path";
import { promises as fs } from "fs";
import { ChainInfo } from "@keplr-wallet/types";

type Data = {
  chains: ChainInfo[];
};

export default async function handler(
  _: NextApiRequest,
  res: NextApiResponse<Data>,
) {
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
