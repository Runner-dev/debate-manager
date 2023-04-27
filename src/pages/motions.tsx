import { type Country } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { type NextPage } from "next";
import { useState } from "react";
import CountryFlagName from "~/components/CountryFlagName";
import MotionInFocus from "~/components/MotionInFocus";
import NewMotionModal from "~/components/NewMotionModal";
import { api } from "~/utils/api";
import { motionNames, type TypedMotion } from "~/utils/motion";

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
        case "update": {
          utils.setQueryData(
            queryKey,
            (oldData: Array<TypedMotion> | undefined) => {
              if (oldData === undefined) return oldData;
              const newData = oldData.map((motion) => {
                if (motion.id !== data.id) return motion;
                return data;
              });
              return newData;
            }
          );
        }
        case "delete": {
          utils.setQueryData(
            queryKey,
            (oldData: Array<TypedMotion> | undefined) => {
              if (oldData === undefined) return oldData;
              const newData = oldData.filter((motion) => motion.id !== data);
              return newData;
            }
          );
        }
      }
    },
  });

  const [newMotionModalVisible, setNewMotionModalVisible] = useState(false);
  const onRequestClose = () => setNewMotionModalVisible(false);

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
              <div className="mb-2 text-xl">{motionNames[type]}</div>
              {country && (
                <div className="px-2">
                  <CountryFlagName
                    inverted
                    small
                    country={country as Country}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
        <button
          className="mt-4 w-full rounded-md bg-green-600 p-2 text-white"
          onClick={() => setNewMotionModalVisible(true)}
        >
          Nova Moção
        </button>
      </div>
      <div className="col-span-2 rounded-xl bg-gray-100 p-4 shadow-sm">
        {!focusedMotion && "Nenhuma moção selecionada"}
        {focusedMotion && (
          <MotionInFocus motion={focusedMotion} chair={!!userData.chair} />
        )}
      </div>
      <NewMotionModal
        visible={newMotionModalVisible}
        onRequestClose={onRequestClose}
      />
    </main>
  );
};

export default MotionsPage;
