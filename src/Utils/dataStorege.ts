import Dexie, { Table } from "dexie";
import { message } from "antd";

export interface KnowledgeReaction {
  id?: number;
  postId: number;
  type: "like";
  createdAt: string;
  userId: string;
  email: string;
  name?: string;
}

export interface KnowledgeComment {
  id?: number;
  postId: number;
  guid: string;
  content: string;

  resolved?: boolean;

  createdAt: string;
  updatedAt: string;

  createdBy: { userId: string; name?: string; email: string };

  parentCommentId?: number | null;
}
export interface KnowledgePost {
  id?: number;
  guid: string;
  title?: string;
  content: string;
  visibility: ShareVisibility;
  sharedWith?: Array<{ userId?: string; email?: string; name?: string }>;
  attachments?: Array<{ docId: string; name: string; path: string; mime?: string }>;
  createdAt: string;
  updatedAt: string;
  createdBy: { userId: string; name: string; email: string };

  likeCount?: number;
  commentCount?: number;
  lastActivityAt?: string;
}

export interface MineType {
  id?: number;
  type: string;
  description?: string;
}

export interface Library {
  id?: number;
  title: string;
  content?: string;
}

export interface Document {
  id?: number;
  [key: string]: any;
}

export interface DiskStorage {
  id?: number;
  path: string;
  content: string;
}

export interface DocType {
  id?: number;
  name: string;
}

export interface ActivityBudget {
  id?: number;
  projectId: string;
  moduleCode?: string;
  moduleName?: string;
  activityCode: string;
  activityName?: string;

  originalBudget?: number;
  originalBudgetDate?: string;

  revisedBudget?: number;
  revisedBudgetDate?: string;
  revisionHistory?: RevisionEntry[];

  currency?: string;
  updatedAt?: string;
}

export interface ActivityCost {
  id?: number;
  projectId: string;
  moduleCode?: string;
  moduleName?: string;
  activityCode: string;
  activityName?: string;
  projectCost?: number;
  opportunityCost?: number;
  currency?: string;
  updatedAt?: string;
}

export interface RevisionEntry {
  amount: number;
  date: string;
}

export type ShareVisibility = "private" | "public" | "restricted";

export interface KnowledgePost {
  id?: number;
  guid: string;
  title?: string;
  content: string;
  visibility: ShareVisibility;
  sharedWith?: Array<{ userId?: string; email?: string; name?: string }>;
  attachments?: Array<{ docId: string; name: string; path: string; mime?: string }>;
  createdAt: string;
  updatedAt: string;
  createdBy: { userId: string; name: string; email: string };
}

export interface CommercialActivity {
  id?: number;
  projectId: string;

  moduleCode?: string;
  moduleName?: string;

  activityCode: string;
  activityName?: string;

  plannedStart?: string | null;
  plannedFinish?: string | null;

  actualStart?: string | null;
  actualFinish?: string | null;

  commercialUndertaken?: boolean;
  leadTimeDays?: number | null;

  orderProcessingStatus?: string | null;

  updatedAt?: string;
}

export interface ActivityBudgetDocument {
  id?: number;
  projectId: string;
  activityCode: string;
  activityName?: string;
  moduleName?: string;
  name: string;
  filePath: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface NotificationRead {
  id: string;
  notificationId: string;
  userId: string;
  orgId: string;
  readAt: string;
}


export class DataStorage extends Dexie {
  mineTypes!: Table<MineType, number>;
  modules!: Table<any, number>;
  projects!: Table<any, number>;
  moduleLibrary!: Table<Library, number>;
  users!: Table<any, number>;
  holidays!: Table<any, number>;
  projectTimelines!: Table<any, number>;
  documents!: Table<Document, number>;
  diskStorage!: Table<DiskStorage, number>;
  companies!: Table<any, number>;
  docTypes!: Table<DocType, number>;
  activityBudgets!: Table<ActivityBudget, number>;
  activityCosts!: Table<ActivityCost, number>;
  commercialActivities!: Table<CommercialActivity, number>;
  activityBudgetDocs!: Table<ActivityBudgetDocument, number>;
  knowledgePosts!: Table<KnowledgePost, number>;
  knowledgeComments!: Table<KnowledgeComment, number>;
  knowledgeReactions!: Table<KnowledgeReaction & { id?: number; postId: number }, number>;
  notificationReads!: Table<NotificationRead, string>;

