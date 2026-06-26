import Koa from "koa";
import serve from "koa-static";
import Path from "path";
import ServerlessHttp from "serverless-http";
import fs from "fs/promises";
import crypto from "crypto";
import zlib from "zlib";
import { ChainInfo } from "@keplr-wallet/types";

type SearchOption = "all" | "cosmos" | "evm" | "svm";
type FilterOption = "all" | "chain" | "token" | "chainNameAndToken";

let defaultChains: ChainInfo[] | undefined;
let allChains: ChainInfo[] | undefined;
let cosmosChainInfos: ChainInfo[] | undefined;
let evmChainInfos: ChainInfo[] | undefined;
let svmChainInfos: ChainInfo[] | undefined;

const CACHE_MAX_AGE_SECONDS = 20 * 60;
const CACHE_CONTROL = `public, max-age=${CACHE_MAX_AGE_SECONDS}`;
const GZIP_MIN_BYTES = 1024;

const app = new Koa();

const createETag = (content: string | Buffer): string => {
  const hash = crypto.createHash("sha256").update(content).digest("base64url");
  return `W/"${hash}"`;
};

const createStaticETag = (stats: { size: number; mtimeMs: number }): string =>
  `W/"${stats.size.toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}"`;

const appendVary = (ctx: Koa.Context, value: string) => {
  const current = ctx.response.get("Vary");

  if (!current) {
    ctx.set("Vary", value);
    return;
  }

  const values = current.split(",").map((headerValue) => headerValue.trim());
  if (
    !values.some(
      (headerValue) => headerValue.toLowerCase() === value.toLowerCase(),
    )
  ) {
    ctx.set("Vary", `${current}, ${value}`);
  }
};

const acceptsGzip = (ctx: Koa.Context): boolean =>
  ctx.acceptsEncodings("gzip", "identity") === "gzip";

const etagMatches = (ctx: Koa.Context, etag: string): boolean => {
  const ifNoneMatch = ctx.get("If-None-Match");
  if (!ifNoneMatch) return false;

  return ifNoneMatch
    .split(",")
    .map((headerValue) => headerValue.trim())
    .some((headerValue) => headerValue === "*" || headerValue === etag);
};

const respondNotModified = (ctx: Koa.Context) => {
  ctx.status = 304;
  ctx.body = null;
  ctx.remove("Content-Length");
  ctx.remove("Content-Type");
  ctx.remove("Content-Encoding");
};

const gzipBody = async (body: string | Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    zlib.gzip(body, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });

const shouldGzip = (ctx: Koa.Context, bodyLength: number): boolean =>
  ctx.method !== "HEAD" &&
  ctx.status === 200 &&
  bodyLength >= GZIP_MIN_BYTES &&
  !ctx.response.get("Content-Encoding") &&
  acceptsGzip(ctx);

const sendCacheableJson = async (ctx: Koa.Context, body: unknown) => {
  const responseBody = JSON.stringify(body);
  const etag = createETag(responseBody);

  ctx.status = 200;
  ctx.type = "application/json";
  ctx.set("Cache-Control", CACHE_CONTROL);
  ctx.set("ETag", etag);

  if (etagMatches(ctx, etag)) {
    respondNotModified(ctx);
    return;
  }

  if (shouldGzip(ctx, Buffer.byteLength(responseBody))) {
    appendVary(ctx, "Accept-Encoding");
    ctx.set("Content-Encoding", "gzip");
    ctx.body = await gzipBody(responseBody);
    return;
  }

  ctx.body = responseBody;
};

app.use(async (ctx, next) => {
  await next();

  if (ctx.status !== 200 || !ctx.body) return;

  const etag = ctx.response.get("ETag");
  if (etag && etagMatches(ctx, etag)) {
    respondNotModified(ctx);
    return;
  }

  if (
    ctx.method !== "HEAD" &&
    !ctx.response.get("Content-Encoding") &&
    acceptsGzip(ctx) &&
    typeof (ctx.body as any).pipe === "function"
  ) {
    const contentLength = ctx.response.get("Content-Length");
    const bodyLength = contentLength ? parseInt(contentLength, 10) : 0;

    if (bodyLength >= GZIP_MIN_BYTES) {
      appendVary(ctx, "Accept-Encoding");
      ctx.set("Content-Encoding", "gzip");
      ctx.remove("Content-Length");
      ctx.body = (ctx.body as any).pipe(zlib.createGzip());
    }
  }
});

