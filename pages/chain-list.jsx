import { useEffect } from "react";

export default function ChainListPage() {
  useEffect(() => {
    const test = require("../src/chain-list");
  }, []);

  return (
    <div>
      <div id="registred-buttons"></div>
      <div id="chain-list"></div>
    </div>
  );
}