  constructor() {
    super("MTDS");
    this.version(1).stores({
      mineTypes: "++id, type",
      modules: "++id",
      moduleLibrary: "++id",
      projects: "++id",
      users: "++id",
      holidays: "++id",
      projectTimelines: "++id",
      documents: "++id, name",
      diskStorage: "++id, path",
      companies: "++id, guiId",
    });

    this.version(2).stores({
      docTypes: "++id, name",
    }).upgrade(async (tx) => {
      const count = await tx.table("docTypes").count();
      if (!count) {
        await tx.table("docTypes").bulkAdd([
          { name: "Notification" },
          { name: "Letter" },
          { name: "Review Meeting MoM" },
          { name: "Approved NFA" },
        ]);
      }
    });

    this.version(3).stores({
      activityBudgets: "++id, projectId, activityCode",
    });

    this.version(4).stores({
      activityCosts: "++id, projectId, activityCode",
    });

    this.version(5).stores({
      commercialActivities: "++id, projectId, activityCode",
    });

    this.version(6).stores({
      activityBudgetDocs: "++id, projectId, activityCode",
    });

    this.version(7).stores({
      knowledgePosts: "++id, guid, visibility, createdAt, createdBy.email",
    });

    this.version(8).stores({
      knowledgeComments: "++id, postId, createdAt, createdBy.email, resolved, updatedAt",
      knowledgeReactions: "++id, postId, createdAt, email, type",
    });

    this.version(9).stores({
      notificationReads: "id, notificationId, userId, orgId, readAt",
    });

    this.mineTypes = this.table("mineTypes");
    this.modules = this.table("modules");
    this.moduleLibrary = this.table("moduleLibrary");
    this.projects = this.table("projects");
    this.users = this.table("users");
    this.holidays = this.table("holidays");
    this.projectTimelines = this.table("projectTimelines");
    this.documents = this.table("documents");
    this.diskStorage = this.table("diskStorage");
    this.companies = this.table("companies");
    this.docTypes = this.table("docTypes");
    this.activityBudgets = this.table("activityBudgets");
    this.activityCosts = this.table("activityCosts");
    this.commercialActivities = this.table("commercialActivities");
    this.activityBudgetDocs = this.table("activityBudgetDocs");
    this.knowledgePosts = this.table("knowledgePosts");
    this.knowledgeComments = this.table("knowledgeComments");
    this.knowledgeReactions = this.table("knowledgeReactions");
    this.notificationReads = this.table("notificationReads");
  }

  async addModule(module: any): Promise<number> {
    if (!module || typeof module !== "object") {
      throw new Error("Invalid module data: Module must be an object.");
    }
    return this.modules.add({ ...module });
  }

  async getModules(): Promise<any> {
    return this.modules.toArray();
  }

  async saveModules(modules: any[]): Promise<void> {
    await this.modules.clear();
    await this.modules.bulkAdd(modules);
  }

  async deleteModule(id: number): Promise<void> {
    await this.modules.delete(id);
  }

  async addMineType(mineType: MineType): Promise<number> {
    return this.mineTypes.add(mineType);
  }

  async getAllMineTypes(): Promise<MineType[]> {
    return this.mineTypes.toArray();
  }

  async addProject(project: any): Promise<number> {
    return this.projects.add(project);
  }

  async getProjectById(id: any): Promise<any | undefined> {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      throw new Error(`Invalid project ID: ${id}`);
    }
    return await this.projects.get(numericId);
  }

  async getProjects(): Promise<any[]> {
    return this.projects.toArray();
  }

