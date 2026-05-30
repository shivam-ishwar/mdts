import { v4 as uuidv4 } from "uuid";

type ActivityItem = {
  id?: any;
  guicode?: string;
  code?: string;
  activityName?: string;
  duration?: number | string;
  level?: string;
  levelIndex?: number;
  /** Level when the activity entered the list; used to enforce one indent per activity. */
  baseLevelIndex?: number;
  /** True after the user has increased level once; outdent does not reset this. */
  hasBeenIndented?: boolean;
  parentId?: string | null;
  prerequisite?: string | null;
  prerequisite_activity_code?: string | null;
  [key: string]: any;
};

const getActivityId = (activity: ActivityItem) =>
  activity?.id ?? activity?.guicode ?? activity?.code;

const clampLevel = (level: any) => {
  const n = Number(level || 1);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.trunc(n));
};

const ensureArrayLength = <T>(arr: T[], length: number, fill: T) => {
  while (arr.length < length) {
    arr.push(fill);
  }
};

const getBaseLevelIndex = (activity: ActivityItem) =>
  clampLevel(
    activity.baseLevelIndex ??
      activity.levelIndex ??
      String(activity.level || "").replace("L", "") ??
      1
  );

const hasUsedIndent = (activity: ActivityItem) => {
  if (activity.hasBeenIndented === true) return true;
  if (activity.hasBeenIndented === false) return false;
  const levelIndex = clampLevel(activity.levelIndex || String(activity.level || "").replace("L", "") || 1);
  return levelIndex > getBaseLevelIndex(activity);
};

const normalizeActivities = (activities: ActivityItem[] = []) =>
  (activities || []).map((activity) => {
    const levelIndex = clampLevel(
      activity.levelIndex || String(activity.level || "").replace("L", "") || 1
    );
    const baseLevelIndex = getBaseLevelIndex({ ...activity, levelIndex });
    const hasBeenIndented = hasUsedIndent({ ...activity, levelIndex, baseLevelIndex });

    return {
      ...activity,
      guicode: activity.guicode || uuidv4(),
      levelIndex,
      baseLevelIndex,
      hasBeenIndented,
    };
  });

const findSubtreeEndIndex = (activities: ActivityItem[], index: number) => {
  const baseLevel = clampLevel(activities[index]?.levelIndex || 1);
  let end = index;
  for (let i = index + 1; i < activities.length; i++) {
    const lvl = clampLevel(activities[i]?.levelIndex || 1);
    if (lvl <= baseLevel) break;
    end = i;
  }
  return end;
};

/**
 * Pass 1: resolve parentId from flat list order + levelIndex.
 * Parent is the nearest preceding activity exactly one level above.
 */
const resolveParentIds = (activities: ActivityItem[] = []) => {
  const list = normalizeActivities(activities);
  const lastAtLevel: Array<string | null> = [];

  return list.map((activity) => {
    const levelIndex = clampLevel(activity.levelIndex || 1);
    ensureArrayLength(lastAtLevel, levelIndex, null);

    for (let i = levelIndex; i < lastAtLevel.length; i++) lastAtLevel[i] = null;

    let parentId: string | null = null;
    if (levelIndex > 1) {
      for (let i = levelIndex - 2; i >= 0; i--) {
        if (lastAtLevel[i]) {
          parentId = lastAtLevel[i];
          break;
        }
      }
    }

    const guicode = activity.guicode || uuidv4();
    lastAtLevel[levelIndex - 1] = guicode;

    return {
      ...activity,
      guicode,
      levelIndex,
      parentId,
    };
  });
};

/**
 * Pass 2: assign codes from scratch using resolved parent relationships.
 * Each parent maintains its own child sequence: /10, /20, /30, ...
 * Codes are never derived from existing code strings.
 */
const assignCodesFromHierarchy = (
  parentModuleCode: string,
  activities: ActivityItem[] = []
) => {
  const childCounters = new Map<string, number>();
  const codeById = new Map<string, string>();

  return activities.map((activity) => {
    const id = activity.guicode!;
    const levelIndex = clampLevel(activity.levelIndex || 1);
    const parentId = activity.parentId ?? null;
    let code: string;

    if (levelIndex === 1 || !parentId) {
      const count = (childCounters.get(parentModuleCode) ?? 0) + 1;
      childCounters.set(parentModuleCode, count);
      code = `${parentModuleCode}/${count * 10}`;
    } else {
      const parentCode = codeById.get(parentId);
      const count = (childCounters.get(parentId) ?? 0) + 1;
      childCounters.set(parentId, count);

      if (!parentCode) {
        const count = (childCounters.get(parentModuleCode) ?? 0) + 1;
        childCounters.set(parentModuleCode, count);
        code = `${parentModuleCode}/${count * 10}`;
      } else {
        code = `${parentCode}/${count * 10}`;
      }
    }

    codeById.set(id, code);

    return {
      ...activity,
      levelIndex,
      level: `L${levelIndex}`,
      parentId,
      code,
    };
  });
};

