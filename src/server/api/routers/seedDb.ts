import { dbSeedSchema } from "~/utils/dbSeed";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const seedDbRouter = createTRPCRouter({
  seed: protectedProcedure
    .input(dbSeedSchema)
    .mutation(async ({ ctx: { prisma }, input }) => {
      await Promise.all(
        input.committees.map(({ name, countries }) =>
          prisma.committee.create({
            data: {
              name,
              currentMode: "gsl",
              gslData: {
                create: {
                  speechTotalTime: 60,
                  speechLastValue: 60,
                  acceptingSignups: false,
                },
              },
              countries: {
                create: countries.map((country) => ({
                  shortName: country.shortName ?? country.name,
                  name: country.name,
                  flag: country.flag,
                  roll: "a",
                  delegateCodes: {
                    create: country.delegates,
                  },
                })),
              },
            },
          })
        )
      );
      return;
    }),
});
