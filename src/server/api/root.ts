import { createTRPCRouter } from "~/server/api/trpc";
import { exampleRouter } from "~/server/api/routers/example";
import { committeeDataRouter } from "./routers/committeeData";
import { userDataRouter } from "./routers/userData";
import { motionsRouter } from "./routers/motions";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  committeeData: committeeDataRouter,
  userData: userDataRouter,
  motions: motionsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
