import type {
  Committee,
  Country,
  GslData,
  ListParticipants,
  PrismaClient,
  ModeratedData,
  RaisedHands,
  UnmoderatedData,
  SingleSpeakerData,
  VotingData,
  Vote,
} from "@prisma/client";
import { observable } from "@trpc/server/observable";
import EventEmitter from "eventemitter3";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import calculateCurrentTimerValue from "~/utils/calculateCurrentTimerValue";
import { speechesRouter } from "./speeches";

const eventEmitter = new EventEmitter();

export type CommitteeData = {
  name: string;
  agenda: string | null;
  countries: Country[];
} & (
  | {
      currentMode: "gsl";
      speechTotalTime: number;
      speechLastValue: number;
      speechPlayedAt: Date | null;
      currentSpeaker: Country | null;
      acceptingSignups: boolean;
      listParticipants: Array<ListParticipants & { country: Country }>;
    }
  | {
      currentMode: "mod";
      speechTotalTime: number;
      speechLastValue: number;
      speechPlayedAt: Date | null;
      lastValue: number;
      totalTime: number;
      playedAt: Date | null;
      currentSpeaker: Country | null;
      acceptingHands: boolean;
      raisedHands: Array<RaisedHands & { country: Country }>;
      topic: string | null;
    }
  | {
      currentMode: "unmod";
      lastValue: number;
      totalTime: number;
      playedAt: Date | null;
      topic: string | null;
    }
  | {
      currentMode: "single";
      speechTotalTime: number;
      speechLastValue: number;
      speechPlayedAt: Date | null;
      currentSpeaker: Country | null;
    }
  | {
      currentMode: "voting";
      type: "procedural" | "substantial";
      topic: string;
      currentCountryIndex: number;
      votes: Array<Vote & { country: Country }>;
      openToDelegateVotes: boolean;
    }
);

type PartialCommitteData = Partial<CommitteeData>;
type UpdateEventData =
  | { type: "full"; data: CommitteeData }
  | { type: "partial"; data: PartialCommitteData };

const sendUpdateEvent = (id: string, data: UpdateEventData) =>
  eventEmitter.emit(`update-${id}`, data);

const getUserCommmittee = async (
  prisma: PrismaClient,
  userId: string
): Promise<Committee> => {
  const userCommittee = await prisma.committee.findFirst({
    where: {
      OR: [
        { countries: { some: { delegates: { some: { userId } } } } },
        { chairs: { some: { userId } } },
      ],
    },
  });
  if (!userCommittee) throw new Error("No committee");
  return userCommittee;
};

const getGslUserCommittee = async (
  prisma: PrismaClient,
  userId: string
): Promise<Committee & { gslData: GslData }> => {
  const userCommittee = await prisma.committee.findFirst({
    include: {
      gslData: true,
    },
    where: {
      OR: [
        {
          countries: {
            some: { delegates: { some: { userId: userId } } },
          },
        },
        { chairs: { some: { userId: userId } } },
      ],
    },
  });

  if (!userCommittee) throw new Error("Not gsl");
  if (userCommittee.currentMode !== "gsl") throw new Error("Not gsl");
  if (userCommittee.gslData === null) throw new Error("Not gsl");

  return userCommittee as Committee & { gslData: GslData };
};

const getModUserCommittee = async (prisma: PrismaClient, userId: string) => {
  const userCommittee = await prisma.committee.findFirst({
    include: {
      moderatedData: true,
    },
    where: {
      OR: [
        {
          countries: {
            some: { delegates: { some: { userId: userId } } },
          },
        },
        { chairs: { some: { userId: userId } } },
      ],
    },
  });

  if (!userCommittee) throw new Error("Not gsl");
  if (userCommittee.currentMode !== "mod") throw new Error("Not mod");
  if (userCommittee.moderatedData === null) throw new Error("Not mod");

  return userCommittee as Committee & { moderatedData: ModeratedData };
};

