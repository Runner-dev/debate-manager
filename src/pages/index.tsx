import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryKey } from "@trpc/react-query";
import { type NextPage } from "next";
import GslDebateMode from "~/components/GslDebateMode";
import { api } from "~/utils/api";
import { type CommitteeData } from "~/server/api/routers/committeeData";
import ModeratedDebateMode from "~/components/ModeratedDebateMode";
import { z } from "zod";
import UnmoderatedDebateMode from "~/components/UnmoderatedDebateMode";
import SingleSpeakerDebateMode from "~/components/SingleSpeakerDebateMode";
import VotingDebateMode from "~/components/VotingDebateMode";
import { useQueryClient } from "@tanstack/react-query";
import isDev from "~/utils/isDev";

const Home: NextPage = () => {
  const { data: committeeData } = api.committeeData.getCommitteeData.useQuery();
  const { data: userData } = api.userData.getUserData.useQuery();
  const utils = useQueryClient();
  const queryKey = getQueryKey(
    api.committeeData.getCommitteeData,
    undefined,
    "query"
  );

  const changeDebateMode = api.committeeData.changeDebateMode.useMutation();

  api.committeeData.onDebateModeUpdate.useSubscription(undefined, {
    onData({ type, data }) {
      console.log(type);
      if (type === "partial") {
        utils.setQueryData(queryKey, (oldData: CommitteeData | undefined) => {
          if (!oldData) return undefined;
          const newData = { ...oldData };
          for (const key of Object.keys(newData)) {
            if (typeof data[key as keyof typeof data] !== "undefined") {
              //@ts-ignore
              newData[key as keyof typeof data] =
                data[key as keyof typeof data];
            }
          }

          console.log(newData);
          return newData as unknown as CommitteeData;
        });
      } else {
        utils.setQueryData(queryKey, data);
      }
    },
  });

  return (
    <main className="flex flex-col gap-4 px-8 py-4">
      <select
        className="self-end rounded-lg bg-gray-200 p-2"
        value={committeeData?.currentMode}
        disabled={!userData?.chair}
        onChange={(e) => {
          const schema = z.enum(["gsl", "mod", "unmod", "single", "voting"]);
          const s = schema.parse(e.target.value);
          if (!userData?.chair) return;
          if (s !== committeeData?.currentMode) changeDebateMode.mutate(s);
        }}
      >
        <option value="gsl">Lista de Oradores</option>
        <option value="mod">Debate Moderado</option>
        <option value="unmod">Debate Não Moderado</option>
        <option value="single">Orador Único</option>
        <option value="voting">Votação</option>
      </select>
      {committeeData?.currentMode == "gsl" && (
        <GslDebateMode
          delegate={userData?.delegate ?? undefined}
          chair={Boolean(userData?.chair)}
          committeeData={committeeData}
        />
      )}
      {committeeData?.currentMode == "mod" && (
        <ModeratedDebateMode
          delegate={userData?.delegate ?? undefined}
          chair={Boolean(userData?.chair)}
          committeeData={committeeData}
        />
      )}
      {committeeData?.currentMode == "unmod" && (
        <UnmoderatedDebateMode
          delegate={userData?.delegate ?? undefined}
          chair={Boolean(userData?.chair)}
          committeeData={committeeData}
        />
      )}
      {committeeData?.currentMode == "single" && (
        <SingleSpeakerDebateMode
          delegate={userData?.delegate ?? undefined}
          chair={Boolean(userData?.chair)}
          committeeData={committeeData}
        />
      )}
      {committeeData?.currentMode == "voting" && (
        <VotingDebateMode
          delegate={userData?.delegate ?? undefined}
          chair={Boolean(userData?.chair)}
          committeeData={committeeData}
        />
      )}
      {isDev() && <ReactQueryDevtools />}
    </main>
  );
};

export default Home;
