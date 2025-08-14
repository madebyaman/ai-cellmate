export interface DomainAuthorityScore {
  score: number; // 0-100 scale
  tier: "high" | "medium" | "low";
  factors: string[];
}

/**
 * Simple domain authority evaluator with basic scoring
 */
export function evaluateDomainAuthority(url: string): DomainAuthorityScore {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    const factors: string[] = [];
    let score = 30; // Base score

    // High DA domains - knowledge sources and major sites
    const highDADomains = [
      "wikipedia.org",
      "github.com",
      "stackoverflow.com",
      "google.com",
      "microsoft.com",
      "apple.com",
      "mozilla.org",
    ];

    // Check for high DA domains first
    if (highDADomains.some((d) => domain.includes(d))) {
      score = 95;
      factors.push("High authority domain");
      return { score, tier: "high", factors };
    }

    // Government domains - highest authority
    if (domain.endsWith(".gov")) {
      score = 90;
      factors.push("Government domain");
      return { score, tier: "high", factors };
    }

    // Educational domains - high authority
    if (domain.endsWith(".edu") || domain.includes(".ac.")) {
      score = 85;
      factors.push("Educational institution");
      return { score, tier: "high", factors };
    }

    // Organization domains - medium-high authority
    if (domain.endsWith(".org")) {
      score = 60;
      factors.push("Organization domain");
    }

    // Commercial domains - medium authority
    else if (
      domain.endsWith(".com") ||
      domain.endsWith(".net") ||
      domain.endsWith(".io")
    ) {
      score = 45;
      factors.push("Commercial domain");
    }

    // All other domains get base score
    else {
      factors.push("Standard domain");
    }

    // HTTPS boost
    if (url.startsWith("https://")) {
      score += 5;
      factors.push("Secure connection");
    }

    // Ensure score bounds
    score = Math.max(0, Math.min(100, score));

    // Determine tier
    let tier: DomainAuthorityScore["tier"];
    if (score >= 70) tier = "high";
    else if (score >= 30) tier = "medium";
    else tier = "low";

    return { score, tier, factors };
  } catch (error) {
    return {
      score: 0,
      tier: "low",
      factors: ["Invalid URL format"],
    };
  }
}
