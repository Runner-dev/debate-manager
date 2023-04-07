import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { NextPage } from "next";
import { useState } from "react";
import CountryFlagName from "~/components/CountryFlagName";
import { api } from "~/utils/api";
import { motionNames, TypedMotion } from "~/utils/motion";

const MotionsPage: NextPage = () => {
  const { data: motions } = api.motions.getMotions.useQuery();
  const { data: userData } = api.userData.getUserData.useQuery();

  const utils = useQueryClient();
  const queryKey = getQueryKey(api.motions.getMotions, undefined, "query");

  api.motions.onMotionsUpdate.useSubscription(undefined, {
    onData({ type, data }) {
      switch (type) {
        case "full": {
          utils.setQueryData(queryKey, data);
          break;
        }
        case "new": {
          utils.setQueryData(
            queryKey,
            (oldData: Array<TypedMotion> | undefined) => {
              if (oldData === undefined) return oldData;
              const newData = [...oldData, data];
              return newData;
            }
          );
          break;
        }
      }
    },
  });

  const [motionIndex, setMotionIndex] = useState(0);

  if (!motions || !userData) return <div>Loading...</div>;

  const focusedMotion = motions[motionIndex];

  return (
    <main className="grid grid-cols-3 gap-8 p-8">
      <div className="rounded-xl bg-gray-100 p-4 shadow-sm">
        <h2 className="mb-4 text-3xl font-medium">Moções</h2>
        <ul>
          {motions.map(({ country, id, type }, i) => (
            <li
              key={id}
              className="w-full cursor-pointer rounded bg-white p-2 shadow transition hover:shadow-lg"
              onClick={() => setMotionIndex(i)}
            >
              <div className="mb-2 text-2xl">{motionNames[type]}</div>
              <div className="px-2">
                <CountryFlagName inverted small country={country} />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl bg-gray-100 p-4 shadow-sm">
        {!focusedMotion && "Nenhuma moção selecionada"}
      </div>
    </main>
  );
};

export default MotionsPage;
