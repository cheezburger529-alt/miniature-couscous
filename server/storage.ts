import { db } from "./db";
import { stages, type Stage, type InsertStage } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getStages(): Promise<Stage[]>;
  getStageBySlug(slug: string): Promise<Stage | undefined>;
  createStage(stage: InsertStage): Promise<Stage>;
  updateStage(id: number, stage: Partial<InsertStage>): Promise<Stage>;
}

export class DatabaseStorage implements IStorage {
  async getStages(): Promise<Stage[]> {
    return await db.select().from(stages).where(eq(stages.isActive, true));
  }

  async getStageBySlug(slug: string): Promise<Stage | undefined> {
    const [stage] = await db.select().from(stages).where(eq(stages.slug, slug));
    return stage;
  }

  async createStage(insertStage: InsertStage): Promise<Stage> {
    const [stage] = await db.insert(stages).values(insertStage).returning();
    return stage;
  }

  async updateStage(id: number, update: Partial<InsertStage>): Promise<Stage> {
    const [stage] = await db.update(stages).set(update).where(eq(stages.id, id)).returning();
    return stage;
  }
}

export const storage = new DatabaseStorage();
