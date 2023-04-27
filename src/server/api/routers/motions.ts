import { observable } from "@trpc/server/observable";
import EventEmitter from "eventemitter3";
import { z } from "zod";
import {
  baseMotionSchema,
  motionToTyped,
  type TypedMotion,
} from "~/utils/motion";
import { createTRPCRouter, protectedProcedure } from "../trpc";

type UpdateEventData =
  | { type: "full"; data: Array<TypedMotion> }
  | { type: "new"; data: TypedMotion }
  | { type: "update"; data: TypedMotion }
  | { type: "delete"; data: string };

const eventEmitter = new EventEmitter();

const sendUpdateEvent = (id: string, data: UpdateEventData) =>
  eventEmitter.emit(`update-${id}`, data);

export const motionsRouter = createTRPCRouter({
  getMotions: protectedProcedure.query(async ({ ctx: { session, prisma } }) => {
    const motions = await prisma.motion.findMany({
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
      include: { country: true },
    });
    const typedMotions = motions.map((motion) => motionToTyped(motion));
    return typedMotions;
  }),
  updateMotion: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx: { prisma }, input }) => {
      const motion = await prisma.motion.update({
        where: { id: input.id },
        data: input,
      });

      const typedMotion = motionToTyped(motion);
      sendUpdateEvent(motion.committeeId, {
        type: "update",
        data: typedMotion,
      });
    }),
  deleteMotion: protectedProcedure
    .input(z.string().cuid())
    .mutation(async ({ ctx: { prisma }, input }) => {
      const motion = await prisma.motion.delete({
        where: { id: input },
        select: { committeeId: true },
      });
      sendUpdateEvent(motion.committeeId, { type: "delete", data: input });
    }),
  createMotion: protectedProcedure
    .input(baseMotionSchema)
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
      const motion = await prisma.motion.create({
        data: {
          ...input,
          committee: { connect: { id: committeeId } },
          country: countryId ? { connect: { id: countryId } } : undefined,
        },
      });

      const typedMotion = motionToTyped(motion);
      sendUpdateEvent(motion.committeeId, {
        type: "new",
        data: typedMotion,
      });
    }),
  onMotionsUpdate: protectedProcedure.subscription(
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
});
