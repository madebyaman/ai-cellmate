import { describe, it, expect } from "vitest";
import { evaluateDomainAuthority } from "./domain-authority";

describe("Domain Authority Evaluator", () => {
  describe("evaluateDomainAuthority", () => {
    describe("High DA domains", () => {
      it("should assign high scores to Wikipedia", () => {
        const result = evaluateDomainAuthority(
          "https://en.wikipedia.org/wiki/Test",
        );
        expect(result.score).toBe(95);
        expect(result.tier).toBe("high");
        expect(result.factors).toContain("High authority domain");
      });

      it("should assign high scores to GitHub", () => {
        const result = evaluateDomainAuthority("https://github.com/test/repo");
        expect(result.score).toBe(95);
        expect(result.tier).toBe("high");
        expect(result.factors).toContain("High authority domain");
      });

      it("should assign high scores to Google", () => {
        const result = evaluateDomainAuthority("https://google.com/search");
        expect(result.score).toBe(95);
        expect(result.tier).toBe("high");
        expect(result.factors).toContain("High authority domain");
      });
    });

    describe("Government and educational domains", () => {
      it("should assign high scores to .gov domains", () => {
        const result = evaluateDomainAuthority("https://www.usa.gov/test");
        expect(result.score).toBe(90);
        expect(result.tier).toBe("high");
        expect(result.factors).toContain("Government domain");
      });

      it("should assign high scores to .edu domains", () => {
        const result = evaluateDomainAuthority("https://www.harvard.edu/test");
        expect(result.score).toBe(85);
        expect(result.tier).toBe("high");
        expect(result.factors).toContain("Educational institution");
      });

      it("should assign medium scores to .org domains", () => {
        const result = evaluateDomainAuthority("https://example.org/test");
        expect(result.score).toBe(65); // 60 + 5 HTTPS
        expect(result.tier).toBe("medium");
        expect(result.factors).toContain("Organization domain");
      });
    });

    describe("Commercial domains", () => {
      it("should assign medium scores to regular .com domains", () => {
        const result = evaluateDomainAuthority("https://example.com/test");
        expect(result.score).toBe(50); // 45 + 5 HTTPS
        expect(result.tier).toBe("medium");
        expect(result.factors).toContain("Commercial domain");
      });
    });


    describe("Unknown domains", () => {
      it("should assign low scores to unknown domains", () => {
        const result = evaluateDomainAuthority("https://example.xyz/test");
        expect(result.score).toBe(35); // 30 base + 5 HTTPS
        expect(result.tier).toBe("medium");
        expect(result.factors).toContain("Standard domain");
      });
    });

    describe("HTTPS bonus", () => {
      it("should give bonus points for HTTPS", () => {
        const httpsResult = evaluateDomainAuthority("https://example.com/test");
        const httpResult = evaluateDomainAuthority("http://example.com/test");

        expect(httpsResult.score).toBeGreaterThan(httpResult.score);
        expect(httpsResult.factors).toContain("Secure connection");
        expect(httpResult.factors).not.toContain("Secure connection");
      });
    });


    describe("Invalid URLs", () => {
      it("should handle invalid URLs gracefully", () => {
        const result = evaluateDomainAuthority("not-a-url");
        expect(result.score).toBe(0);
        expect(result.tier).toBe("low");
        expect(result.factors).toContain("Invalid URL format");
      });
    });

    describe("Tier assignment consistency", () => {
      it("should assign tiers consistently with scores", () => {
        const testCases = [
          { url: "https://wikipedia.org/test", expectedTier: "high" },
          { url: "https://harvard.edu/test", expectedTier: "high" },
          { url: "https://google.com/test", expectedTier: "high" },
          { url: "https://example.com/test", expectedTier: "medium" },
          { url: "invalid-url", expectedTier: "low" },
        ];

        testCases.forEach(({ url, expectedTier }) => {
          const result = evaluateDomainAuthority(url);
          expect(result.tier).toBe(expectedTier);
        });
      });
    });
  });
});
