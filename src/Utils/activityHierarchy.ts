import { v4 as uuidv4 } from "uuid";

type ActivityItem = {
  id?: any;
  guicode?: string;
  code?: string;
  activityName?: string;
  duration?: number | string;
  level?: string;
  levelIndex?: number;
  parentId?: string | null;
  prerequisite?: string | null;
  prerequisite_activity_code?: string | null;
  [key: string]: any;
};

const getActivityId = (activity: ActivityItem) =>
  activity?.id ?? activity?.guicode ?? activity?.code;

const MAX_LEVEL = 2;

const clampLevel = (level: any) => {
  const n = Number(level || 1);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(MAX_LEVEL, Math.trunc(n)));
};

const normalizeActivities = (activities: ActivityItem[] = []) =>
  (activities || []).map((activity) => ({
    ...activity,
    guicode: activity.guicode || uuidv4(),
    levelIndex: clampLevel(activity.levelIndex || String(activity.level || "").replace("L", "") || 1),
  }));

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

const deriveParentIdsAndCodes = (parentModuleCode: string, activities: ActivityItem[] = []) => {
  const list = normalizeActivities(activities);
  const counters = [0, 0, 0, 0];
  const lastAtLevel: Array<string | null> = [null, null, null, null];

  return list.map((activity) => {
    const levelIndex = clampLevel(activity.levelIndex || 1);

    counters[levelIndex - 1] += 1;
    for (let i = levelIndex; i < counters.length; i++) counters[i] = 0;

    for (let i = levelIndex; i < lastAtLevel.length; i++) lastAtLevel[i] = null;

    const segments: string[] = [];
    for (let i = 0; i < levelIndex; i++) {
      const value = counters[i] === 0 ? 1 : counters[i];
      segments.push(String(value * 10));
    }

    const code = `${parentModuleCode}/${segments.join("/")}`;

    let parentId: string | null = null;
    if (levelIndex > 1) {
      for (let i = levelIndex - 2; i >= 0; i--) {
        if (lastAtLevel[i]) {
          parentId = lastAtLevel[i];
          break;
        }
      }
    }

    const normalized = {
      ...activity,
      guicode: activity.guicode || uuidv4(),
      levelIndex,
      level: `L${levelIndex}`,
      parentId,
      code,
    };

    lastAtLevel[levelIndex - 1] = normalized.guicode;

    return normalized;
  });
};

export const regenerateCodes = (parentModuleCode: string, activities: ActivityItem[] = []) => {
  return deriveParentIdsAndCodes(parentModuleCode, activities);
};

export const indentActivity = (
  activities: ActivityItem[] = [],
  parentModuleCode: string,
  selectedId: string
) => {
  const list = normalizeActivities(activities);
  const index = list.findIndex((a) => String(getActivityId(a)) === String(selectedId));
  if (index <= 0) return regenerateCodes(parentModuleCode, list);

  const previous = list[index - 1];
  if (!previous) return regenerateCodes(parentModuleCode, list);

  const current = list[index];
  const targetLevel = Math.min(
    MAX_LEVEL,
    Math.max(
      clampLevel(current.levelIndex || 1) + 1,
      clampLevel(previous.levelIndex || 1) + 1
    )
  );

  const updated = list.map((item, i) =>
    i === index
      ? {
          ...item,
          levelIndex: targetLevel,
          level: `L${targetLevel}`,
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
      levelIndex = Math.min(
        MAX_LEVEL,
        clampLevel(list[parentIndex]?.levelIndex || 1) + 1
      );
    }
  }

  const newId = uuidv4();
  const newActivity: ActivityItem = {
    guicode: newId,
    activityName: "",
    duration: 1,
    levelIndex,
    level: `L${levelIndex}`,
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
