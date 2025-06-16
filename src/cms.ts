import axios from "axios";
import { nativeMainnetChainIdentifiers } from "./constants";
import { readFile } from "fs/promises";
import { ChainInfo } from "@keplr-wallet/types";
import { ChainIdHelper } from "@keplr-wallet/cosmos";

const webflowCmsInstance = axios.create({
  baseURL: `https://api.webflow.com/v2/collections/${process.env.WEBFLOW_COLLECTION_ID}`,
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${process.env.WEBFLOW_TOKEN}`,
    "Content-Type": "application/json",
  },
});

interface WebflowCmsCollectionItem {
  id: string;
  cmsLocaleId: string | null;
  lastPublished: string;
  lastUpdated: string;
  createdOn: string;
  isArchived: boolean;
  isDraft: boolean;
  fieldData: WebflowCmsCollectionItemFieldData;
}

interface WebflowCmsCollectionItemFieldData {
  name: string;
  slug: string;
  "chain-identifier": string;
  token: string;
  "short-address": "string";
  label: {
    fileId: string;
    url: string;
    alt: string | null;
  };
  "order-number"?: number;
}

const main = async () => {
  try {
    const nativeChainInfos = await Promise.all(
      nativeMainnetChainIdentifiers.map(async (chainIdentifier) => {
        const data = await readFile(`cosmos/${chainIdentifier}.json`, "utf-8");
        return JSON.parse(data) as ChainInfo;
      }),
    );
    const {
      data: { items },
    } = await webflowCmsInstance.get<{
      items: WebflowCmsCollectionItem[];
    }>("/items");

    const creatings = await Promise.all(
      nativeChainInfos
        .filter(
          (chainInfo) =>
            !items.some(
              (item) =>
                item.fieldData["chain-identifier"] ===
                ChainIdHelper.parse(chainInfo.chainId).identifier,
            ),
        )
        .map(async (chainInfo) => {
          const chainIdentifier = ChainIdHelper.parse(
            chainInfo.chainId,
          ).identifier;
          return (
            await webflowCmsInstance.post(`/items`, {
              isArchived: false,
              isDraft: false,
              fieldData: {
                name: chainInfo.chainName,
                slug: chainInfo.chainName
                  .toLowerCase()
                  .replace(/(\ |\.)/g, "-"),
                "chain-identifier": chainIdentifier,
                token: chainInfo.currencies[0].coinDenom,
                "short-address": chainInfo.bech32Config?.bech32PrefixAccAddr,
                label: {
                  url: chainInfo?.chainSymbolImageUrl,
                },
              },
            })
          ).data.id;
        }),
    );

    const updates = await Promise.all(
      items.map(async (item) => {
        const chainInfo = nativeChainInfos.find(
          (chainInfo) => chainInfo.chainName === item.fieldData.name,
        );

        if (chainInfo) {
          const chainIdentifier = ChainIdHelper.parse(
            chainInfo.chainId,
          ).identifier;
          return (
            await webflowCmsInstance.patch(`/items/${item.id}`, {
              fieldData: {
                name: chainInfo.chainName,
                "chain-identifier": chainIdentifier,
                token: chainInfo.currencies[0].coinDenom,
                "short-address": chainInfo.bech32Config?.bech32PrefixAccAddr,
                label: {
                  url: chainInfo?.chainSymbolImageUrl,
                },
              },
            })
          ).data.id;
        }
      }),
    );

    await Promise.all(
      items
        .filter(
          (item) =>
            !nativeChainInfos.some(
              (chainInfo) =>
                item.fieldData["chain-identifier"] ===
                ChainIdHelper.parse(chainInfo.chainId).identifier,
            ),
        )
        .map(async (item) => {
          await webflowCmsInstance.delete(`/items/${item.id}`);
        }),
    );

    const published = await webflowCmsInstance.post("/items/publish", {
      itemIds: creatings.concat(updates),
    });

    console.log(published.data);
  } catch (e) {
    console.error(e);
  }
};

main();
