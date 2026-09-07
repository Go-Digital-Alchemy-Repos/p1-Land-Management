import { readdir, stat } from "fs/promises";
import path from "path";

type Budget = {
  pattern: RegExp;
  maxKiB: number;
  label: string;
};

type Asset = {
  name: string;
  sizeKiB: number;
};

const ASSETS_DIR = path.resolve(process.cwd(), "dist/public/assets");

const budgets: Budget[] = [
  { pattern: /^index-.*\.js$/, maxKiB: 125, label: "entry JavaScript" },
  { pattern: /^index-.*\.css$/, maxKiB: 225, label: "entry CSS" },
  { pattern: /^vendor-.*\.js$/, maxKiB: 1_100, label: "shared vendor JavaScript" },
  { pattern: /^stripe-.*\.js$/, maxKiB: 175, label: "Stripe checkout JavaScript" },
  // MapLibre includes the vector renderer and worker; isolated from the shared vendor chunk.
  { pattern: /^maps-.*\.js$/, maxKiB: 1_100, label: "map JavaScript" },
  { pattern: /^maplibre-gl-worker-.*\.js$/, maxKiB: 525, label: "map worker JavaScript" },
  { pattern: /^charts-.*\.js$/, maxKiB: 350, label: "charts JavaScript" },
  { pattern: /^tiptap-.*\.js$/, maxKiB: 225, label: "rich text editor JavaScript" },
  { pattern: /^prosemirror-.*\.js$/, maxKiB: 275, label: "editor engine JavaScript" },
  {
    pattern: /^(?!vendor-|stripe-|maps-|charts-|tiptap-|prosemirror-).+\.js$/,
    maxKiB: 175,
    label: "lazy app chunk",
  },
];

function formatKiB(value: number) {
  return `${value.toFixed(value >= 100 ? 0 : 1)} KiB`;
}

async function readAssets(): Promise<Asset[]> {
  const entries = await readdir(ASSETS_DIR);
  const assets = await Promise.all(
    entries.map(async (name) => {
      const size = await stat(path.join(ASSETS_DIR, name));
      return { name, sizeKiB: size.size / 1024 };
    }),
  );

  return assets.sort((a, b) => b.sizeKiB - a.sizeKiB);
}

function findBudget(assetName: string) {
  return budgets.find((budget) => budget.pattern.test(assetName));
}

async function main() {
  const assets = await readAssets();
  const checkedAssets = assets
    .map((asset) => ({ asset, budget: findBudget(asset.name) }))
    .filter((entry): entry is { asset: Asset; budget: Budget } => Boolean(entry.budget));

  const failures = checkedAssets.filter(({ asset, budget }) => asset.sizeKiB > budget.maxKiB);
  const largest = checkedAssets.slice(0, 12);

  console.log("Bundle budget report");
  for (const { asset, budget } of largest) {
    console.log(
      `${asset.name.padEnd(48)} ${formatKiB(asset.sizeKiB).padStart(9)} / ${formatKiB(
        budget.maxKiB,
      ).padStart(9)} ${budget.label}`,
    );
  }

  if (failures.length > 0) {
    console.error("\nBundle budget exceeded:");
    for (const { asset, budget } of failures) {
      console.error(
        `- ${asset.name}: ${formatKiB(asset.sizeKiB)} exceeds ${budget.label} budget of ${formatKiB(
          budget.maxKiB,
        )}`,
      );
    }
    process.exit(1);
  }

  console.log("\nBundle budgets passed.");
}

main().catch((error) => {
  console.error(
    error instanceof Error && error.message.includes("ENOENT")
      ? "Bundle assets not found. Run `npm run build` before `npm run budget`."
      : error,
  );
  process.exit(1);
});
