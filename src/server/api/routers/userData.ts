import { createTRPCRouter, protectedProcedure } from "../trpc";

export const userDataRouter = createTRPCRouter({
  getUserData: protectedProcedure.query(
    async ({ ctx: { session, prisma } }) => {
      const userData = prisma.user.findUnique({
        where: {
          id: session.user.id,
        },
        include: {
          chair: true,
          delegate: {
            include: {
              country: true,
            },
          },
        },
      });

      return userData;
    }
  ),
});