  async deleteProject(id: number): Promise<void> {
    await this.projects.delete(id);
  }

  async updateProject(id: any, updatedData: any): Promise<void> {
    const numericId = Number(id);

    if (isNaN(numericId)) {
      throw new Error(`Invalid project ID: ${id}`);
    }
    const existingProject = await this.projects.get(numericId);

    if (!existingProject) {
      console.warn(`Project with ID ${numericId} not found. Adding it as a new record.`);
    }

    function sanitizeData(obj: any): any {
      return JSON.parse(
        JSON.stringify(obj, (_key: any, value) => {
          if (typeof value === "function") {
            return undefined;
          }
          if (value && typeof value === "object" && value["$isDayjsObject"]) {
            return value.$d;
          }
          return value;
        })
      );
    }

    const sanitizedData = sanitizeData(updatedData);
    sanitizedData.id = numericId;
    await this.deleteProject(id);
    await this.projects.put(sanitizedData);
  }

  async addLibrary(library: any): Promise<number> {
    return this.moduleLibrary.add(library);
  }

  async getAllLibraries(): Promise<any> {
    return this.moduleLibrary.toArray();
  }

  async getLibraryById(id: any): Promise<any> {
    return this.moduleLibrary.get(id);
  }

  async updateLibrary(id: number, newRecord: any): Promise<void> {
    try {
      const existingLibrary = await this.moduleLibrary.get(id);
      if (existingLibrary) {
        const updatedLibrary = { ...newRecord, id };
        await this.moduleLibrary.put(updatedLibrary);
      } else {
        message.warning(`Library with ID ${id} not found.`);
      }
    } catch (error) {
      message.error("Error updating library in IndexedDB:");
    }
  }

  async deleteLibrary(id: number): Promise<void> {
    try {
      const existingLibrary = await this.moduleLibrary.get(id);
      if (existingLibrary) {
        await this.moduleLibrary.delete(id);
      } else {
        message.warning(`Library with ID ${id} not found.`);
      }
    } catch (error) {
      message.error("Error deleting library from IndexedDB:");
    }
  }

  async addUsers(users: any): Promise<number> {
    return this.users.add(users);
  }

  async getUsers(): Promise<any[]> {
    return this.users.toArray();
  }

  async deleteUser(id: number): Promise<void> {
    await this.users.delete(id);
  }

  async updateUsers(id: any, updatedData: any): Promise<void> {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      throw new Error(`Invalid user ID: ${id}`);
    }
    const existingUser = await this.users.get(numericId);

    if (!existingUser) {
      console.warn(`User with ID ${numericId} not found. Adding it as a new record.`);
    }

    function sanitizeData(obj: any): any {
      return JSON.parse(
        JSON.stringify(obj, (_key: any, value) => {
          if (typeof value === "function") {
            return undefined;
          }
          if (value && typeof value === "object" && value["$isDayjsObject"]) {
            return value.$d;
          }
          return value;
        })
      );
    }

