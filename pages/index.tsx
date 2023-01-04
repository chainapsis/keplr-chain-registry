import { useEffect, useState } from "react";
import { ChainInfo } from "@keplr-wallet/types";
import { ChainItem } from "./components/chain-item";
import { getKeplrFromWindow, KeplrWallet } from "../wallet";

interface ChainsResponse {
  chains: ChainInfo[];
}

type DisplayType = "normal" | "registered";

export type DisplayChainInfo = ChainInfo & { displayType: DisplayType };

export default function Home() {
  const [isExist, setIsExist] = useState<boolean>();
  const [chainInfos, setChainInfos] = useState<DisplayChainInfo[]>([]);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const chainIds = await checkKeplr();
      await fetchChains(chainIds);
    } catch (e) {
      console.error(e);
    }
  };

  const checkKeplr = async () => {
    const keplr = await getKeplrFromWindow();

    if (keplr === undefined) {
      setIsExist(false);
      return;
      // window.location.href =
      //   "https://chrome.google.com/webstore/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap";
    }

    if (keplr) {
      setIsExist(true);

      const wallet = new KeplrWallet(keplr);
      const chainIds = (await wallet.getChainInfosWithoutEndpoints()).map(
        (c) => c.chainId,
      );

      await wallet.init(chainIds);

      return chainIds;
    }
  };

  const fetchChains = async (chainIds: string[] | undefined) => {
    const chainsResponse: ChainsResponse = await (
      await fetch("/api/chains")
    ).json();

    const registeredChainInfos = chainsResponse.chains;

    const displayChainInfo: DisplayChainInfo[] = registeredChainInfos.map(
      (chainInfo) => {
        if (chainIds?.includes(chainInfo.chainId)) {
          return { ...chainInfo, displayType: "registered" };
        }

        return { ...chainInfo, displayType: "normal" };
      },
    );

    setChainInfos(displayChainInfo);
  };

  return (
    <div>
      {!isExist ? <div>Install Keplr</div> : null}
      {chainInfos.map((chainInfo) => (
        <ChainItem chainItem={chainInfo} />
      ))}
    </div>
  );
}