const getUnmodUserCommittee = async (prisma: PrismaClient, userId: string) => {
  const userCommittee = await prisma.committee.findFirst({
    include: {
      unmoderatedData: true,
    },
    where: {
      OR: [
        {
          countries: {
            some: { delegates: { some: { userId: userId } } },
          },
        },
        { chairs: { some: { userId: userId } } },
      ],
    },
  });

  if (!userCommittee) throw new Error("Not gsl");
  if (userCommittee.currentMode !== "unmod") throw new Error("Not unmod");
  if (userCommittee.unmoderatedData === null) throw new Error("Not unmod");

  return userCommittee as Committee & { unmoderatedData: UnmoderatedData };
};
const getSingleSpeakerUserCommittee = async (
  prisma: PrismaClient,
  userId: string
) => {
  const userCommittee = await prisma.committee.findFirst({
    include: {
      singleSpeakerData: true,
    },
    where: {
      OR: [
        {
          countries: {
            some: { delegates: { some: { userId: userId } } },
          },
        },
        { chairs: { some: { userId: userId } } },
      ],
    },
  });

  if (!userCommittee) throw new Error("Not gsl");
  if (userCommittee.currentMode !== "single") throw new Error("Not single");
  if (userCommittee.singleSpeakerData === null) throw new Error("Not single");

  return userCommittee as Committee & { singleSpeakerData: SingleSpeakerData };
};

const getVotingUserCommittee = async (prisma: PrismaClient, userId: string) => {
  const userCommittee = await prisma.committee.findFirst({
    include: {
      votingData: true,
    },
    where: {
      OR: [
        {
          countries: {
            some: { delegates: { some: { userId: userId } } },
          },
        },
        { chairs: { some: { userId: userId } } },
      ],
    },
  });

  if (!userCommittee) throw new Error("Not gsl");
  if (userCommittee.currentMode !== "voting") throw new Error("Not voting");
  if (userCommittee.votingData === null) throw new Error("Not voting");

  return userCommittee as Committee & { votingData: VotingData };
};

