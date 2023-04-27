import { createTRPCRouter } from "~/server/api/trpc";
import { committeeDataRouter } from "./routers/committeeData";
import { userDataRouter } from "./routers/userData";
import { motionsRouter } from "./routers/motions";
import { speechesRouter } from "./routers/speeches";
import { pointsRouter } from "./routers/points";
import { countriesRouter } from "./routers/countries";
import { delegateCodeRouter } from "./routers/delegateCodes";
import { documentsRouter } from "./routers/documents";
import { seedDbRouter } from "./routers/seedDb";
import { statsRouter } from "./routers/stats";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  committeeData: committeeDataRouter,
  userData: userDataRouter,
  motions: motionsRouter,
  speeches: speechesRouter,
  points: pointsRouter,
  countries: countriesRouter,
  delegateCode: delegateCodeRouter,
  documents: documentsRouter,
  seedDb: seedDbRouter,
  stats: statsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
