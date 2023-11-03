import { readFileSync, writeFileSync } from "fs";
import { ChainInfo } from "@keplr-wallet/types";
import { Dec } from "@keplr-wallet/unit";

const main = async () => {
  try {
    const path = "cosmos/osmosis.json";
    const file = readFileSync(path, "utf-8");

    const chainInfo: ChainInfo = JSON.parse(file);

    // Get Osmosis's gas price step.
    const gasPriceStep = chainInfo.feeCurrencies.find(
      (currency) => currency.coinMinimalDenom === "uosmo",
    )?.gasPriceStep;

    if (gasPriceStep) {
      // Get Osmosis's base fee.
      const response = await fetch(
        "http://104.248.140.198:1317/osmosis/txfees/v1beta1/cur_eip_base_fee",
      );
      const result: { base_fee: string } = await response.json();
      const baseFee = new Dec(result.base_fee);

      // Calculate new gas price step.
      const low = new Dec(gasPriceStep.low);
      let average = baseFee.mul(new Dec(1.1));
      let high = baseFee.mul(new Dec(2));

      if (average.lt(low)) {
        average = low;
      }

      if (high.lt(average)) {
        high = average;
      }

      // If the gas price step is not changed, do not update.
      if (
        gasPriceStep.average === parseFloat(average.toString()) &&
        gasPriceStep.high === parseFloat(high.toString())
      ) {
        console.error("No need to update");
        return;
      }

      const newGasPriceStep = {
        ...gasPriceStep,
        average: parseFloat(average.toString()),
        high: parseFloat(high.toString()),
      };

      // Update the gas price step.
      const newChainInfo = {
        ...chainInfo,
        feeCurrencies: chainInfo.feeCurrencies.map((currency) => {
          if (currency.coinMinimalDenom === "uosmo") {
            return {
              ...currency,
              gasPriceStep: newGasPriceStep,
            };
          }
          return currency;
        }),
      };

      // Write the updated chain info.
      writeFileSync(path, JSON.stringify(newChainInfo, null, 2));
    }
  } catch (e: any) {
    console.log(e.message || e.toString());

    process.exit(1);
  }
};

main();
