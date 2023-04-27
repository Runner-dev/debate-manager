import { type Country, type Point } from "@prisma/client";
import { observable } from "@trpc/server/observable";
import EventEmitter from "eventemitter3";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

type PointData = Point & { country: Country };

type UpdateEventData =
  | { type: "full"; data: Array<PointData> }
  | { type: "new"; data: PointData }
  | { type: "update"; data: PointData }
  | { type: "delete"; data: string };

const eventEmitter = new EventEmitter();

const sendUpdateEvent = (id: string, data: UpdateEventData) =>
  eventEmitter.emit(`update-${id}`, data);

export const pointsRouter = createTRPCRouter({
  getPoints: protectedProcedure.query(
    async ({ ctx: { session, prisma } }): Promise<Array<PointData>> => {
      const points = await prisma.point.findMany({
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
      return points;
    }
  ),
  deletePoint: protectedProcedure
    .input(z.string().cuid())
    .mutation(async ({ ctx: { prisma }, input }) => {
      const point = await prisma.point.delete({
        where: { id: input },
        select: { committeeId: true },
      });
      sendUpdateEvent(point.committeeId, { type: "delete", data: input });
    }),
  createPoint: protectedProcedure
    .input(
      z.object({
        type: z.enum(["personalPrivilege", "information", "order", "response"]),
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
      const point = await prisma.point.create({
        data: {
          ...input,
          committeeId: committeeId,
          countryId: countryId,
        },
        include: { country: true },
      });

      sendUpdateEvent(point.committeeId, {
        type: "new",
        data: point,
      });
    }),
  onPointsUpdate: protectedProcedure.subscription(
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
