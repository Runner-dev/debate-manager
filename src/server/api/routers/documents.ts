import { type Country, type Document } from "@prisma/client";
import { observable } from "@trpc/server/observable";
import EventEmitter from "eventemitter3";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
export type DocumentData = Document & { owner: Country };

type UpdateEventData =
  | { type: "full"; data: Array<DocumentData> }
  | { type: "new"; data: DocumentData }
  | { type: "update"; data: DocumentData }
  | { type: "delete"; data: string };

const eventEmitter = new EventEmitter();

const sendUpdateEvent = (id: string, data: UpdateEventData) =>
  eventEmitter.emit(`update-${id}`, data);

export const documentsRouter = createTRPCRouter({
  getDocuments: protectedProcedure.query(
    async ({ ctx: { session, prisma } }) => {
      return prisma.document.findMany({
        where: {
          committee: {
            OR: [
              { chairs: { some: { userId: session.user.id } } },
              {
                countries: {
                  some: { delegates: { some: { userId: session.user.id } } },
                },
              },
            ],
          },
        },
        include: { owner: true },
        orderBy: {
          updatedAt: "asc",
        },
      });
    }
  ),
  getDocument: protectedProcedure
    .input(z.string().cuid())
    .query(async ({ ctx: { prisma }, input }) => {
      return prisma.document.findUnique({
        where: {
          id: input,
        },
        include: { owner: true },
      });
    }),
  updateDocument: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        type: z
          .enum(["positionPaper", "draftResolution", "ammendment"])
          .optional(),
        title: z.string().trim().optional(),
        state: z
          .enum(["sent", "approved", "rejected", "introduced"])
          .optional(),
        url: z.string().url().optional(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx: { prisma }, input }) => {
      const updatedDoc = await prisma.document.update({
        where: { id: input.id },
        data: input,
        include: { owner: true },
      });

      sendUpdateEvent(updatedDoc.committeeId, {
        type: "update",
        data: updatedDoc,
      });
    }),
  deleteDocument: protectedProcedure
    .input(z.string().cuid())
    .mutation(async ({ ctx: { prisma }, input }) => {
      const motion = await prisma.document.delete({
        where: { id: input },
        select: { committeeId: true },
      });
      sendUpdateEvent(motion.committeeId, { type: "delete", data: input });
    }),
  createDocument: protectedProcedure
    .input(
      z.object({
        type: z.enum(["positionPaper", "draftResolution", "ammendment"]),
        url: z.string().url(),
        title: z.string().trim(),
      })
    )
    .mutation(async ({ ctx: { prisma, session }, input }) => {
      const userData = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { chair: true, delegate: { select: { country: true } } },
      });
      const committeeId =
        userData?.chair?.committeeId ??
        userData?.delegate?.country.committeeId ??
        undefined;
      if (!committeeId) return;
      const countryId = userData?.delegate?.country.id || undefined;
      if (!countryId) return;
      const document = await prisma.document.create({
        data: {
          ...input,
          committeeId,
          countryId,
        },
        include: { owner: true },
      });

      sendUpdateEvent(document.committeeId, {
        type: "new",
        data: document,
      });
    }),
  onDocumentsUpdate: protectedProcedure.subscription(
    async ({ ctx: { session, prisma } }) => {
      const userCommittee = await prisma.committee.findFirst({
        where: {
          OR: [
            {
              countries: {
                some: { delegates: { some: { userId: session.user.id } } },
              },
            },
            { chairs: { some: { userId: session.user.id } } },
          ],
        },
      });

      if (!userCommittee) return;

      return observable<UpdateEventData>((emit) => {
        const onUpdate = (data: UpdateEventData) => {
          emit.next(data);
        };

        eventEmitter.on(`update-${userCommittee.id}`, onUpdate);

        return () => {
          eventEmitter.off(`update-${userCommittee.id}`, onUpdate);
        };
      });
    }
  ),
  onDocumentUpdate: protectedProcedure
    .input(z.string().cuid())
    .subscription(async ({ ctx: { session, prisma }, input }) => {
      const userCommittee = await prisma.committee.findFirst({
        where: {
          OR: [
            {
              countries: {
                some: { delegates: { some: { userId: session.user.id } } },
              },
            },
            { chairs: { some: { userId: session.user.id } } },
          ],
        },
      });

      if (!userCommittee) return;

      return observable<DocumentData>((emit) => {
        const onUpdate = (data: UpdateEventData) => {
          switch (data.type) {
            case "full": {
              data.data.forEach((doc) => doc.id === input && emit.next(doc));
              break;
            }
            case "update": {
              if (data.data.id === input) emit.next(data.data);
              break;
            }
          }
        };

        eventEmitter.on(`update-${userCommittee.id}`, onUpdate);

        return () => {
          eventEmitter.off(`update-${userCommittee.id}`, onUpdate);
        };
      });
    }),
});
