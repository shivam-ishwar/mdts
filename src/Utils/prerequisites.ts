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

const TRUE_VALUES = new Set(["true", "1", "yes"]);

const asBoolean = (value: any): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    return TRUE_VALUES.has(normalized);
  }
  return null;
};

export const shouldEnforcePrerequisiteSequence = (...sources: any[]): boolean => {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    const allowOutOfSequence = asBoolean(
      source.allowOutOfSequencePrerequisites ?? source.skipPrerequisiteSequenceValidation
    );
    if (allowOutOfSequence === true) return false;

    const sequenceRepresentsOrder = asBoolean(
      source.sequenceRepresentsExecutionOrder ?? source.codesRepresentExecutionOrder
    );
    if (sequenceRepresentsOrder != null) return sequenceRepresentsOrder;

    const enforceSequence = asBoolean(source.enforceSequenceOrder ?? source.enforcePrerequisiteSequence);
    if (enforceSequence != null) return enforceSequence;
  }

  return true;
};

export const flattenActivities = (source: any): any[] => {
  if (!source) return [];
  if (Array.isArray(source)) {
    if (!source.length) return [];
    const first = source[0];
    if (first && typeof first === "object" && Array.isArray(first.activities)) {
      return source.flatMap((module: any) => module?.activities ?? []);
    }
    return source;
  }

  if (typeof source === "object" && Array.isArray(source.activities)) {
    return source.activities;
  }

  return [];
};

const buildPrerequisiteGraph = (activities: any[], targetCode: string, selectedCodes: string[]) => {
  const graph = new Map<string, string[]>();

  activities.forEach((activity: any) => {
    const code = String(activity?.code ?? "").trim();
    if (!code) return;
    graph.set(code, code === targetCode ? selectedCodes : getPrerequisiteCodes(activity));
  });

  if (!graph.has(targetCode)) {
    graph.set(targetCode, selectedCodes);
  }

  return graph;
};

const dependsOnActivity = (
  graph: Map<string, string[]>,
  startCode: string,
  targetCode: string,
  visiting = new Set<string>()
): boolean => {
  if (startCode === targetCode) return true;
  if (visiting.has(startCode)) return false;

  visiting.add(startCode);
  const prerequisites = graph.get(startCode) ?? [];

  for (const prerequisiteCode of prerequisites) {
    if (prerequisiteCode === targetCode) return true;
    if (dependsOnActivity(graph, prerequisiteCode, targetCode, visiting)) return true;
  }

  visiting.delete(startCode);
  return false;
};

export const getInvalidPrerequisiteCodes = ({
  activities,
  activityCode,
  selectedPrerequisites,
  enforceSequence = true,
}: {
  activities: any[];
  activityCode: string;
  selectedPrerequisites: any;
  enforceSequence?: boolean;
}) => {
  const targetCode = String(activityCode ?? "").trim();
  const allActivities = flattenActivities(activities);
  const selectedCodes = getPrerequisiteCodes(selectedPrerequisites);
  const invalidSelf = new Set<string>();
  const invalidFuture = new Set<string>();
  const invalidCircular = new Set<string>();

  const indexByCode = new Map<string, number>();
  allActivities.forEach((activity: any, index: number) => {
    const code = String(activity?.code ?? "").trim();
    if (code && !indexByCode.has(code)) indexByCode.set(code, index);
  });

  const targetIndex = indexByCode.get(targetCode) ?? allActivities.length;
  const graph = buildPrerequisiteGraph(allActivities, targetCode, selectedCodes);

  selectedCodes.forEach((code) => {
    if (code === targetCode) {
      invalidSelf.add(code);
      return;
    }

    if (enforceSequence) {
      const prerequisiteIndex = indexByCode.get(code);
      if (prerequisiteIndex != null && prerequisiteIndex > targetIndex) {
        invalidFuture.add(code);
        return;
      }
    }

    if (dependsOnActivity(graph, code, targetCode)) {
      invalidCircular.add(code);
    }
  });

  return {
    invalidSelf: Array.from(invalidSelf),
    invalidFuture: Array.from(invalidFuture),
    invalidCircular: Array.from(invalidCircular),
  };
};

export const validateActivityPrerequisites = ({
  activities,
  activityCode,
  selectedPrerequisites,
  enforceSequence = true,
}: {
  activities: any[];
  activityCode: string;
  selectedPrerequisites: any;
  enforceSequence?: boolean;
}) => {
  const { invalidSelf, invalidFuture, invalidCircular } = getInvalidPrerequisiteCodes({
    activities,
    activityCode,
    selectedPrerequisites,
    enforceSequence,
  });

  if (invalidSelf.length) {
    return {
      valid: false,
      message: `Activity ${activityCode} cannot be its own prerequisite.`,
    };
  }

  if (invalidFuture.length) {
    return {
      valid: false,
      message: `Future activities cannot be prerequisites for ${activityCode}: ${invalidFuture.join(", ")}.`,
    };
  }

  if (invalidCircular.length) {
    return {
      valid: false,
      message: `Circular dependency detected for ${activityCode}: ${invalidCircular.join(", ")}.`,
    };
  }

  return { valid: true, message: "" };
};
