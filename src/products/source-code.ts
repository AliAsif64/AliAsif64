import type { ProductModule } from "./types.js";

export const nextjsSaasStarter: ProductModule = {
  slug: "nextjs-saas-starter",
  title: "Next.js SaaS Starter",
  category: "source-code",
  tagline: "Production Next.js 15 SaaS starter with auth, billing, and admin",
  pricePkr: 7500,
  featureName: "Feature-flag scaffold toggler",
  featureDescription:
    "Lets a buyer enable/disable optional modules (billing, admin panel, multi-tenant auth) and returns the exact effective file/route scaffold for their configuration, instead of shipping one fixed template everyone has to prune by hand.",
  core() {
    return {
      stack: ["Next.js 15", "TypeScript", "Prisma", "NextAuth", "Stripe"],
      baseRoutes: ["/", "/dashboard", "/login", "/api/health"],
    };
  },
  uniqueFeature({
    enableBilling,
    enableAdmin,
    enableMultiTenant,
  }: {
    enableBilling: boolean;
    enableAdmin: boolean;
    enableMultiTenant: boolean;
  }) {
    const routes = ["/", "/dashboard", "/login", "/api/health"];
    const modules: string[] = [];
    if (enableBilling) {
      routes.push("/billing", "/api/stripe/webhook");
      modules.push("billing");
    }
    if (enableAdmin) {
      routes.push("/admin", "/api/admin/users");
      modules.push("admin");
    }
    if (enableMultiTenant) {
      routes.push("/api/tenants");
      modules.push("multi-tenant");
    }
    return { enabledModules: modules, effectiveRoutes: routes };
  },
};

export const sourceCodeProducts: ProductModule[] = [nextjsSaasStarter];