export const committeeDataRouter = createTRPCRouter({
  getCommitteeData: protectedProcedure.query(
    async ({ ctx: { session, prisma } }): Promise<CommitteeData> => {
      const user = session.user;
      const userCommittee = await prisma.committee.findFirst({
        where: {
          OR: [
            { chairs: { some: { userId: user.id } } },
            {
              countries: { some: { delegates: { some: { userId: user.id } } } },
            },
          ],
        },
        include: {
          countries: {orderBy: {shortName: "asc"}},
          gslData: {
            include: {
              listParticipants: {
                orderBy: { createdAt: "asc" },
                include: { country: true },
              },
              currentSpeaker: true,
            },
          },
          moderatedData: {
            include: {
              raisedHands: { include: { country: true } },
              currentSpeaker: true,
            },
          },
          unmoderatedData: true,
          singleSpeakerData: {
            include: {
              currentSpeaker: true,
            },
          },
          votingData: {
            include: {
              votes: { include: { country: true } },
            },
          },
        },
      });

      if (!userCommittee) throw new Error("User not in committee");

      const base = {
        name: userCommittee.name,
        agenda: userCommittee.agenda,
        countries: userCommittee.countries,
      };

      switch (userCommittee.currentMode) {
        case "gsl": {
          if (!userCommittee.gslData) throw new Error("Mode data mismatch");
          const {
            speechTotalTime,
            speechLastValue,
            speechPlayedAt,
            currentSpeaker,
            acceptingSignups,
            listParticipants,
          } = userCommittee.gslData;

          return {
            ...base,
            currentMode: "gsl" as const,
            speechTotalTime,
            speechLastValue,
            speechPlayedAt,
            currentSpeaker,
            acceptingSignups,
            listParticipants,
          };
        }
        case "mod": {
          if (!userCommittee.moderatedData)
            throw new Error("Mode data mismatch");
          const {
            speechTotalTime,
            speechLastValue,
            speechPlayedAt,
            totalTime,
            lastValue,
            playedAt,
            currentSpeaker,
            raisedHands,
            acceptingHands,
            topic,
          } = userCommittee.moderatedData;
          return {
            ...base,
            currentMode: "mod" as const,
            speechTotalTime,
            speechLastValue,
            speechPlayedAt,
            totalTime,
            lastValue,
            playedAt,
            currentSpeaker,
            raisedHands,
            acceptingHands,
            topic,
          };
        }
        case "unmod": {
          if (!userCommittee.unmoderatedData)
            throw new Error("mode data mismatch");
          const { topic, totalTime, lastValue, playedAt } =
            userCommittee.unmoderatedData;
          return {
            ...base,
            currentMode: "unmod" as const,
            topic,
            totalTime,
            lastValue,
            playedAt,
          };
        }
        case "single": {
          if (!userCommittee.singleSpeakerData)
            throw new Error("Mode data mismatch");
          const {
            speechTotalTime,
            speechPlayedAt,
            speechLastValue,
            currentSpeaker,
          } = userCommittee.singleSpeakerData;
          return {
            ...base,
            currentMode: "single" as const,
            speechLastValue,
            speechTotalTime,
            speechPlayedAt,
            currentSpeaker,
          };
        }
        case "voting": {
          if (!userCommittee.votingData) throw new Error("Mode data mismatch");
          const {
            type,
            topic,
            votes,
            currentCountryIndex,
            openToDelegateVotes,
          } = userCommittee.votingData;
          const returnValue = {
            currentMode: "voting" as const,
            type,
            topic,
            currentCountryIndex,
            openToDelegateVotes,
          };
          const schema = z.object({
            currentMode: z.literal("voting"),
            type: z.enum(["procedural", "substantial"]),
            topic: z.string(),
            currentCountryIndex: z.number(),
            openToDelegateVotes: z.boolean(),
          });
          return { ...base, ...schema.parse(returnValue), votes };
        }
        default:
          throw new Error("Debate mode not matching");
      }
    }
  ),
  changeDebateMode: protectedProcedure
    .input(z.enum(["gsl", "mod", "unmod", "single", "voting"]))
    .mutation(async ({ ctx: { session, prisma }, input }) => {
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

      switch (input) {
        case "gsl": {
          const gslData = await prisma.gslData.findFirst({
            where: { committeeId: userCommittee.id },
          });
          if (!gslData)
            await prisma.gslData.create({
              data: {
                committeeId: userCommittee.id,
                speechTotalTime: 60,
                speechLastValue: 60,
                acceptingSignups: false,
              },
            });
          await prisma.committee.update({
            data: {
              currentMode: "gsl",
            },
            where: {
              id: userCommittee.id,
            },
          });

          const caller = committeeDataRouter.createCaller({ session, prisma });
          const debateModeData = await caller.getCommitteeData();

          sendUpdateEvent(userCommittee.id, {
            type: "full",
            data: debateModeData,
          });
          break;
        }
        case "mod": {
          const modData = await prisma.moderatedData.findFirst({
            where: { committeeId: userCommittee.id },
          });
          if (!modData)
            await prisma.moderatedData.create({
              data: {
                committeeId: userCommittee.id,
                speechTotalTime: 60,
                speechLastValue: 60,
                totalTime: 600,
                lastValue: 600,
                topic: "Tópico não definido",
                acceptingHands: false,
              },
            });
          await prisma.committee.update({
            data: {
              currentMode: "mod",
            },
            where: {
              id: userCommittee.id,
            },
          });

          const caller = committeeDataRouter.createCaller({ session, prisma });
          const debateModeData = await caller.getCommitteeData();

          sendUpdateEvent(userCommittee.id, {
            type: "full",
            data: debateModeData,
          });
          break;
        }
        case "unmod": {
          const unModData = await prisma.unmoderatedData.findFirst({
            where: { committeeId: userCommittee.id },
          });
          if (!unModData)
            await prisma.unmoderatedData.create({
              data: {
                committeeId: userCommittee.id,
                totalTime: 600,
                lastValue: 600,
                topic: "",
              },
            });

          await prisma.committee.update({
            where: { id: userCommittee.id },
            data: { currentMode: "unmod" },
          });
          const caller = committeeDataRouter.createCaller({ session, prisma });
          const debateModeData = await caller.getCommitteeData();

          sendUpdateEvent(userCommittee.id, {
            type: "full",
            data: debateModeData,
          });
          break;
        }
        case "single": {
          const singleSpeakerData = await prisma.singleSpeakerData.findFirst({
            where: { committeeId: userCommittee.id },
          });

          if (!singleSpeakerData)
            await prisma.singleSpeakerData.create({
              data: {
                committeeId: userCommittee.id,
                speechTotalTime: 60,
                speechLastValue: 60,
                speakerId: null,
              },
            });

          await prisma.committee.update({
            where: { id: userCommittee.id },
            data: { currentMode: "single" },
          });
          const caller = committeeDataRouter.createCaller({ session, prisma });
          const debateModeData = await caller.getCommitteeData();

          sendUpdateEvent(userCommittee.id, {
            type: "full",
            data: debateModeData,
          });
          break;
        }
        case "voting": {
          const votingData = await prisma.votingData.findFirst({
            where: { committeeId: userCommittee.id },
          });
          if (!votingData)
            await prisma.votingData.create({
              data: {
                committeeId: userCommittee.id,
                type: "procedural",
                topic: "",
              },
            });

          await prisma.committee.update({
            where: { id: userCommittee.id },
            data: { currentMode: "voting" },
          });
          const caller = committeeDataRouter.createCaller({ session, prisma });
          const debateModeData = await caller.getCommitteeData();

          sendUpdateEvent(userCommittee.id, {
            type: "full",
            data: debateModeData,
          });
          break;
        }
        default: {
          throw new Error("No match for committeeMode");
        }
      }

      const speechCaller = speechesRouter.createCaller({ session, prisma });
      // Cleanup old data if necessary
      switch (userCommittee.currentMode) {
        case "mod": {
          const modData = await prisma.moderatedData.findFirst({
            where: { committeeId: userCommittee.id },
          });
          modData?.speechId &&
            (await speechCaller.updateSpeech({
              id: modData.speechId,
              length:
                modData.speechTotalTime -
                calculateCurrentTimerValue({
                  playedAt: modData.speechPlayedAt,
                  lastValue: modData.speechLastValue,
                }),
            }));
          await prisma.moderatedData.delete({
            where: {
              committeeId: userCommittee.id,
            },
          });
          break;
        }
        case "unmod": {
          await prisma.unmoderatedData.deleteMany({
            where: {
              committeeId: userCommittee.id,
            },
          });
          break;
        }
        case "single": {
          const singleData = await prisma.singleSpeakerData.findFirst({
            where: { committeeId: userCommittee.id },
          });
          singleData?.speechId &&
            (await speechCaller.updateSpeech({
              id: singleData.speechId,
              length:
                singleData.speechTotalTime -
                calculateCurrentTimerValue({
                  playedAt: singleData.speechPlayedAt,
                  lastValue: singleData.speechLastValue,
                }),
            }));
          await prisma.singleSpeakerData.deleteMany({
            where: {
              committeeId: userCommittee.id,
            },
          });
          break;
        }
        case "voting": {
          await prisma.votingData.deleteMany({
            where: { committeeId: userCommittee.id },
          });
          break;
        }
      }
    }),
  onDebateModeUpdate: protectedProcedure.subscription(
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
  updateCommitteeData: protectedProcedure
    .input(z.object({ agenda: z.string(), name: z.string() }).partial())
    .query(async ({ ctx: { session, prisma }, input }) => {
      const userCommittee = await getGslUserCommittee(prisma, session.user.id);

      await prisma.committee.update({
        data: input,
        where: { id: userCommittee.id },
      });

      eventEmitter.emit(`update-${userCommittee.id}`, {
        id: userCommittee.id,
        ...input,
      });
    }),
  updateGslData: protectedProcedure
    .input(
      z
        .object({
          speechTotalTime: z.number(),
          speechLastValue: z.number(),
          speechPlayedAt: z.date().nullable(),
          acceptingSignups: z.boolean(),
        })
        .partial()
    )
    .mutation(async ({ ctx: { session, prisma }, input }) => {
      const userCommittee = await getGslUserCommittee(prisma, session.user.id);

      await prisma.gslData.update({
        where: {
          committeeId: userCommittee.id,
        },
        data: input,
      });
      sendUpdateEvent(userCommittee.id, { type: "partial", data: input });
    }),
  updateModData: protectedProcedure
    .input(
      z
        .object({
          speechTotalTime: z.number(),
          speechLastValue: z.number(),
          speechPlayedAt: z.date().nullable(),
          totalTime: z.number(),
          lastValue: z.number(),
          playedAt: z.date().nullable(),
          acceptingHands: z.boolean(),
          topic: z.string(),
        })
        .partial()
    )
    .mutation(async ({ ctx: { session, prisma }, input }) => {
      const userCommittee = await getModUserCommittee(prisma, session.user.id);

      await prisma.moderatedData.update({
        where: {
          committeeId: userCommittee.id,
        },
        data: input,
      });

      sendUpdateEvent(userCommittee.id, { type: "partial", data: input });
    }),
  updateUnmodData: protectedProcedure
    .input(
      z
        .object({
          totalTime: z.number(),
          lastValue: z.number(),
          playedAt: z.date().nullable(),
          topic: z.string(),
        })
        .partial()
    )
    .mutation(async ({ ctx: { session, prisma }, input }) => {
      const userCommittee = await getUnmodUserCommittee(
        prisma,
        session.user.id
      );

      await prisma.unmoderatedData.update({
        where: {
          committeeId: userCommittee.id,
        },
        data: input,
      });

      sendUpdateEvent(userCommittee.id, { type: "partial", data: input });
    }),
  updateSingleSpeakerData: protectedProcedure
    .input(
      z
        .object({
          speechTotalTime: z.number(),
          speechLastValue: z.number(),
          speechPlayedAt: z.date().nullable(),
        })
        .partial()
    )
    .mutation(async ({ ctx: { session, prisma }, input }) => {
      const userCommittee = await getSingleSpeakerUserCommittee(
        prisma,
        session.user.id
      );

      await prisma.singleSpeakerData.update({
        where: {
          committeeId: userCommittee.id,
        },
        data: input,
      });

      sendUpdateEvent(userCommittee.id, { type: "partial", data: input });
    }),
  updateVotingData: protectedProcedure
    .input(
      z
        .object({
          type: z.enum(["procedural", "substantial"]),
          topic: z.string(),
          currentCountryIndex: z.number(),
          openToDelegateVotes: z.boolean(),
        })
        .partial()
    )
    .mutation(async ({ ctx: { session, prisma }, input }) => {
      const userCommittee = await getVotingUserCommittee(
        prisma,
        session.user.id
      );

      await prisma.votingData.update({
        where: {
          committeeId: userCommittee.id,
        },
        data: input,
      });

      sendUpdateEvent(userCommittee.id, { type: "partial", data: input });
    }),
  addGslListParticipant: protectedProcedure
    .input(z.string().cuid())
    .mutation(async ({ ctx: { session, prisma }, input }) => {
      const userCommittee = await getGslUserCommittee(prisma, session.user.id);

      await prisma.listParticipants.create({
        data: {
          gslDataId: userCommittee.gslData.id,
          countryId: input,
        },
      });

      const allParticipants = await prisma.listParticipants.findMany({
        where: { gslDataId: userCommittee.gslData.id },
        orderBy: { createdAt: "asc" },
        include: { country: true },
      });

      sendUpdateEvent(userCommittee.id, {
        type: "partial",
        data: {
          listParticipants: allParticipants,
        },
      });
    }),
  removeGslListParticipant: protectedProcedure
    .input(z.string().cuid())
    .mutation(async ({ ctx: { session, prisma }, input }) => {
      const userCommittee = await getGslUserCommittee(prisma, session.user.id);

      await prisma.listParticipants.delete({ where: { countryId: input } });

      const allParticipants = await prisma.listParticipants.findMany({
        where: { gslDataId: userCommittee.gslData.id },
        orderBy: { createdAt: "asc" },
        include: { country: true },
      });

      sendUpdateEvent(userCommittee.id, {
        type: "partial",
        data: {
          listParticipants: allParticipants,
        },
      });
    }),
  yieldTime: protectedProcedure
    .input(z.string().cuid())
    .mutation(async ({ ctx: { prisma, session }, input }) => {
      const userCommittee = await getUserCommmittee(prisma, session.user.id);
      const speechCaller = speechesRouter.createCaller({ session, prisma });

      if (userCommittee.currentMode === "gsl") {
        const gslData = await prisma.gslData.findFirst({
          where: { committeeId: userCommittee.id },
        });
        if (!gslData) return;
        if (gslData?.speechId) {
          await speechCaller.updateSpeech({
            id: gslData.speechId,
            length:
              gslData.speechTotalTime -
              calculateCurrentTimerValue({
                playedAt: gslData.speechPlayedAt,
                lastValue: gslData.speechLastValue,
              }),
          });
        }

        const speech = await speechCaller.createSpeech({
          committeeId: userCommittee.id,
          countryId: input,
        });

        const result = await prisma.gslData.update({
          where: { committeeId: userCommittee.id },
          data: { speakerId: input, speechId: speech.id },
          select: { speakerId: true, currentSpeaker: true },
        });

        sendUpdateEvent(userCommittee.id, {
          type: "partial",
          data: result,
        });
      } else if (userCommittee.currentMode === "mod") {
        const modData = await prisma.moderatedData.findFirst({
          where: { committeeId: userCommittee.id },
        });
        if (!modData) return;
        if (modData?.speechId) {
          await speechCaller.updateSpeech({
            id: modData.speechId,
            length:
              modData.speechTotalTime -
              calculateCurrentTimerValue({
                playedAt: modData.speechPlayedAt,
                lastValue: modData.speechLastValue,
              }),
          });
        }

        const speech = await speechCaller.createSpeech({
          committeeId: userCommittee.id,
          countryId: input,
        });
        const result = await prisma.moderatedData.update({
          where: { committeeId: userCommittee.id },
          data: { speakerId: input, speechId: speech.id },
          select: { speakerId: true, currentSpeaker: true },
        });

        sendUpdateEvent(userCommittee.id, {
          type: "partial",
          data: result,
        });
      }
    }),

  nextSpeaker: protectedProcedure.mutation(
    async ({ ctx: { prisma, session } }) => {
      const speechCaller = speechesRouter.createCaller({ session, prisma });
      const userCommittee = await getGslUserCommittee(prisma, session.user.id);

      const currentListParticipants = await prisma.listParticipants.findMany({
        where: { gslDataId: userCommittee.gslData.id },
        include: { country: true },
        orderBy: { createdAt: "asc" },
      });

      const [first, ...rest] = currentListParticipants;

      if (!first) {
        await prisma.gslData.update({
          where: {
            id: userCommittee.gslData.id,
          },
          data: {
            speakerId: null,
            speechLastValue: userCommittee.gslData.speechTotalTime,
            speechPlayedAt: null,
          },
        });
        if (userCommittee.gslData.speechId)
          await speechCaller.updateSpeech({
            id: userCommittee.gslData.speechId,
            length:
              userCommittee.gslData.speechTotalTime -
              calculateCurrentTimerValue({
                lastValue: userCommittee.gslData.speechLastValue,
                playedAt: userCommittee.gslData.speechPlayedAt,
              }),
          });
        sendUpdateEvent(userCommittee.id, {
          type: "partial",
          data: {
            currentSpeaker: null,
            speechLastValue: userCommittee.gslData.speechTotalTime,
            speechPlayedAt: null,
          },
        });

        return;
      }
      const newSpeech = await speechCaller.createSpeech({
        committeeId: userCommittee.id,
        countryId: first.countryId,
      });

      await (userCommittee.gslData.speechId &&
        speechCaller.updateSpeech({
          id: userCommittee.gslData.speechId,
          length:
            userCommittee.gslData.speechTotalTime -
            calculateCurrentTimerValue({
              lastValue: userCommittee.gslData.speechLastValue,
              playedAt: userCommittee.gslData.speechPlayedAt,
            }),
        }));
      await prisma.listParticipants.delete({ where: { id: first.id } });
      await prisma.gslData.update({
        where: { id: userCommittee.gslData.id },
        data: {
          speakerId: first.countryId,
          speechLastValue: userCommittee.gslData.speechTotalTime,
          speechPlayedAt: null,
          speechId: newSpeech.id,
        },
      });

      sendUpdateEvent(userCommittee.id, {
        type: "partial",
        data: {
          listParticipants: rest,
          currentSpeaker: first.country,
          speechLastValue: userCommittee.gslData.speechTotalTime,
          speechPlayedAt: null,
        },
      });
    }
  ),
  raiseHand: protectedProcedure
    .input(z.string().cuid())
    .mutation(async ({ ctx: { session, prisma }, input }) => {
      const userCommittee = await getModUserCommittee(prisma, session.user.id);
      await prisma.raisedHands.create({
        data: {
          moderatedDataId: userCommittee.moderatedData.id,
          countryId: input,
        },
      });

      const allHands = await prisma.raisedHands.findMany({
        where: { moderatedDataId: userCommittee.moderatedData.id },
        include: { country: true },
      });

      sendUpdateEvent(userCommittee.id, {
        type: "partial",
        data: {
          raisedHands: allHands,
        },
      });
    }),
  lowerHand: protectedProcedure
    .input(z.string().cuid())
    .mutation(async ({ ctx: { session, prisma }, input }) => {
      const userCommittee = await getModUserCommittee(prisma, session.user.id);
      await prisma.raisedHands.deleteMany({
        where: {
          moderatedDataId: userCommittee.moderatedData.id,
          countryId: input,
        },
      });

      const allHands = await prisma.raisedHands.findMany({
        where: { moderatedDataId: userCommittee.moderatedData.id },
        include: { country: true },
      });

      sendUpdateEvent(userCommittee.id, {
        type: "partial",
        data: {
          raisedHands: allHands,
        },
      });
    }),
  setSpeaker: protectedProcedure
    .input(z.string().cuid())
    .mutation(async ({ ctx: { session, prisma }, input }) => {
      const userCommittee = await getUserCommmittee(prisma, session.user.id);
      const speechCaller = speechesRouter.createCaller({ session, prisma });

      switch (userCommittee.currentMode) {
        case "mod": {
          const userCommittee = await getModUserCommittee(
            prisma,
            session.user.id
          );
          userCommittee?.moderatedData.speechId &&
            (await speechCaller.updateSpeech({
              id: userCommittee.moderatedData.speechId,
              length:
                userCommittee.moderatedData.speechTotalTime -
                calculateCurrentTimerValue({
                  playedAt: userCommittee.moderatedData.speechPlayedAt,
                  lastValue: userCommittee.moderatedData.speechLastValue,
                }),
            }));

          const speech = await speechCaller.createSpeech({
            committeeId: userCommittee.id,
            countryId: input,
          });

          const result = await prisma.moderatedData.update({
            where: { committeeId: userCommittee.id },
            data: {
              speakerId: input,
              speechLastValue: userCommittee.moderatedData.speechLastValue,
              speechPlayedAt: null,
              speechId: speech.id,
            },
            select: {
              speakerId: true,
              currentSpeaker: true,
              speechPlayedAt: true,
              speechLastValue: true,
            },
          });

          sendUpdateEvent(userCommittee.id, {
            type: "partial",
            data: result,
          });
          break;
        }
        case "single": {
          const userCommittee = await getSingleSpeakerUserCommittee(
            prisma,
            session.user.id
          );

          userCommittee?.singleSpeakerData.speechId &&
            (await speechCaller.updateSpeech({
              id: userCommittee.singleSpeakerData.speechId,
              length:
                userCommittee.singleSpeakerData.speechTotalTime -
                calculateCurrentTimerValue({
                  playedAt: userCommittee.singleSpeakerData.speechPlayedAt,
                  lastValue: userCommittee.singleSpeakerData.speechLastValue,
                }),
            }));

          const speech = await speechCaller.createSpeech({
            committeeId: userCommittee.id,
            countryId: input,
          });

          const result = await prisma.singleSpeakerData.update({
            where: { committeeId: userCommittee.id },
            data: {
              speakerId: input,
              speechLastValue: userCommittee.singleSpeakerData.speechTotalTime,
              speechPlayedAt: null,
              speechId: speech.id,
            },
            select: {
              speakerId: true,
              currentSpeaker: true,
              speechPlayedAt: true,
              speechLastValue: true,
            },
          });

          sendUpdateEvent(userCommittee.id, {
            type: "partial",
            data: result,
          });
          break;
        }
      }
    }),
  clearVotes: protectedProcedure.mutation(
    async ({ ctx: { session, prisma } }) => {
      const userCommittee = await getVotingUserCommittee(
        prisma,
        session.user.id
      );

      await prisma.vote.deleteMany({
        where: { votingDataId: userCommittee.votingData.id },
      });

      sendUpdateEvent(userCommittee.id, {
        type: "partial",
        data: { votes: [] },
      });
    }
  ),
  vote: protectedProcedure
    .input(
      z.object({
        vote: z.enum(["for", "against", "abstain"]),
        countryId: z.string().cuid(),
      })
    )
    .mutation(
      async ({ ctx: { session, prisma }, input: { vote, countryId } }) => {
        const userCommittee = await getVotingUserCommittee(
          prisma,
          session.user.id
        );

        await prisma.vote.upsert({
          where: {
            votingDataId_countryId: {
              votingDataId: userCommittee.votingData.id,
              countryId,
            },
          },
          create: {
            vote,
            countryId,
            votingDataId: userCommittee.votingData.id,
          },
          update: { vote },
        });

        const { currentCountryIndex } = await prisma.votingData.update({
          where: {
            id: userCommittee.votingData.id,
          },
          data: {
            currentCountryIndex: { increment: 1 },
          },
          select: { currentCountryIndex: true },
        });

        const allVotes = await prisma.vote.findMany({
          where: { votingDataId: userCommittee.votingData.id },
          include: { country: true },
        });

        sendUpdateEvent(userCommittee.id, {
          type: "partial",
          data: { currentCountryIndex, votes: allVotes },
        });
      }
    ),
});
