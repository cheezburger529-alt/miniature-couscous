import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const stages = pgTable("stages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  scheduledAt: timestamp("scheduled_at"),
});

export const insertStageSchema = createInsertSchema(stages).omit({ id: true, createdAt: true });

export type Stage = typeof stages.$inferSelect;
export type InsertStage = z.infer<typeof insertStageSchema>;

export const adminLoginSchema = z.object({
  password: z.string()
});

export type AdminLoginRequest = z.infer<typeof adminLoginSchema>;
