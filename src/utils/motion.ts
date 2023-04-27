import { type Motion } from "@prisma/client";
import { z } from "zod";

export const motionSchemas = {
  appeal: z.object({ type: z.literal("appeal"), note: z.string().nonempty() }),
  moderated: z.object({
    type: z.literal("moderated"),
    topic: z.string().nonempty(),
    duration: z.number(),
    speechDuration: z.number(),
  }),
  unmoderated: z.object({
    type: z.literal("unmoderated"),
    topic: z.string().nonempty(),
    duration: z.number(),
  }),
  tour: z.object({
    type: z.literal("tour"),
    topic: z.string().nonempty(),
    speechDuration: z.number(),
  }),
  timeAgainst: z.object({
    type: z.literal("timeAgainst"),
  }),
  moveVote: z.object({
    type: z.literal("moveVote"),
  }),
  adoptNoVote: z.object({
    type: z.literal("adoptNoVote"),
  }),
  introduceDocument: z.object({
    type: z.literal("introduceDocument"),
    documentId: z.string().cuid(),
  }),
  suspendDebate: z.object({
    type: z.literal("suspendDebate"),
  }),
  recess: z.object({
    type: z.literal("recess"),
  }),
  minuteOfSilence: z.object({
    type: z.literal("minuteOfSilence"),
    topic: z.string().nullable(),
  }),
};

export const baseMotionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("appeal"), note: z.string().nonempty() }),
  z.object({
    type: z.literal("moderated"),
    topic: z.string().nonempty(),
    duration: z.number(),
    speechDuration: z.number(),
  }),
  z.object({
    type: z.literal("unmoderated"),
    topic: z.string().nonempty(),
    duration: z.number(),
  }),
  z.object({
    type: z.literal("tour"),
    topic: z.string().nonempty(),
    speechDuration: z.number(),
  }),
  z.object({
    type: z.literal("timeAgainst"),
  }),
  z.object({
    type: z.literal("moveVote"),
  }),
  z.object({
    type: z.literal("adoptNoVote"),
  }),
  z.object({
    type: z.literal("introduceDocument"),
    documentId: z.string().cuid(),
  }),
  z.object({
    type: z.literal("suspendDebate"),
  }),
  z.object({
    type: z.literal("recess"),
  }),
  z.object({
    type: z.literal("minuteOfSilence"),
    topic: z.string().nullable(),
  }),
]);

export const motionSchema = baseMotionSchema.and(
  z.object({
    committeeId: z.string().cuid(),
    country: z.any(),
    id: z.string().cuid(),
  })
);

export type TypedMotion = z.infer<typeof motionSchema>;
export type MotionTypes = TypedMotion["type"];

export const motionNames: Record<MotionTypes, string> = {
  tour: "Tour the Table",
  appeal: "Apelar Decisão da Mesa",
  recess: "Recesso",
  moveVote: "Mover para Voto",
  moderated: "Debate Moderado",
  unmoderated: "Debate Não Moderado",
  adoptNoVote: "Adotar sem voto",
  timeAgainst: "Mover para Tempo Contra",
  minuteOfSilence: "Minuto de Silêncio",
  suspendDebate: "Suspender Debate",
  introduceDocument: "Introduzir Documento",
} as const;

export const motionToTyped = (motion: Motion) => {
  return motionSchema.parse(motion);
};
