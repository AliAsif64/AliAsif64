export interface ProductModule {
  slug: string;
  title: string;
  category: string;
  tagline: string;
  pricePkr: number;
  /** Short name of the unique feature added on top of the product's baseline backend function. */
  featureName: string;
  featureDescription: string;
  /** Simulates the product's core/baseline backend operation. */
  core(input: any): any;
  /** The unique feature implemented for this product, tailored to how it is actually used. */
  uniqueFeature(input: any): any;
}
