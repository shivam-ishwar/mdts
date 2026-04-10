import { db } from "./dataStorege";

export const getLatestProjectModules = async (project: any): Promise<any[]> => {
  if (Array.isArray(project?.projectTimeline) && project.projectTimeline.length > 0) {
    const latest = project.projectTimeline[project.projectTimeline.length - 1];
    const timelineId = latest?.timelineId || latest?.versionId || latest?.id;

    if (timelineId) {
      try {
        const timeline = await db.getProjectTimelineById(timelineId);

        if (Array.isArray(timeline)) {
          return timeline;
        }

        if (timeline && Array.isArray((timeline as any).modules)) {
          return (timeline as any).modules;
        }

        if (timeline && Array.isArray((timeline as any).activities)) {
          return [timeline];
        }
      } catch (error) {
        console.error("Failed to load latest project timeline", error);
      }
    }
  }

  if (Array.isArray(project?.processedTimelineData) && project.processedTimelineData.length > 0) {
    return project.processedTimelineData;
  }

  return [];
};
