import { createTRPCRouter, protectedProcedure } from "../trpc";

export const statsRouter = createTRPCRouter({
  getUserStats: protectedProcedure.query(
    async ({ ctx: { prisma, session } }) => {
      const userData = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { delegate: true },
      });

      if (!userData || !userData.delegate) return;

      const speechByDelegate = await prisma.speech.groupBy({
        by: ["delegateId"],
        where: { countryId: userData.delegate.countryId },
        _sum: { length: true },
      });

      const countryData = speechByDelegate.reduce<number>(
        (prev, speech) => prev + (speech._sum.length ?? 0),
        0
      );
      const delegateData =
        speechByDelegate.find(
          (speech) => speech.delegateId === userData.delegate?.id
        )?._sum.length ?? 0;

      return { country: countryData, delegate: delegateData };
    }
  ),
});
