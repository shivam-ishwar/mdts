export const OTHER_VALUE = "Other";

export const INDUSTRY_TYPE_OPTIONS = [
    "Coal Mining",
    "Iron Ore Mining",
    "Bauxite Mining",
    "Copper Mining",
    "Gold Mining",
    "Limestone Mining",
    "Manganese Mining",
    "Chromite Mining",
    "Zinc and Lead Mining",
    "Diamond Mining",
    "Uranium Mining",
    "Rare Earth Minerals Mining",
    "Stone Quarrying",
    "Sand Mining",
    "Granite Mining",
    "Marble Mining",
    "Mineral Processing",
    "Cement Raw Material Mining",
    "Oil and Gas Extraction",
    "Metals and Minerals",
    OTHER_VALUE,
] as const;

export const COMPANY_TYPE_OPTIONS = [
    "Private Limited Company",
    "Public Limited Company",
    "Limited Liability Partnership",
    "Partnership Firm",
    "Proprietorship Firm",
    "One Person Company",
    "Joint Venture",
    "Government Company",
    "Public Sector Undertaking",
    "State Government Enterprise",
    "Central Government Enterprise",
    "Co-operative Society",
    "Trust / Society",
    "Foreign Company",
    "Subsidiary Company",
    "Branch Office",
    "Project Office",
    "Section 8 Company",
    OTHER_VALUE,
] as const;

function parseStoredSelect(
    primary: string | null | undefined,
    secondary: string | null | undefined,
    options: readonly string[]
): { value: string; other: string } {
    const sec = String(secondary ?? "").trim();
    const prim = String(primary ?? "").trim();
    const allowed = new Set(options);
    if (!prim) return { value: "", other: "" };
    if (allowed.has(prim)) {
        return prim === OTHER_VALUE ? { value: OTHER_VALUE, other: sec } : { value: prim, other: "" };
    }
    return { value: OTHER_VALUE, other: prim };
}

export function parseStoredCompanyType(
    primary: string | null | undefined,
    secondary: string | null | undefined
): { companyType: string; companyTypeOther: string } {
    const r = parseStoredSelect(primary, secondary, COMPANY_TYPE_OPTIONS);
    return { companyType: r.value, companyTypeOther: r.other };
}

export function parseStoredIndustryType(
    primary: string | null | undefined,
    secondary: string | null | undefined
): { industryType: string; industryTypeOther: string } {
    const r = parseStoredSelect(primary, secondary, INDUSTRY_TYPE_OPTIONS);
    return { industryType: r.value, industryTypeOther: r.other };
}
