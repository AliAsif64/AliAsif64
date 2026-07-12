import express from "express";
import { allProducts, productsBySlug } from "./products/registry.js";

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", productCount: allProducts.length });
});

app.get("/api/products", (_req, res) => {
  res.json(
    allProducts.map(({ slug, title, category, tagline, pricePkr, featureName, featureDescription }) => ({
      slug,
      title,
      category,
      tagline,
      pricePkr,
      featureName,
      featureDescription,
    }))
  );
});

app.get("/api/products/:slug", (req, res) => {
  const product = productsBySlug.get(req.params.slug);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const { core, uniqueFeature, ...meta } = product;
  res.json(meta);
});

app.post("/api/products/:slug/run", (req, res) => {
  const product = productsBySlug.get(req.params.slug);
  if (!product) return res.status(404).json({ error: "Product not found" });
  try {
    res.json({ slug: product.slug, result: product.core(req.body ?? {}) });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post("/api/products/:slug/feature", (req, res) => {
  const product = productsBySlug.get(req.params.slug);
  if (!product) return res.status(404).json({ error: "Product not found" });
  try {
    res.json({
      slug: product.slug,
      featureName: product.featureName,
      result: product.uniqueFeature(req.body ?? {}),
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`DSR marketplace backend review server listening on :${PORT}`);
    console.log(`${allProducts.length} products registered`);
  });
}

export default app;
