import { useEffect } from "react";

export default function ChainListPage() {
  useEffect(() => {
    require("../src/chain-list");
  }, []);

  return (
    <div>
      <div id="keplr-not-installed" style={{ display: "none" }}>
        keplr-not-installed
      </div>
      <div id="registred-buttons" />
      <div id="chain-list" />
      <div id="loading" style={{ display: "none" }}>
        loading
      </div>
    </div>
  );
}
