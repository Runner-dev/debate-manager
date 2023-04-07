import { observable } from "@trpc/server/observable";
import EventEmitter from "eventemitter3";
import { motionToTyped, TypedMotion } from "~/utils/motion";
import { createTRPCRouter, protectedProcedure } from "../trpc";

type UpdateEventData =
  | { type: "full"; data: Array<TypedMotion> }
  | { type: "new"; data: TypedMotion };

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
