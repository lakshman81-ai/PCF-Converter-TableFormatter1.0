/**
 * CUSTOM FUZZY MATCHING
 * As specified in D§3.
 */

export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

export function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - levenshtein(a, b) / maxLen;
}

export function normalize(text) {
  // Lowercase, strip whitespace, remove special chars
  return String(text).replace(/[^a-z0-9]/gi, '').toLowerCase().trim();
}

export function fuzzyMatchHeader(headerText, aliasConfig, threshold = 0.75) {
  const normHeader = normalize(headerText);

  // Pass 1: Exact match on normalized aliases
  for (const [canonical, aliases] of Object.entries(aliasConfig)) {
    for (const alias of aliases) {
      if (normalize(alias) === normHeader) return canonical;
    }
  }

  // Pass 2: Substring containment
  for (const [canonical, aliases] of Object.entries(aliasConfig)) {
    for (const alias of aliases) {
      const normAlias = normalize(alias);
      if (normAlias && (normAlias.includes(normHeader) || normHeader.includes(normAlias))) {
        return canonical;
      }
    }
  }

  // Pass 3: Fuzzy ratio
  let bestMatch = null;
  let bestScore = 0;
  for (const [canonical, aliases] of Object.entries(aliasConfig)) {
    for (const alias of aliases) {
      const score = similarity(normHeader, normalize(alias));
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = canonical;
      }
    }
  }

  return bestMatch;
}
