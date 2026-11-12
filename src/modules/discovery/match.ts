import type { Icp } from "@/modules/campaigns/schema";
import type {
  ProspectMatch,
  ProviderProspectRecord,
} from "@/modules/discovery/types";

function haystack(value: string): string {
  return value.toLowerCase();
}

function matchedTerms(value: string, terms: string[]): string[] {
  const text = haystack(value);
  return terms.filter((term) => text.includes(term.trim().toLowerCase()));
}

export function isExcluded(
  record: ProviderProspectRecord,
  icp: Icp,
): boolean {
  if (icp.exclusions.length === 0) {
    return false;
  }
  const blob = [
    record.firstName,
    record.lastName,
    record.jobTitle,
    record.company,
    record.industry,
    record.location,
    record.professionalSummary,
  ].join(" ");
  return matchedTerms(blob, icp.exclusions).length > 0;
}

export function scoreProspect(
  record: ProviderProspectRecord,
  icp: Icp,
): ProspectMatch {
  const reasons: string[] = [];
  let score = 0;

  const titleHits = matchedTerms(record.jobTitle, icp.jobTitles);
  if (titleHits.length > 0) {
    score += 30;
    reasons.push(`Job title matches ${titleHits.join(", ")}.`);
  }

  const industryHits = matchedTerms(record.industry, icp.industries);
  if (industryHits.length > 0) {
    score += 25;
    reasons.push(`Industry matches ${industryHits.join(", ")}.`);
  }

  const locationHits = matchedTerms(record.location, icp.locations);
  if (locationHits.length > 0) {
    score += 20;
    reasons.push(`Location matches ${locationHits.join(", ")}.`);
  }

  if (
    icp.companySize &&
    record.companySize &&
    record.companySize === icp.companySize
  ) {
    score += 15;
    reasons.push(`Company size matches ${icp.companySize}.`);
  }

  const keywordBlob = [
    record.jobTitle,
    record.company,
    record.professionalSummary,
  ].join(" ");
  const keywordHits = matchedTerms(keywordBlob, icp.keywords);
  if (keywordHits.length > 0) {
    score += 10;
    reasons.push(`Keywords match ${keywordHits.join(", ")}.`);
  }

  return { score, reasons };
}