app.use(
  serve(Path.resolve(__dirname, "static"), {
    maxage: CACHE_MAX_AGE_SECONDS * 1000,
    setHeaders: (res, _path, stats) => {
      res.setHeader("Cache-Control", CACHE_CONTROL);
      res.setHeader("ETag", createStaticETag(stats));
    },
  }),
);

const isEvmOnlyChain = (chainInfo: ChainInfo): boolean => {
  const chainIdLikeCAIP2 = chainInfo.chainId.split(":");
  return (
    chainInfo.evm != null &&
    chainIdLikeCAIP2.length === 2 &&
    chainIdLikeCAIP2[0] === "eip155"
  );
};

const loadChains = async () => {
  if (
    defaultChains &&
    allChains &&
    cosmosChainInfos &&
    evmChainInfos &&
    svmChainInfos
  ) {
    return {
      defaultChains,
      allChains,
      cosmosChainInfos,
      evmChainInfos,
      svmChainInfos,
    };
  }

  const cosmosChainsDirectory = Path.join(__dirname, "static", "cosmos");
  const cosmosChainFiles = await fs.readdir(cosmosChainsDirectory);
  const cosmosChainContents = await Promise.all(
    cosmosChainFiles.map((fileName) =>
      fs.readFile(Path.join(cosmosChainsDirectory, fileName), "utf8"),
    ),
  );
  cosmosChainInfos = cosmosChainContents
    .filter((content) => {
      try {
        JSON.parse(content);
        return true;
      } catch (e) {
        console.error("failed to parse chain info", content, e);
        return false;
      }
    })
    .map((content) => JSON.parse(content));

  const evmChainsDirectory = Path.join(__dirname, "static", "evm");
  const evmChainFiles = await fs.readdir(evmChainsDirectory);
  const evmChainContents = await Promise.all(
    evmChainFiles.map((fileName) =>
      fs.readFile(Path.join(evmChainsDirectory, fileName), "utf8"),
    ),
  );
  evmChainInfos = evmChainContents
    .filter((content) => {
      try {
        JSON.parse(content);
        return true;
      } catch (e) {
        console.error("failed to parse chain info", content, e);
        return false;
      }
    })
    .map((content) => {
      const evmChainInfo = JSON.parse(content);
      const chainId = parseInt(evmChainInfo.chainId.replace("eip155:", ""), 10);
      return {
        ...evmChainInfo,
        rest: evmChainInfo.rpc,
        evm: {
          chainId,
          rpc: evmChainInfo.rpc,
          websocket: evmChainInfo.websocket,
        },
        features: [
          "eth-address-gen",
          "eth-key-sign",
          ...(evmChainInfo.features || []),
        ],
      };
    });

  const svmChainsDirectory = Path.join(__dirname, "static", "svm");
  svmChainInfos = await (async () => {
    try {
      const svmChainFiles = await fs.readdir(svmChainsDirectory);
      const svmChainContents = await Promise.all(
        svmChainFiles.map((fileName) =>
          fs.readFile(Path.join(svmChainsDirectory, fileName), "utf8"),
        ),
      );
      return svmChainContents
        .filter((content) => {
          try {
            JSON.parse(content);
            return true;
          } catch (e) {
            console.error("failed to parse svm chain info", content, e);
            return false;
          }
        })
        .map((content) => {
          const svmChainInfo = JSON.parse(content);
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

  cosmosChainInfos = cosmosChainInfos.sort((a, b) =>
    a.chainName.localeCompare(b.chainName),
  );
  evmChainInfos = evmChainInfos.sort((a, b) =>
    a.chainName.localeCompare(b.chainName),
  );
  svmChainInfos = svmChainInfos.sort((a, b) =>
    a.chainName.localeCompare(b.chainName),
  );

  defaultChains = [...cosmosChainInfos, ...evmChainInfos].sort((a, b) =>
    a.chainName.localeCompare(b.chainName),
  );

  allChains = [...defaultChains, ...svmChainInfos].sort((a, b) =>
    a.chainName.localeCompare(b.chainName),
  );

  return {
    defaultChains,
    allChains,
    cosmosChainInfos,
    evmChainInfos,
    svmChainInfos,
  };
};

const filterChains = (
  chainInfos: ChainInfo[],
  filterOption: FilterOption,
  searchText: string,
): ChainInfo[] => {
  if (searchText.length === 0) return chainInfos;

  return chainInfos.filter((chainInfo) => {
    const chainId = chainInfo.chainId.toLowerCase();
    const chainName = chainInfo.chainName.toLowerCase();
    const mainCurrencyDenom = chainInfo.currencies[0].coinDenom.toLowerCase();
    const stakeCurrencyDenom = chainInfo.stakeCurrency?.coinDenom.toLowerCase();
    const tokenDenom = isEvmOnlyChain(chainInfo)
      ? mainCurrencyDenom
      : stakeCurrencyDenom || mainCurrencyDenom;

    // search text가 eth 또는 eth~ethereum일 경우 evm 체인은 모두 보여준다.
    if (searchText.startsWith("eth")) {
      const isEVM = !("bech32Config" in chainInfo);

      if (isEVM) {
        return true;
      }
    }

    switch (filterOption) {
      case "all":
        return (
          chainName.includes(searchText) ||
          chainId.includes(searchText) ||
          tokenDenom.includes(searchText)
        );
      case "chain":
        return chainName.includes(searchText) || chainId.includes(searchText);
      case "token":
        return tokenDenom.includes(searchText);
      case "chainNameAndToken":
        return (
          chainName.includes(searchText) || tokenDenom.includes(searchText)
        );
      default:
        return false;
    }
  });
};

app.use(async (ctx, next) => {
  if (ctx.path !== "/chains/all") return next();

  try {
    const searchOption = (ctx.query["searchOption"] ?? "all") as SearchOption;
    const filterOption = (ctx.query["filterOption"] ?? "all") as FilterOption;
    const searchTextRaw = ctx.query["searchText"];
    const trimmedSearchText = Array.isArray(searchTextRaw)
      ? searchTextRaw[0]?.trim().toLowerCase() || ""
      : searchTextRaw?.trim().toLowerCase() || "";

    const { allChains, cosmosChainInfos, evmChainInfos, svmChainInfos } =
      await loadChains();

    let filteredChains: ChainInfo[] = [];

    switch (searchOption) {
      case "all":
        filteredChains = filterChains(
          allChains,
          filterOption,
          trimmedSearchText,
        );
        break;
      case "cosmos":
        filteredChains = filterChains(
          cosmosChainInfos,
          filterOption,
          trimmedSearchText,
        );
        break;
      case "evm":
        filteredChains = filterChains(
          evmChainInfos,
          filterOption,
          trimmedSearchText,
        );
        break;
      case "svm":
        filteredChains = filterChains(
          svmChainInfos,
          filterOption,
          trimmedSearchText,
        );
        break;
    }

    await sendCacheableJson(ctx, { chains: filteredChains });
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: "Internal Server Error" };
    console.error("Error processing /chains/all request:", error);
  }
});

app.use(async (ctx) => {
  if (ctx.path !== "/chains") return;

  try {
    const searchOption = (ctx.query["searchOption"] ?? "all") as SearchOption;
    const filterOption = (ctx.query["filterOption"] ?? "all") as FilterOption;
    const searchTextRaw = ctx.query["searchText"];
    const trimmedSearchText = Array.isArray(searchTextRaw)
      ? searchTextRaw[0]?.trim().toLowerCase() || ""
      : searchTextRaw?.trim().toLowerCase() || "";

    const { defaultChains, cosmosChainInfos, evmChainInfos } =
      await loadChains();

    let filteredChains: ChainInfo[] = [];

    switch (searchOption) {
      case "all":
        filteredChains = filterChains(
          defaultChains,
          filterOption,
          trimmedSearchText,
        );
        break;
      case "cosmos":
        filteredChains = filterChains(
          cosmosChainInfos,
          filterOption,
          trimmedSearchText,
        );
        break;
      case "evm":
        filteredChains = filterChains(
          evmChainInfos,
          filterOption,
          trimmedSearchText,
        );
        break;
    }

    await sendCacheableJson(ctx, { chains: filteredChains });
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: "Internal Server Error" };
    console.error("Error processing /chains request:", error);
  }
});

const isAWSLambda = !!(process.env as any).LAMBDA_TASK_ROOT;

if (!isAWSLambda) {
  app.listen(3000, () => {
    console.log("Server started on port 3000");
  });
} else {
  module.exports.handler = ServerlessHttp(app);
}