    const sanitizedData = sanitizeData(updatedData);
    sanitizedData.id = numericId;
    await this.deleteUser(id);
    await this.users.put(sanitizedData);
  }

  async getUserById(id: any): Promise<any | undefined> {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      throw new Error(`Invalid user ID: ${id}`);
    }
    return await this.users.get(numericId);
  }

  async addHolidays(holiday: any): Promise<number> {
    return this.holidays.add(holiday);
  }

  async getAllHolidays(): Promise<any> {
    return this.holidays.toArray();
  }

  async getHolidaysById(id: any): Promise<any> {
    return this.holidays.get(id);
  }

  async updateHolidays(id: number, newRecord: any): Promise<void> {
    try {
      const existingholiday = await this.holidays.get(id);
      if (existingholiday) {
        const updatedholiday = { ...newRecord, id };
        await this.holidays.put(updatedholiday);
        message.success(`Holiday with ID ${id} updated successfully.`);
      } else {
        message.warning(`Holiday with ID ${id} not found.`);
      }
    } catch (error) {
      message.error("Error updating holiday in IndexedDB:");
    }
  }

  async deleteHolidays(id: number): Promise<void> {
    try {
      const existingholiday = await this.holidays.get(id);
      if (existingholiday) {
        await this.holidays.delete(id);
        message.success(`Holiday with ID ${id} deleted successfully.`);
      } else {
        message.warning(`Holiday with ID ${id} not found.`);
      }
    } catch (error) {
      message.error("Error deleting Holiday from IndexedDB:");
    }
  }

  async addProjectTimeline(timeline: any): Promise<number> {
    const serializableTimeline = JSON.parse(JSON.stringify(timeline));
    return this.projectTimelines.add(serializableTimeline);
  }

  async getAllProjectTimeline(): Promise<any> {
    return this.projectTimelines.toArray();
  }

  async getNotificationReads(userId: string, orgId: string): Promise<NotificationRead[]> {
    return this.notificationReads
      .where({ userId: String(userId), orgId: String(orgId) })
      .toArray();
  }

  async markNotificationRead(notificationId: string, userId: string, orgId: string): Promise<void> {
    const id = `${orgId}:${userId}:${notificationId}`;
    const existing = await this.notificationReads.get(id);
    if (existing) return;
    await this.notificationReads.put({
      id,
      notificationId,
      userId: String(userId),
      orgId: String(orgId),
      readAt: new Date().toISOString(),
    });
  }

  async markNotificationUnread(notificationId: string, userId: string, orgId: string): Promise<void> {
    const id = `${orgId}:${userId}:${notificationId}`;
    await this.notificationReads.delete(id);
  }

  async getProjectTimelineById(id: any): Promise<any> {
    return this.projectTimelines.get(id);
  }

  async updateProjectTimeline(id: number, newRecord: any): Promise<void> {
    try {
      const existingProjectTimeline = await this.projectTimelines.get(id);
      if (existingProjectTimeline) {
        const sanitizedRecord = JSON.parse(JSON.stringify(newRecord));
        sanitizedRecord['id'] = id;

        await this.projectTimelines.put(sanitizedRecord);
      } else {
        message.warning(`Project Timeline with ID ${id} not found.`);
      }
    } catch (error) {
      console.error("Error updating Project Timeline in IndexedDB:", error);
      message.error("Error updating Project Timeline in IndexedDB");
    }
  }

  async deleteProjectTimeline(id: number): Promise<void> {
    try {
      const existingprojectTimelines = await this.projectTimelines.get(id);
      if (existingprojectTimelines) {
        await this.projectTimelines.delete(id);
        message.success(`Project Timelines with ID ${id} deleted successfully.`);
      } else {
        message.warning(`Project Timelines with ID ${id} not found.`);
      }
    } catch (error) {
      message.error("Error deleting Project Timelines from IndexedDB:");
    }
  }

  //documents
  async addDocument(doc: any): Promise<number> {
    return this.documents.add({ ...doc });
  }

  async getAllDocuments(): Promise<any[]> {
    return this.documents.toArray();
  }

  async getDocumentById(id: number): Promise<any> {
    return this.documents.get(id);
  }

  async updateDocument(id: number, updatedData: any): Promise<void> {
    const existingDoc = await this.documents.get(id);
    if (existingDoc) {
      await this.documents.put({ ...existingDoc, ...updatedData, id });
    } else {
      message.warning(`Document with ID ${id} not found.`);
    }
  }

  async deleteDocument(id: number): Promise<void> {
    const existingDoc = await this.documents.get(id);
    if (existingDoc) {
      await this.documents.delete(id);
    } else {
      message.warning(`Document with ID ${id} not found.`);
    }
  }

  //disk storage
  async addDiskEntry(path: string, content: string): Promise<void> {
    await this.diskStorage.add({ path, content });
  }

  async getDiskEntry(path: string): Promise<string | null> {
    const entry = await this.diskStorage.where("path").equals(path).first();
    return entry?.content || null;
  }

  //companies
  async addCompany(company: any): Promise<number> {
    return this.companies.add(company);
  }

  async getAllCompanies(): Promise<any[]> {
    return this.companies.toArray();
  }

  async getCompanyByGuiId(guiId: string): Promise<any | undefined> {
    return this.companies.where("guiId").equals(guiId).first();
  }

  async updateCompany(id: number, updatedCompany: Partial<any>): Promise<void> {
    const existing = await this.companies.get(id);
    if (existing) {
      const updated = { ...existing, ...updatedCompany, id };
      await this.companies.put(updated);
    } else {
      message.warning(`Company with ID ${id} not found.`);
    }
  }

  async deleteCompany(id: number): Promise<void> {
    const existing = await this.companies.get(id);
    if (existing) {
      await this.companies.delete(id);
      message.success(`Company with ID ${id} deleted successfully.`);
    } else {
      message.warning(`Company with ID ${id} not found.`);
    }
  }

  async addDocType(name: string): Promise<number> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Type name required");
    const exists = await this.docTypes.where("name").equalsIgnoreCase(trimmed).first();
    if (exists) throw new Error("Type already exists");
    return this.docTypes.add({ name: trimmed });
  }

  async getAllDocTypes(): Promise<DocType[]> {
    return this.docTypes.orderBy("name").toArray();
  }

  async upsertActivityBudget(data: Omit<ActivityBudget, "id">): Promise<number> {
    const projectId = String(data.projectId);
    const activityCode = String(data.activityCode);

    const existing = await this.activityBudgets
      .where({ projectId, activityCode })
      .first();

    const nowIso = new Date().toISOString();

    const payload: ActivityBudget = {
      ...(existing || { projectId, activityCode }),
      ...data,
      projectId,
      activityCode,
      updatedAt: nowIso,
    };

    if (existing?.id) {
      await this.activityBudgets.update(existing.id, payload);
      return existing.id;
    }

    return this.activityBudgets.add(payload);
  }

  async getActivityBudgetsForProject(projectId: string): Promise<ActivityBudget[]> {
    return this.activityBudgets.where("projectId").equals(String(projectId)).toArray();
  }

  async deleteActivityBudget(projectId: string, activityCode: string): Promise<void> {
    const existing = await this.activityBudgets
      .where({ projectId: String(projectId), activityCode: String(activityCode) })
      .first();

    if (existing?.id) {
      await this.activityBudgets.delete(existing.id);
    }
  }

  async getActivityBudget(
    projectId: string,
    activityCode: string
  ): Promise<ActivityBudget | null> {
    const record = await this.activityBudgets
      .where({
        projectId: String(projectId),
        activityCode: String(activityCode),
      })
      .first();

    return record ?? null;
  }

  async upsertActivityCost(data: Omit<ActivityCost, "id">): Promise<number> {
    const projectId = String(data.projectId);
    const activityCode = String(data.activityCode);

    const existing = await this.activityCosts
      .where({ projectId, activityCode })
      .first();

    const nowIso = new Date().toISOString();

    const payload: ActivityCost = {
      ...(existing || { projectId, activityCode }),
      ...data,
      projectId,
      activityCode,
      updatedAt: nowIso,
    };

    if (existing?.id) {
      await this.activityCosts.update(existing.id, payload);
      return existing.id;
    }

    return this.activityCosts.add(payload);
  }

  async getActivityCostsForProject(projectId: string): Promise<ActivityCost[]> {
    return this.activityCosts.where("projectId").equals(String(projectId)).toArray();
  }

  async getActivityCost(
    projectId: string,
    activityCode: string
  ): Promise<ActivityCost | null> {
    const record = await this.activityCosts
      .where({ projectId: String(projectId), activityCode: String(activityCode) })
      .first();
    return record ?? null;
  }

  async deleteActivityCost(projectId: string, activityCode: string): Promise<void> {
    const existing = await this.activityCosts
      .where({ projectId: String(projectId), activityCode: String(activityCode) })
      .first();

    if (existing?.id) {
      await this.activityCosts.delete(existing.id);
    }
  }

  async upsertCommercialActivity(
    data: Omit<CommercialActivity, "id">
  ): Promise<number> {
    const projectId = String(data.projectId);
    const activityCode = String(data.activityCode);

    const existing = await this.commercialActivities
      .where({ projectId, activityCode })
      .first();

    const nowIso = new Date().toISOString();

    const payload: CommercialActivity = {
      ...(existing || { projectId, activityCode }),
      ...data,
      projectId,
      activityCode,
      updatedAt: nowIso,
    };

    if (existing?.id) {
      await this.commercialActivities.update(existing.id, payload);
      return existing.id;
    }

    return this.commercialActivities.add(payload);
  }

  async getCommercialActivitiesForProject(
    projectId: string
  ): Promise<CommercialActivity[]> {
    return this.commercialActivities
      .where("projectId")
      .equals(String(projectId))
      .toArray();
  }

  async getCommercialActivity(
    projectId: string,
    activityCode: string
  ): Promise<CommercialActivity | null> {
    const record = await this.commercialActivities
      .where({
        projectId: String(projectId),
        activityCode: String(activityCode),
      })
      .first();

    return record ?? null;
  }

  async deleteCommercialActivity(
    projectId: string,
    activityCode: string
  ): Promise<void> {
    const existing = await this.commercialActivities
      .where({
        projectId: String(projectId),
        activityCode: String(activityCode),
      })
      .first();

    if (existing?.id) {
      await this.commercialActivities.delete(existing.id);
    }
  }

  async addActivityBudgetDoc(
    data: Omit<ActivityBudgetDocument, "id">
  ): Promise<number> {
    const payload: ActivityBudgetDocument = {
      ...data,
      projectId: String(data.projectId),
      activityCode: String(data.activityCode),
    };
    return this.activityBudgetDocs.add(payload);
  }

  async getActivityBudgetDocs(
    projectId: string,
    activityCode: string
  ): Promise<ActivityBudgetDocument[]> {
    return this.activityBudgetDocs
      .where({
        projectId: String(projectId),
        activityCode: String(activityCode),
      })
      .toArray();
  }

  async deleteActivityBudgetDoc(id: number): Promise<void> {
    await this.activityBudgetDocs.delete(id);
  }

  async deleteDiskEntry(path: string): Promise<void> {
    await this.diskStorage.where("path").equals(path).delete();
  }

  async addKnowledgePost(post: Omit<KnowledgePost, "id">) {
    return this.knowledgePosts.add(post);
  }

  async getKnowledgePosts() {
    const all = await this.knowledgePosts.toArray();
    return all.sort((a: any, b: any) => {
      const ad = (a.lastActivityAt || a.createdAt || "");
      const bd = (b.lastActivityAt || b.createdAt || "");
      return bd.localeCompare(ad);
    });
  }

  async deleteKnowledgePost(id: number) {
    const p = await this.knowledgePosts.get(id);

    if (p?.attachments?.length) {
      for (const a of p.attachments) {
        if (a.path) await this.deleteDiskEntry(a.path);
      }
    }

    await this.knowledgeComments.where("postId").equals(id).delete();
    await this.knowledgeReactions.where("postId").equals(id).delete();

    await this.knowledgePosts.delete(id);
  }


  async addKnowledgeComment(data: Omit<KnowledgeComment, "id">) {
    const id = await this.knowledgeComments.add({ ...data, resolved: !!data.resolved });

    const post = await this.knowledgePosts.get(data.postId);
    const now = new Date().toISOString();

    if (post?.id) {
      await this.knowledgePosts.update(post.id, {
        commentCount: (post.commentCount || 0) + 1,
        lastActivityAt: now,
      });
    }

    return id;
  }

  async getCommentsForPost(postId: number) {
    // unresolved first, then latest updated
    const list = await this.knowledgeComments.where("postId").equals(postId).toArray();
    return list.sort((a: any, b: any) => {
      const ar = !!a.resolved;
      const br = !!b.resolved;
      if (ar !== br) return ar ? 1 : -1; // unresolved first
      return (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "");
    });
  }

  async updateKnowledgeComment(
    commentId: number,
    patch: Partial<Pick<KnowledgeComment, "content" | "resolved">>,
    actorEmail: string
  ) {
    const c = await this.knowledgeComments.get(commentId);
    if (!c) throw new Error("Comment not found");

    const owner = String(c.createdBy?.email || "").toLowerCase();
    const actor = String(actorEmail || "").toLowerCase();
    if (!owner || owner !== actor) throw new Error("Not allowed");

    const now = new Date().toISOString();
    await this.knowledgeComments.update(commentId, {
      ...patch,
      updatedAt: now,
    });

    // Touch post activity
    const post = await this.knowledgePosts.get(c.postId);
    if (post?.id) await this.knowledgePosts.update(post.id, { lastActivityAt: now });

    return true;
  }

  async deleteKnowledgeComment(commentId: number, actorEmail: string) {
    const c = await this.knowledgeComments.get(commentId);
    if (!c) return;

    const owner = String(c.createdBy?.email || "").toLowerCase();
    const actor = String(actorEmail || "").toLowerCase();
    if (!owner || owner !== actor) throw new Error("Not allowed");

    await this.knowledgeComments.delete(commentId);

    // Update post counters + activity
    const post = await this.knowledgePosts.get(c.postId);
    const now = new Date().toISOString();

    if (post?.id) {
      await this.knowledgePosts.update(post.id, {
        commentCount: Math.max(0, (post.commentCount || 0) - 1),
        lastActivityAt: now,
      });
    }
  }


  async hasLiked(postId: number, email: string) {
    const e = String(email || "").toLowerCase();
    const r = await this.knowledgeReactions
      .where("postId")
      .equals(postId)
      .filter((x: any) => String(x?.email || "").toLowerCase() === e && x.type === "like")
      .first();

    return !!r;
  }

  async toggleLike(
    postId: number,
    user: { id: string; email: string; name?: string }
  ) {
    const email = String(user.email || "").toLowerCase();
    const now = new Date().toISOString();

    const existing = await this.knowledgeReactions
      .where("postId")
      .equals(postId)
      .filter((r: any) => String(r?.email || "").toLowerCase() === email && r.type === "like")
      .first();

    const post = await this.knowledgePosts.get(postId);

    if (existing?.id) {
      await this.knowledgeReactions.delete(existing.id);

      if (post?.id) {
        await this.knowledgePosts.update(post.id, {
          likeCount: Math.max(0, (post.likeCount || 0) - 1),
          lastActivityAt: now,
        } as any);
      }

      return { liked: false };
    }

    await this.knowledgeReactions.add({
      postId,
      type: "like",
      createdAt: now,
      userId: String(user.id),
      email: String(user.email || "").toLowerCase(),
      name: user.name,
    });

    if (post?.id) {
      await this.knowledgePosts.update(post.id, {
        likeCount: (post.likeCount || 0) + 1,
        lastActivityAt: now,
      } as any);
    }

    return { liked: true };
  }

  async getKnowledgePostsForUser(email: string) {
  const e = String(email || "").toLowerCase();

  const posts = await this.knowledgePosts.toArray();

  const myLikes = await this.knowledgeReactions
    .where("email")
    .equals(e)
    .and((r: any) => r.type === "like")
    .toArray();

  const likedSet = new Set(myLikes.map((r: any) => Number(r.postId)));

  const enriched = posts.map((p: any) => ({
    ...p,
    myLiked: likedSet.has(Number(p.id)),
  }));

  return enriched.sort((a: any, b: any) => {
    const ad = (a.lastActivityAt || a.createdAt || "");
    const bd = (b.lastActivityAt || b.createdAt || "");
    return bd.localeCompare(ad);
  });
}

}

export const db = new DataStorage();
