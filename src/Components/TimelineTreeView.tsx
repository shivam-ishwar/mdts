import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  RightOutlined,
} from "@ant-design/icons";
import { timelineHierarchyMock } from "../config/timelineHierarchyMock";

export type TimelineStatusTone = "completed" | "inprogress" | "yettostart";

export type TimelineTreeActivity = {
  id: string;
  code?: string;
  name: string;
  status: TimelineStatusTone;
  expectedDateLabel: string;
  hasDate: boolean;
  dependencies: TimelineTreeActivity[];
};

export type TimelineTreeModule = {
  id: string;
  name: string;
  status: TimelineStatusTone;
  progress: number;
  activityCount: number;
  activities: TimelineTreeActivity[];
};

export type TimelineTreeProject = {
  id: string;
  name: string;
  status: TimelineStatusTone;
  progress: number;
  moduleCount: number;
  activityCount: number;
  modules: TimelineTreeModule[];
};

type TimelineTreeViewProps = {
  projects?: TimelineTreeProject[];
  prefersReducedMotion?: boolean;
};

type ColumnItemBase = {
  id: string;
  name: string;
  status: TimelineStatusTone;
};

type ProjectColumnItem = ColumnItemBase & {
  kind: "project";
  meta: string;
};

type ModuleColumnItem = ColumnItemBase & {
  kind: "module";
  meta: string;
};

type ActivityColumnItem = ColumnItemBase & {
  kind: "activity";
  meta: string;
};

type ChildColumnItem = ColumnItemBase & {
  kind: "child";
  meta: string;
  code?: string;
};

type ColumnItem = ProjectColumnItem | ModuleColumnItem | ActivityColumnItem | ChildColumnItem;

const easeSmooth = [0.16, 1, 0.3, 1] as const;
const columnListVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};
const columnCardVariants = {
  hidden: { opacity: 0, y: 14, x: 8 },
  visible: {
    opacity: 1,
    y: 0,
    x: 0,
    transition: { duration: 0.24, ease: easeSmooth },
  },
};

const statusMeta: Record<
  TimelineStatusTone,
  {
    className: string;
  }
> = {
  completed: {
    className: "ttv-cascade-card--completed",
  },
  inprogress: {
    className: "ttv-cascade-card--inprogress",
  },
  yettostart: {
    className: "ttv-cascade-card--yettostart",
  },
};

function flattenActivityBranch(activity: TimelineTreeActivity): TimelineTreeActivity[] {
  return [activity, ...activity.dependencies.flatMap(flattenActivityBranch)];
}

function pruneNestedSiblings(activities: TimelineTreeActivity[]): TimelineTreeActivity[] {
  const nestedIds = new Set<string>();

  activities.forEach((activity) => {
    activity.dependencies.forEach((child) => {
      flattenActivityBranch(child).forEach((nested) => nestedIds.add(nested.id));
    });
  });

  return activities.filter((activity) => !nestedIds.has(activity.id));
}

function flattenUniqueActivities(activities: TimelineTreeActivity[]): TimelineTreeActivity[] {
  const seen = new Set<string>();
  return activities.flatMap((activity) =>
    flattenActivityBranch(activity).filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
  );
}

