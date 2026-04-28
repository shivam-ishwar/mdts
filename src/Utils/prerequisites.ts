export const splitPrerequisiteCodes = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => splitPrerequisiteCodes(item))
      .filter(Boolean);
  }

  if (value == null) return [];

  if (typeof value === "object") {
    if (typeof value.code === "string") return splitPrerequisiteCodes(value.code);
    if (typeof value.value === "string") return splitPrerequisiteCodes(value.value);
    if (Array.isArray(value.prerequisites)) return splitPrerequisiteCodes(value.prerequisites);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const getPrerequisiteCodes = (activityOrValue: any): string[] => {
  if (activityOrValue == null) return [];

  if (typeof activityOrValue === "object" && !Array.isArray(activityOrValue)) {
    return Array.from(
      new Set(
        splitPrerequisiteCodes(
          activityOrValue.prerequisites ?? activityOrValue.prerequisite ?? activityOrValue.prerequisite_activity_code
        )
      )
    );
  }

  return Array.from(new Set(splitPrerequisiteCodes(activityOrValue)));
};

export const formatPrerequisiteCodes = (activityOrValue: any): string => {
  const codes = getPrerequisiteCodes(activityOrValue);
  return codes.join(", ");
};

export const setActivityPrerequisites = (
  activity: any,
  prerequisites: any,
  options?: { manual?: boolean }
) => {
  const codes = getPrerequisiteCodes(prerequisites);
  return {
    ...activity,
    prerequisites: codes,
    prerequisite: codes.join(", "),
    prerequisite_activity_code: codes[0] ?? null,
    prerequisiteTouched: options?.manual ?? activity?.prerequisiteTouched ?? false,
  };
};

export const hasPrerequisites = (activityOrValue: any) =>
  getPrerequisiteCodes(activityOrValue).length > 0;
