import { describe, it, expect } from "vitest";
import {
  combineResults,
  calculateResultMetrics,
  type DataPoint,
} from "./result-combiner";

describe("Result Combiner", () => {
  describe("combineResults", () => {
    it("should combine single data point correctly", () => {
      const enrichedData: DataPoint[] = [
        {
          sourceWebsite: "https://wikipedia.org/test",
          column: "email",
          result: "test@example.com",
        },
      ];

      const result = combineResults(enrichedData);

      expect(result).toHaveProperty("email");
      expect(result.email).toHaveLength(1);
      expect(result.email[0].result).toBe("test@example.com");
      expect(result.email[0].sourceWebsites).toHaveLength(1);
      expect(result.email[0].sourceWebsites[0].url).toBe(
        "https://wikipedia.org/test",
      );
      expect(result.email[0].sourceWebsites[0].da).toBe(95); // Wikipedia should get high DA
      expect(result.email[0].sourceWebsites[0].tier).toBe("high");
    });

    it("should combine multiple sources with same result", () => {
      const enrichedData: DataPoint[] = [
        {
          sourceWebsite: "https://wikipedia.org/test",
          column: "email",
          result: "test@example.com",
        },
        {
          sourceWebsite: "https://github.com/test",
          column: "email",
          result: "test@example.com",
        },
      ];

      const result = combineResults(enrichedData);

      expect(result.email).toHaveLength(1);
      expect(result.email[0].sourceWebsites).toHaveLength(2);
      expect(result.email[0].sourceWebsites[0].da).toBeGreaterThanOrEqual(
        result.email[0].sourceWebsites[1].da,
      ); // Should be sorted by DA
    });

    it("should return all results sorted by quality when multiple results exist", () => {
      const enrichedData: DataPoint[] = [
        {
          sourceWebsite: "https://example.tk/test", // Low DA
          column: "email",
          result: "lowquality@example.com",
        },
        {
          sourceWebsite: "https://wikipedia.org/test", // High DA
          column: "email",
          result: "highquality@example.com",
        },
      ];

      const result = combineResults(enrichedData);

      expect(result.email).toHaveLength(2);
      expect(result.email[0].result).toBe("highquality@example.com"); // Best result first
      expect(result.email[1].result).toBe("lowquality@example.com"); // Lower quality second
    });

    it("should handle multiple columns correctly", () => {
      const enrichedData: DataPoint[] = [
        {
          sourceWebsite: "https://wikipedia.org/test",
          column: "email",
          result: "test@example.com",
        },
        {
          sourceWebsite: "https://github.com/test",
          column: "website",
          result: "https://example.com",
        },
        {
          sourceWebsite: "https://linkedin.com/test",
          column: "company",
          result: "Example Corp",
        },
      ];

      const result = combineResults(enrichedData);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("website");
      expect(result).toHaveProperty("company");
    });

    it("should sort results with more sources first (diversity bonus)", () => {
      const enrichedData: DataPoint[] = [
        // Result A: Single medium DA source
        {
          sourceWebsite: "https://example.com/test", // ~55 DA
          column: "company",
          result: "Company A",
        },
        // Result B: Multiple medium DA sources with one high DA
        {
          sourceWebsite: "https://test.com/test1", // ~55 DA
          column: "company",
          result: "Company B",
        },
        {
          sourceWebsite: "https://demo.com/page", // ~55 DA
          column: "company",
          result: "Company B",
        },
        {
          sourceWebsite: "https://sample.org/info", // ~75 DA
          column: "company",
          result: "Company B",
        },
        {
          sourceWebsite: "https://info.net/content", // ~55 DA
          column: "company",
          result: "Company B",
        },
        {
          sourceWebsite: "https://data.io/page", // ~55 DA
          column: "company",
          result: "Company B",
        },
      ];

      const result = combineResults(enrichedData);

      expect(result.company).toHaveLength(2);
      // Company B should be first due to multiple sources and diversity bonus
      expect(result.company[0].result).toBe("Company B");
      expect(result.company[0].sourceWebsites).toHaveLength(5);
      expect(result.company[1].result).toBe("Company A");
      expect(result.company[1].sourceWebsites).toHaveLength(1);
    });

    it("should remove duplicate URLs from same result", () => {
      const enrichedData: DataPoint[] = [
        {
          sourceWebsite: "https://example.com/test",
          column: "email",
          result: "test@example.com",
        },
        {
          sourceWebsite: "https://example.com/test", // Duplicate URL
          column: "email",
          result: "test@example.com",
        },
      ];

      const result = combineResults(enrichedData);

      expect(result.email).toHaveLength(1);
      expect(result.email[0].sourceWebsites).toHaveLength(1);
      expect(result.email[0].sourceWebsites[0].url).toBe(
        "https://example.com/test",
      );
    });

    it("should sort sources by domain authority descending", () => {
      const enrichedData: DataPoint[] = [
        {
          sourceWebsite: "https://example.tk/test", // Low DA
          column: "email",
          result: "test@example.com",
        },
        {
          sourceWebsite: "https://wikipedia.org/test", // High DA
          column: "email",
          result: "test@example.com",
        },
        {
          sourceWebsite: "https://example.com/test", // Medium DA
          column: "email",
          result: "test@example.com",
        },
      ];

      const result = combineResults(enrichedData);

      expect(result.email).toHaveLength(1);
      const sources = result.email[0].sourceWebsites;
      expect(sources[0].da).toBeGreaterThanOrEqual(sources[1].da);
      expect(sources[1].da).toBeGreaterThanOrEqual(sources[2].da);
    });

    it("should handle empty input gracefully", () => {
      const result = combineResults([]);
      expect(result).toEqual({});
    });

    it("should assign domain authority scores correctly", () => {
      const enrichedData: DataPoint[] = [
        {
          sourceWebsite: "https://wikipedia.org/test",
          column: "email",
          result: "test@example.com",
        },
      ];

      const result = combineResults(enrichedData);

      expect(result.email).toHaveLength(1);
      const source = result.email[0].sourceWebsites[0];

      expect(source.da).toBe(95);
      expect(source.tier).toBe("high");
      expect(source.factors).toContain("High authority domain");
    });
  });

  describe("calculateResultMetrics", () => {
    it("should calculate metrics for empty results", () => {
      const metrics = calculateResultMetrics({});
      expect(metrics).toEqual({});
    });

    it("should calculate metrics for column with no sources", () => {
      const combinedResult = {
        email: [
          {
            result: "test@example.com",
            sourceWebsites: [],
          },
        ],
      };

      const metrics = calculateResultMetrics(combinedResult);

      expect(metrics.email.averageDomainAuthority).toBe(0);
      expect(metrics.email.diversityScore).toBe(0);
      expect(metrics.email.totalSources).toBe(0);
      expect(metrics.email.hasHighAuthoritySource).toBe(false);
      expect(metrics.email.hasPremiumSource).toBe(false);
    });

    it("should give 30% diversity for single source", () => {
      const combinedResult = {
        email: [
          {
            result: "test@example.com",
            sourceWebsites: [
              {
                url: "https://wikipedia.org/test",
                da: 95,
                tier: "premium",
                factors: [],
              },
            ],
          },
        ],
      };

      const metrics = calculateResultMetrics(combinedResult);

      expect(metrics.email.diversityScore).toBe(30);
    });

    it("should give 60% diversity for two sources", () => {
      const combinedResult = {
        email: [
          {
            result: "test@example.com",
            sourceWebsites: [
              {
                url: "https://wikipedia.org/test",
                da: 95,
                tier: "premium",
                factors: [],
              },
              {
                url: "https://github.com/test",
                da: 85,
                tier: "high",
                factors: [],
              },
            ],
          },
        ],
      };

      const metrics = calculateResultMetrics(combinedResult);

      expect(metrics.email.diversityScore).toBe(60);
    });

    it("should calculate average domain authority correctly", () => {
      const combinedResult = {
        email: [
          {
            result: "test@example.com",
            sourceWebsites: [
              {
                url: "https://wikipedia.org/test",
                da: 95,
                tier: "premium",
                factors: [],
              },
              {
                url: "https://example.com/test",
                da: 50,
                tier: "medium",
                factors: [],
              },
              {
                url: "https://test.org/page",
                da: 75,
                tier: "high",
                factors: [],
              },
            ],
          },
        ],
      };

      const metrics = calculateResultMetrics(combinedResult);

      expect(metrics.email.averageDomainAuthority).toBe((95 + 50 + 75) / 3);
      expect(metrics.email.totalSources).toBe(3);
    });

    it("should calculate diversity score correctly", () => {
      const combinedResult = {
        email: [
          {
            result: "test@example.com",
            sourceWebsites: [
              {
                url: "https://example.com/test",
                da: 50,
                tier: "medium",
                factors: [],
              },
              {
                url: "https://test.org/page",
                da: 75,
                tier: "high",
                factors: [],
              },
              {
                url: "https://sample.net/info",
                da: 60,
                tier: "medium",
                factors: [],
              },
              {
                url: "https://demo.edu/content",
                da: 85,
                tier: "high",
                factors: [],
              },
            ],
          },
        ],
      };

      const metrics = calculateResultMetrics(combinedResult);

      expect(metrics.email.diversityScore).toBe(100); // 4 sources with different domains and TLDs
    });

    it("should calculate tier distribution correctly", () => {
      const combinedResult = {
        email: [
          {
            result: "test@example.com",
            sourceWebsites: [
              {
                url: "https://wikipedia.org/test",
                da: 95,
                tier: "premium",
                factors: [],
              },
              {
                url: "https://github.com/test",
                da: 95,
                tier: "premium",
                factors: [],
              },
              {
                url: "https://example.com/test",
                da: 50,
                tier: "medium",
                factors: [],
              },
              {
                url: "https://test.org/page",
                da: 75,
                tier: "high",
                factors: [],
              },
            ],
          },
        ],
      };

      const metrics = calculateResultMetrics(combinedResult);

      expect(metrics.email.tierDistribution).toEqual({
        premium: 2,
        medium: 1,
        high: 1,
      });
    });

    it("should detect high authority sources correctly", () => {
      const combinedResult = {
        email: [
          {
            result: "test@example.com",
            sourceWebsites: [
              {
                url: "https://wikipedia.org/test",
                da: 95,
                tier: "premium",
                factors: [],
              },
              {
                url: "https://example.com/test",
                da: 50,
                tier: "medium",
                factors: [],
              },
            ],
          },
        ],
      };

      const metrics = calculateResultMetrics(combinedResult);

      expect(metrics.email.hasHighAuthoritySource).toBe(true); // DA >= 70
      expect(metrics.email.hasPremiumSource).toBe(true);
    });

    it("should handle low authority sources correctly", () => {
      const combinedResult = {
        email: [
          {
            result: "test@example.com",
            sourceWebsites: [
              {
                url: "https://example.com/test",
                da: 50,
                tier: "medium",
                factors: [],
              },
              { url: "https://test.tk/page", da: 25, tier: "low", factors: [] },
            ],
          },
        ],
      };

      const metrics = calculateResultMetrics(combinedResult);

      expect(metrics.email.hasHighAuthoritySource).toBe(false);
      expect(metrics.email.hasPremiumSource).toBe(false);
    });

    it("should calculate metrics for multiple columns", () => {
      const combinedResult = {
        email: [
          {
            result: "test@example.com",
            sourceWebsites: [
              {
                url: "https://wikipedia.org/test",
                da: 95,
                tier: "premium",
                factors: [],
              },
            ],
          },
        ],
        website: [
          {
            result: "https://example.com",
            sourceWebsites: [
              {
                url: "https://example.com/test",
                da: 50,
                tier: "medium",
                factors: [],
              },
            ],
          },
        ],
      };

      const metrics = calculateResultMetrics(combinedResult);

      expect(Object.keys(metrics)).toHaveLength(2);
      expect(metrics).toHaveProperty("email");
      expect(metrics).toHaveProperty("website");
      expect(metrics.email.hasPremiumSource).toBe(true);
      expect(metrics.website.hasPremiumSource).toBe(false);
    });

    it("should handle invalid URLs in diversity calculation", () => {
      const combinedResult = {
        email: [
          {
            result: "test@example.com",
            sourceWebsites: [
              {
                url: "https://example.com/test",
                da: 50,
                tier: "medium",
                factors: [],
              },
              { url: "invalid-url", da: 0, tier: "unknown", factors: [] },
            ],
          },
        ],
      };

      const metrics = calculateResultMetrics(combinedResult);

      expect(metrics.email.diversityScore).toBeGreaterThan(0);
      expect(metrics.email.totalSources).toBe(2);
    });

    it("should calculate diversity for subdomains correctly", () => {
      const combinedResult = {
        email: [
          {
            result: "test@example.com",
            sourceWebsites: [
              {
                url: "https://api.example.com/test",
                da: 50,
                tier: "medium",
                factors: [],
              },
              {
                url: "https://blog.example.com/test",
                da: 50,
                tier: "medium",
                factors: [],
              },
              {
                url: "https://shop.example.com/test",
                da: 50,
                tier: "medium",
                factors: [],
              },
            ],
          },
        ],
      };

      const metrics = calculateResultMetrics(combinedResult);

      // 3 sources from same domain should get penalized quality multiplier
      expect(metrics.email.diversityScore).toBeLessThan(100);
      expect(metrics.email.diversityScore).toBeGreaterThan(50);
    });
  });
});