function HierarchyColumn({
  items,
  selectedId,
  onSelect,
  columnClassName,
  prefersReducedMotion,
  emptyTitle,
  emptyText,
}: {
  items: ColumnItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  columnClassName: string;
  prefersReducedMotion?: boolean;
  emptyTitle?: string;
  emptyText?: string;
}) {
  return (
    <motion.section
      className={`ttv-cascade-column ${columnClassName}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: easeSmooth }}
    >
      {!items.length ? (
        <div className="ttv-cascade-empty">
          <strong>{emptyTitle || "No content"}</strong>
          <p>{emptyText || "Nothing is available here yet."}</p>
        </div>
      ) : null}

      <motion.div
        className="ttv-cascade-list"
        role="list"
        variants={columnListVariants}
        initial={prefersReducedMotion ? false : "hidden"}
        animate="visible"
      >
        {items.map((item) => {
          const isSelected = selectedId === item.id;
          const status = statusMeta[item.status];

          return (
            <motion.button
              key={item.id}
              type="button"
              className={`ttv-cascade-card ${status.className} ${isSelected ? "is-selected" : ""}`}
              onClick={() => onSelect(item.id)}
              aria-pressed={isSelected}
              variants={prefersReducedMotion ? undefined : columnCardVariants}
            >
              <div className="ttv-cascade-card-copy">
                <div className="ttv-cascade-card-row">
                  <strong className="ttv-cascade-card-title" title={item.name}>{item.name}</strong>
                </div>
                <div className="ttv-cascade-card-meta">
                  <span>{item.meta}</span>
                  {"code" in item && item.code ? <span>{item.code}</span> : null}
                </div>
              </div>
              <span className={`ttv-cascade-card-arrow ${isSelected ? "is-selected" : ""}`}>
                <RightOutlined />
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </motion.section>
  );
}

const TimelineTreeView = ({ projects, prefersReducedMotion }: TimelineTreeViewProps) => {
  const sourceProjects = projects && projects.length ? projects : timelineHierarchyMock;

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedDependencyPath, setSelectedDependencyPath] = useState<string[]>([]);

  useEffect(() => {
    if (!sourceProjects.length) {
      setSelectedProjectId(null);
      setSelectedModuleId(null);
      setSelectedActivityId(null);
      setSelectedDependencyPath([]);
      return;
    }

    setSelectedProjectId((current) =>
      current && sourceProjects.some((project) => project.id === current) ? current : sourceProjects[0].id
    );
  }, [sourceProjects]);

  const selectedProject = useMemo(
    () => sourceProjects.find((project) => project.id === selectedProjectId) ?? null,
    [selectedProjectId, sourceProjects]
  );

  useEffect(() => {
    if (!selectedProject) {
      setSelectedModuleId(null);
      setSelectedActivityId(null);
      setSelectedDependencyPath([]);
      return;
    }

    setSelectedModuleId((current) =>
      current && selectedProject.modules.some((module) => module.id === current)
        ? current
        : selectedProject.modules[0]?.id ?? null
    );
    setSelectedActivityId(null);
    setSelectedDependencyPath([]);
  }, [selectedProjectId, selectedProject]);

  const selectedModule = useMemo(
    () => selectedProject?.modules.find((module) => module.id === selectedModuleId) ?? null,
    [selectedModuleId, selectedProject]
  );

  useEffect(() => {
    if (!selectedProject) {
      setSelectedActivityId(null);
      setSelectedDependencyPath([]);
      return;
    }

    const scopedActivities = selectedModule?.activities ?? [];
    setSelectedActivityId((current) =>
      current && scopedActivities.some((activity) => activity.id === current) ? current : null
    );
    setSelectedDependencyPath([]);
  }, [selectedModuleId, selectedModule, selectedProject]);

  const selectedActivity = useMemo(
    () =>
      selectedProject?.modules
        .flatMap((module) => module.activities)
        .find((activity) => activity.id === selectedActivityId) ?? null,
    [selectedActivityId, selectedProject]
  );

  const rootDependencyItems = useMemo(
    () => pruneNestedSiblings(selectedActivity?.dependencies ?? []),
    [selectedActivity]
  );

  useEffect(() => {
    if (!rootDependencyItems.length) {
      setSelectedDependencyPath([]);
      return;
    }

    setSelectedDependencyPath((current) => {
      if (!current.length) return [];

      const nextPath: string[] = [];
      let branch = rootDependencyItems;

      for (const selectedId of current) {
        const match = branch.find((item) => item.id === selectedId);
        if (!match) break;
        nextPath.push(selectedId);
        branch = match.dependencies;
      }

      return nextPath;
    });
  }, [rootDependencyItems]);

  const projectItems: ProjectColumnItem[] = sourceProjects.map((project) => ({
    id: project.id,
    kind: "project",
    name: project.name,
    status: project.status,
    meta: `${project.moduleCount} modules`,
  }));

  const moduleItems: ModuleColumnItem[] = (selectedProject?.modules ?? []).map((module) => ({
    id: module.id,
    kind: "module",
    name: module.name,
    status: module.status,
    meta: `${module.activityCount} activities`,
  }));

  const activityItems: ActivityColumnItem[] = flattenUniqueActivities(selectedModule?.activities ?? []).map(
    (activity) => ({
      id: activity.id,
      kind: "activity" as const,
      name: activity.name,
      status: activity.status,
      meta: activity.expectedDateLabel,
    })
  );

  const dependencyColumns = useMemo(() => {
    const columns: { items: ChildColumnItem[]; selectedId: string | null; key: string }[] = [];
    let branch = rootDependencyItems;
    let level = 0;

    while (branch.length > 0) {
      const selectedId = selectedDependencyPath[level] ?? null;
      columns.push({
        key: `dependency-${level}-${selectedId ?? "open"}`,
        selectedId,
        items: branch.map((child) => ({
          id: child.id,
          kind: "child" as const,
          name: child.name,
          status: child.status,
          meta: child.expectedDateLabel,
          code: child.code,
        })),
      });

      if (!selectedId) break;
      const selectedNode = branch.find((item) => item.id === selectedId);
      branch = pruneNestedSiblings(selectedNode?.dependencies ?? []);
      level += 1;
    }

    return columns;
  }, [rootDependencyItems, selectedDependencyPath]);

  return (
    <section className="wh-timeline-tree wh-timeline-tree--cascade" aria-labelledby="wh-timeline-tree-heading">
      <div className="ttv-cascade-shell">
        <div className="wh-section-head wh-section-head--timeline">
          <span className="wh-section-eyebrow">Hierarchy Explorer</span>
          <h2 id="wh-timeline-tree-heading" className="wh-section-title wh-section-title--timeline">
            Project Tree View
          </h2>
          <p className="wh-section-sub wh-section-sub--timeline">
            Follow the project structure from portfolio level down to activity dependencies in one continuous view.
          </p>
        </div>

        <div className="ttv-cascade-grid" aria-hidden />

        <div className="ttv-cascade-scroll">
        <div className="ttv-cascade-columns">
          <HierarchyColumn
            items={projectItems}
            selectedId={selectedProjectId}
            onSelect={(id) => {
              setSelectedProjectId(id);
              setSelectedModuleId(null);
              setSelectedActivityId(null);
              setSelectedDependencyPath([]);
            }}
            columnClassName="ttv-cascade-column--project"
            prefersReducedMotion={prefersReducedMotion}
            emptyTitle="No projects"
            emptyText="No project data is available right now."
          />

          <AnimatePresence mode="wait" initial={false}>
            {selectedProject ? (
              <motion.div
                key={`module-${selectedProject.id}`}
                initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
                transition={{ duration: 0.28, ease: easeSmooth }}
              >
                <HierarchyColumn
                  items={moduleItems}
                  selectedId={selectedModuleId}
                  onSelect={(id) => {
                    setSelectedModuleId(id);
                    setSelectedActivityId(null);
                    setSelectedDependencyPath([]);
                  }}
                  columnClassName="ttv-cascade-column--module"
                  prefersReducedMotion={prefersReducedMotion}
                  emptyTitle="No modules"
                  emptyText="This project does not have any modules yet."
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            {selectedModule ? (
              <motion.div
                key={`activity-${selectedProject?.id ?? "project"}-${selectedModule.id}`}
                initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
                transition={{ duration: 0.28, ease: easeSmooth }}
              >
                <HierarchyColumn
                  items={activityItems}
                  selectedId={selectedActivityId}
                  onSelect={(id) => {
                    setSelectedActivityId(id);
                    setSelectedDependencyPath([]);
                  }}
                  columnClassName="ttv-cascade-column--activity"
                  prefersReducedMotion={prefersReducedMotion}
                  emptyTitle="No activities"
                  emptyText="This module does not have any activities yet."
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {selectedActivity && dependencyColumns.length === 0 ? (
              <motion.section
                key={`child-empty-${selectedActivity.id}`}
                className="ttv-cascade-column ttv-cascade-column--child"
                initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
                transition={{ duration: 0.28, ease: easeSmooth }}
              >
                <div className="ttv-cascade-list" role="list">
                  <div className={`ttv-cascade-card ${statusMeta[selectedActivity.status].className}`}>
                    <div className="ttv-cascade-card-copy">
                      <div className="ttv-cascade-card-row">
                        <strong className="ttv-cascade-card-title">No dependent items</strong>
                      </div>
                      <div className="ttv-cascade-card-meta">
                        <span>{selectedActivity.expectedDateLabel}</span>
                        {selectedActivity.code ? <span>{selectedActivity.code}</span> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {dependencyColumns.map((column, index) => (
              <motion.div
                key={column.key}
                initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
                transition={{ duration: 0.28, ease: easeSmooth }}
              >
                <HierarchyColumn
                  items={column.items}
                  selectedId={column.selectedId}
                  onSelect={(id) => {
                    setSelectedDependencyPath((current) => {
                      const next = current.slice(0, index);
                      next[index] = id;
                      return next;
                    });
                  }}
                  columnClassName={index === 0 ? "ttv-cascade-column--child" : "ttv-cascade-column--nested"}
                  prefersReducedMotion={prefersReducedMotion}
                  emptyTitle="No dependents"
                  emptyText="This activity does not have dependent items."
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineTreeView;
