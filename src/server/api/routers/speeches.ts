import { type Country, type Delegate, type Speech } from "@prisma/client";
import EventEmitter from "eventemitter3";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { observable } from "@trpc/server/observable";
import { prisma } from "~/server/db";

type SpeechData = Speech & {
  country: Country & {
    delegates: Array<Delegate & { user: { name: string | null } }>;
  };
  delegate: Delegate | null;
};
type UpdateEventData =
  | { type: "full"; data: Array<SpeechData> }
  | { type: "new"; data: SpeechData }
  | { type: "update"; data: SpeechData };

const eventEmitter = new EventEmitter();

const sendUpdateEvent = (id: string, data: UpdateEventData) =>
  eventEmitter.emit(`update-${id}`, data);

export const speechesRouter = createTRPCRouter({
  getSpeeches: protectedProcedure.query(
    async ({ ctx: { session, prisma } }): Promise<Array<SpeechData>> => {
      const speeches = await prisma.speech.findMany({
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
        include: {
          country: {
            include: {
              delegates: { include: { user: { select: { name: true } } } },
            },
          },
          delegate: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return speeches;
    }
  ),
  onSpeechesUpdate: protectedProcedure.subscription(
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
  createSpeech: protectedProcedure
    .input(
      z.object({
        committeeId: z.string().cuid(),
        countryId: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx: { prisma }, input }) => {
      const result = await prisma.speech.create({
        data: input,
        include: {
          country: {
            include: {
              delegates: { include: { user: { select: { name: true } } } },
            },
          },
          delegate: true,
        },
      });

      sendUpdateEvent(input.committeeId, { type: "new", data: result });
      return result;
    }),
  updateSpeech: protectedProcedure
    .input(
      z
        .object({
          countryId: z.string().cuid(),
          delegateId: z.string().cuid().nullable(),
          length: z.number().min(0),
          rating: z.number().min(0).max(10),
          comments: z.string(),
        })
        .partial()
        .and(z.object({ id: z.string().cuid() }))
    )
    .mutation(async ({ ctx: { prisma }, input }) => {
      const result = await prisma.speech.update({
        where: { id: input.id },
        include: {
          country: {
            include: {
              delegates: { include: { user: { select: { name: true } } } },
            },
          },
          delegate: true,
        },
        data: input,
      });

      sendUpdateEvent(result.committeeId, { type: "update", data: result });
      return result;
    }),
  clearSpeeches: protectedProcedure.mutation(
    async ({ ctx: { prisma, session } }) => {
      const userCommittee = await prisma.committee.findFirstOrThrow({
        where: { chairs: { some: { userId: session.user.id } } },
      });
      await prisma.speech.deleteMany({
        where: {
          committeeId: userCommittee.id,
        },
      });
      sendUpdateEvent(userCommittee.id, { type: "full", data: [] });
    }
  ),
  getChairSpeechesTableData: protectedProcedure.query(
    async ({ ctx: { prisma, session } }) => {
      const userCommittee = await prisma.committee.findFirstOrThrow({
        where: { chairs: { some: { userId: session.user.id } } },
      });
      const countries = await prisma.country.findMany({
        include: { delegates: { include: { user: true } }, speeches: true },
        where: { committeeId: userCommittee.id },
      });

      return countries;
    }
  ),
});