const deriveParentIdsAndCodes = (parentModuleCode: string, activities: ActivityItem[] = []) => {
  const withParents = resolveParentIds(activities);
  return assignCodesFromHierarchy(parentModuleCode, withParents);
};

export const regenerateCodes = (parentModuleCode: string, activities: ActivityItem[] = []) => {
  return deriveParentIdsAndCodes(parentModuleCode, activities);
};

export const canIndentActivity = (
  activities: ActivityItem[] = [],
  selectedId: string
) => {
  const list = normalizeActivities(activities);
  const index = list.findIndex((a) => String(getActivityId(a)) === String(selectedId));
  if (index <= 0) return false;
  return !hasUsedIndent(list[index]);
};

export const indentActivity = (
  activities: ActivityItem[] = [],
  parentModuleCode: string,
  selectedId: string
) => {
  const list = normalizeActivities(activities);
  const index = list.findIndex((a) => String(getActivityId(a)) === String(selectedId));
  if (index <= 0) return regenerateCodes(parentModuleCode, list);

  const current = list[index];
  if (hasUsedIndent(current)) return regenerateCodes(parentModuleCode, list);

  const currentLevel = clampLevel(current.levelIndex || 1);
  const targetLevel = currentLevel + 1;
  const baseLevelIndex = getBaseLevelIndex(current);

  const updated = list.map((item, i) =>
    i === index
      ? {
          ...item,
          levelIndex: targetLevel,
          level: `L${targetLevel}`,
          baseLevelIndex,
          hasBeenIndented: true,
        }
      : item
  );

  return regenerateCodes(parentModuleCode, updated);
};

export const outdentActivity = (
  activities: ActivityItem[] = [],
  parentModuleCode: string,
  selectedId: string
) => {
  const list = normalizeActivities(activities);
  const index = list.findIndex((a) => String(getActivityId(a)) === String(selectedId));
  if (index < 0) return regenerateCodes(parentModuleCode, list);

  const current = list[index];
  const currentLevel = clampLevel(current.levelIndex || 1);
  if (currentLevel <= 1) return regenerateCodes(parentModuleCode, list);

  const updated = list.map((item, i) =>
    i === index
      ? {
          ...item,
          levelIndex: currentLevel - 1,
          level: `L${currentLevel - 1}`,
        }
      : item
  );

  return regenerateCodes(parentModuleCode, updated);
};

export const createActivity = (
  activities: ActivityItem[] = [],
  parentModuleCode: string,
  parentId?: string | null,
  afterId?: string
) => {
  const list = normalizeActivities(activities);
  let insertAt = list.length;
  let levelIndex = 1;

  if (afterId) {
    const index = list.findIndex((a) => String(getActivityId(a)) === String(afterId));
    if (index >= 0) {
      const end = findSubtreeEndIndex(list, index);
      insertAt = end + 1;
      levelIndex = clampLevel(list[index]?.levelIndex || 1);
    }
  } else if (parentId) {
    const parentIndex = list.findIndex((a) => String(getActivityId(a)) === String(parentId));
    if (parentIndex >= 0) {
      const end = findSubtreeEndIndex(list, parentIndex);
      insertAt = end + 1;
      levelIndex = clampLevel(list[parentIndex]?.levelIndex || 1) + 1;
    }
  }

  const newId = uuidv4();
  const newActivity: ActivityItem = {
    guicode: newId,
    activityName: "",
    duration: 1,
    levelIndex,
    level: `L${levelIndex}`,
    baseLevelIndex: levelIndex,
    hasBeenIndented: false,
    parentId: null,
    prerequisite: null,
    prerequisite_activity_code: null,
  };

  const updated = [...list.slice(0, insertAt), newActivity, ...list.slice(insertAt)];
  const regenerated = regenerateCodes(parentModuleCode, updated);

  return {
    activities: regenerated,
    id: newId,
  };
};
