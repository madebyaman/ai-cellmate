# Sample Subjective Evaluation Prompt

You are a data quality evaluator. You assess the confidence level of filled data based on multiple factors:

## CONFIDENCE SCALE (0-5):
- 0 = No Result - No data found for this column
- 1 = Very Low - Poor quality sources with questionable reliability
- 2 = Low - Limited sources with moderate quality but lacking diversity
- 3 = Moderate - Good quality sources with reasonable diversity and authority
- 4 = High - Excellent sources with high authority and good diversity
- 5 = Very High - Premium sources with exceptional authority and excellent diversity

## EVALUATION FACTORS:
1. **Domain Authority (DA)**: Higher DA scores (70+) indicate more trustworthy sources
2. **Source Diversity**: Multiple different domains/TLDs provide better validation
3. **Source Tier**: Premium/high tier sources are more reliable than low tier
4. **Source Relevance**: How well the source website type matches the data being sought
5. **Commonality**: Multiple sources agreeing increases confidence

## SOURCE RELEVANCE GUIDELINES:
Evaluate how well each source type matches the data being filled:
- **Professional data** (job titles, companies, work history): LinkedIn, corporate websites, professional directories are highly relevant
- **Contact information** (emails, phones): Official company websites, professional directories, verified profiles are most relevant
- **Personal information** (names, locations): Social media, public records, news articles, official profiles are relevant
- **Company data** (addresses, descriptions): Official company websites, business directories, SEC filings are highly relevant
- **Financial data**: Financial websites, SEC filings, official company reports are most relevant
- **Academic information**: University websites, academic publications, research databases are most relevant
- **News/events**: News websites, press releases, official announcements are most relevant

Consider source relevance as a critical factor - even high-authority sources get lower confidence if they're not relevant to the data type.

## SEARCH QUERY RECOMMENDATIONS:
- If confidence ≤ 2, provide a more specific search query recommendation
- Focus on finding more authoritative AND relevant sources for the specific data type
- Consider domain-specific search terms or site-specific searches (e.g., "site:linkedin.com" for professional info)

---

## TASK:
Evaluate the confidence of filled data for each column.

**Original Row:** {"name": "John Smith", "company": "", "email": "", "job_title": ""}

**Original Search Queries Used:**
1. "John Smith company email"
2. "John Smith contact information"
3. "John Smith professional profile"

**Results and Sources:**

Column: company
Result Groups: 2

  Group 1:
    Filled Value: TechCorp Inc
    Sources (3):
      - linkedin.com/in/johnsmith (DA: 92, Tier: premium)
      - techcorp.com/team (DA: 65, Tier: high)
      - crunchbase.com/person/john-smith (DA: 84, Tier: premium)

  Group 2:
    Filled Value: Smith Consulting LLC
    Sources (1):
      - randomdirectory.net (DA: 23, Tier: low)

Column: email
Result Groups: 1

  Group 1:
    Filled Value: j.smith@techcorp.com
    Sources (2):
      - techcorp.com/contact (DA: 65, Tier: high)
      - bizcontacts.info (DA: 34, Tier: medium)

Column: job_title
Result Groups: 2

  Group 1:
    Filled Value: Senior Software Engineer
    Sources (2):
      - linkedin.com/in/johnsmith (DA: 92, Tier: premium)
      - techcorp.com/team (DA: 65, Tier: high)

  Group 2:
    Filled Value: Consultant
    Sources (1):
      - randomdirectory.net (DA: 23, Tier: low)

**Metrics:**
company:
  - Average DA: 66.0
  - Diversity Score: 85
  - Total Sources: 4
  - Has High Authority: true
  - Has Premium Source: true
  - Tier Distribution: {"premium":2,"high":1,"low":1}

email:
  - Average DA: 49.5
  - Diversity Score: 60
  - Total Sources: 2
  - Has High Authority: false
  - Has Premium Source: false
  - Tier Distribution: {"high":1,"medium":1}

job_title:
  - Average DA: 66.0
  - Diversity Score: 85
  - Total Sources: 3
  - Has High Authority: true
  - Has Premium Source: true
  - Tier Distribution: {"premium":1,"high":1,"low":1}

**Instructions:**
For each column, evaluate ALL result groups and provide an array of evaluations:
1. Confidence score (0-5) for each result group based on the evaluation factors
2. Clear reasoning for each score considering source relevance and quality
3. Search query recommendation if confidence ≤ 2 for any result group
4. Return the evaluations in the same order as the result groups (Group 1, Group 2, etc.)

**IMPORTANT:** When providing search query recommendations, DO NOT repeat or suggest variations of the original search queries that were already used. Instead, suggest completely different search approaches, keywords, or site-specific searches that could find more relevant and authoritative sources.

**Expected Response Format:**
```json
{
  "company": [
    {
      "confidence": {
        "score": 5,
        "description": "Very High - Premium sources with exceptional authority and excellent diversity",
        "reasoning": "LinkedIn and Crunchbase are highly relevant premium sources for professional company information, with strong domain authority (92, 84). Official company website adds credibility. Multiple high-quality sources agree on TechCorp Inc."
      }
    },
    {
      "confidence": {
        "score": 1,
        "description": "Very Low - Poor quality sources with questionable reliability",
        "reasoning": "Single source with very low domain authority (23) from a random directory. Not relevant or trustworthy for professional company information.",
        "searchQueryRecommendation": "site:sec.gov John Smith OR site:bloomberg.com John Smith TechCorp"
      }
    }
  ],
  "email": [...],
  "job_title": [...]
}
```