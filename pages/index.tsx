import { useEffect } from "react";

interface RepositoryTreesResponse {
  sha: string;
  tree: RepositoryTree[];
}

interface RepositoryTree {
  path: string;
  url: string;
}

interface BlobResponse {
  content: string;
}

export default function Home() {
  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const urls: string[] = await fetchRepositoryTrees();

    const chainBlobs = urls.map((tree) => fetchChainBlob(tree));

    // const test = await Promise.all(chainBlobs);
    // console.log(test);
  };

  const fetchRepositoryTrees = async () => {
    const response: RepositoryTreesResponse = await (
      await fetch(
        "https://api.github.com/repos/chainapsis/keplr-chain-registry/git/trees/main?recursive=1",
      )
    ).json();

    return response.tree
      .filter((item) => item.path.includes("cosmos/"))
      .map((item) => item.url);
  };

  const fetchChainBlob = async (url: string) => {
    const response: BlobResponse = await (await fetch(url)).json();

    const decoded = JSON.parse(
      Buffer.from(response.content, "base64").toString("utf-8"),
    );

    return decoded;
  };

  return <div>Home</div>;
}
