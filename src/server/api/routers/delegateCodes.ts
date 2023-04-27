import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const delegateCodeRouter = createTRPCRouter({
  linkCode: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx: { session, prisma }, input }) => {
      const delegateCode = await prisma.delegateCode.findUnique({
        where: {
          code: input,
        },
      });
      if (!delegateCode) throw new Error("No code");
      await prisma.delegate.create({
        data: {
          countryId: delegateCode.countryId,
          name: delegateCode.name,
          userId: session.user.id,
        },
      });
      await prisma.delegateCode.delete({ where: { code: input } });
      return;
    }),
});
