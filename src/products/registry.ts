import type { ProductModule } from "./types.js";
import { taxToolsProducts } from "./tax-tools.js";
import { tradingToolsProducts } from "./trading-tools.js";
import { ai_automation_batch_1 } from "./ai-automation.js";
import { ai_automation_batch_2 } from "./ai-automation-2.js";
import { businessTemplatesProducts } from "./business-templates.js";
import { apisProducts } from "./apis.js";
import { sourceCodeProducts } from "./source-code.js";
import { premiumAppsProducts } from "./premium-apps.js";

export const allProducts: ProductModule[] = [
  ...premiumAppsProducts,
  ...taxToolsProducts,
  ...tradingToolsProducts,
  ...ai_automation_batch_1,
  ...ai_automation_batch_2,
  ...businessTemplatesProducts,
  ...apisProducts,
  ...sourceCodeProducts,
];

export const productsBySlug: Map<string, ProductModule> = new Map(
  allProducts.map((p) => [p.slug, p])
);
