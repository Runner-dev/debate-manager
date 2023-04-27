import { type Country } from "@prisma/client";
import { observable } from "@trpc/server/observable";
import EventEmitter from "eventemitter3";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

type UpdateEventData =
  | { type: "full"; data: Array<Country> }
  | { type: "update"; data: Country };

const eventEmitter = new EventEmitter();

const sendUpdateEvent = (id: string, data: UpdateEventData) =>
  eventEmitter.emit(`update-${id}`, data);

export const countriesRouter = createTRPCRouter({
  getCountries: protectedProcedure.query(
    async ({ ctx: { session, prisma } }) => {
      const countries = await prisma.country.findMany({
        orderBy: { shortName: "asc" },
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
      });
      return countries;
    }
  ),
  onCountriesUpdate: protectedProcedure.subscription(
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
  getOwnCountry: protectedProcedure.query(
    async ({ ctx: { session, prisma } }) => {
      const countries = await prisma.country.findFirst({
        where: {
          delegates: { some: { userId: session.user.id } },
        },
      });
      return countries;
    }
  ),
  onOwnCountryUpdate: protectedProcedure.subscription(
    async ({ ctx: { session, prisma } }) => {
      const userCountry = await prisma.country.findFirst({
        where: {
          delegates: { some: { userId: session.user.id } },
        },
      });

      if (!userCountry) return;

      return observable<Country>((emit) => {
        const onUpdate = (data: UpdateEventData) => {
          switch (data.type) {
            case "full": {
              const country = data.data.filter(
                ({ id }) => id === userCountry.id
              )[0];
              if (!country) return;
              emit.next(country);
              break;
            }
            case "update": {
              if (data.data.id === userCountry.id) emit.next(data.data);
            }
          }
        };

        eventEmitter.on(`update-${userCountry.committeeId}`, onUpdate);

        return () => {
          eventEmitter.off(`update-${userCountry.committeeId}`, onUpdate);
        };
      });
    }
  ),
  updateCountry: protectedProcedure
    .input(z.object({ id: z.string().cuid(), roll: z.enum(["p", "pv", "a"]) }))
    .mutation(async ({ ctx: { prisma }, input }) => {
      const newCountry = await prisma.country.update({
        where: { id: input.id },
        data: input,
      });
      sendUpdateEvent(newCountry.committeeId, {
        type: "update",
        data: newCountry,
      });
    }),
});
