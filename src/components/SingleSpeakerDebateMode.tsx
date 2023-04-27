import { type Country, type Delegate } from "@prisma/client";
import { useRef, useState } from "react";
import { z } from "zod";
import Pause from "~/icons/Pause";
import Play from "~/icons/Play";
import Reset from "~/icons/Reset";
import Settings from "~/icons/Settings";
import { type CommitteeData } from "~/server/api/routers/committeeData";
import { api } from "~/utils/api";
import calculateCurrentTimerValue from "~/utils/calculateCurrentTimerValue";
import CountryFlagName from "./CountryFlagName";
import Modal from "./Modal";
import Timer from "./Timer";

const buttonIconClass = "w-6 h-6";
const buttonBaseClass = "flex-1 flex justify-center text-white p-2 rounded-lg ";

const SingleSpeakerDebateMode = ({
  committeeData,
  chair,
}: {
  chair: boolean;
  committeeData: CommitteeData;
  delegate: (Delegate & { country: Country }) | undefined;
}) => {
  if (committeeData.currentMode !== "single")
    throw new Error("Modo não compatível");

  const updateModData = api.committeeData.updateSingleSpeakerData.useMutation();
  const setSpeaker = api.committeeData.setSpeaker.useMutation();
  const [updateSpeechTimeModalVisible, setUpdateSpeechTimeModalVisible] =
    useState(false);

  const updateSpeechTimeModal = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="grid h-full grid-cols-3 gap-4 items-start">
        <div
          className={` col-span-2 flex w-full flex-col items-stretch gap-4 rounded-lg bg-gray-200 p-4`}
        >
          <Timer
            totalTime={committeeData.speechTotalTime}
            lastValue={committeeData.speechLastValue}
            playedAt={committeeData.speechPlayedAt}
            buttons={({ playing }) =>
              chair && (
                <>
                  <button
                    className={
                      buttonBaseClass +
                      `${playing ? "bg-red-500" : "bg-emerald-500"}`
                    }
                    onClick={() => {
                      if (playing) {
                        updateModData.mutate({
                          speechLastValue: calculateCurrentTimerValue({
                            lastValue: committeeData.speechLastValue,
                            playedAt: committeeData.speechPlayedAt,
                          }),
                          speechPlayedAt: null,
                        });
                      } else {
                        updateModData.mutate({
                          speechPlayedAt: new Date(),
                        });
                      }
                    }}
                  >
                    {playing ? (
                      <Pause className={buttonIconClass} />
                    ) : (
                      <Play className={buttonIconClass} />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      updateModData.mutate({
                        speechLastValue: committeeData.speechTotalTime,
                        speechPlayedAt: null,
                      });
                    }}
                    className={buttonBaseClass + "bg-yellow-500"}
                  >
                    <Reset className={buttonIconClass} />
                  </button>
                  <button
                    onClick={() => setUpdateSpeechTimeModalVisible(true)}
                    className={buttonBaseClass + "bg-gray-400"}
                  >
                    <Settings className={buttonIconClass} />
                  </button>
                </>
              )
            }
          />
          <div>
            <div>
              <div className="mb-2 flex justify-between">
                <h2 className="text-2xl font-medium">Orador:</h2>
              </div>
              <div className="ml-2">
                {committeeData.currentSpeaker ? (
                  <CountryFlagName country={committeeData.currentSpeaker} />
                ) : (
                  <div className="text-lg italic">Sem Orador</div>
                )}
              </div>
            </div>
          </div>
        </div>
        {chair && (
          <div className="h-full rounded-lg bg-gray-100 p-4">
            <h2 className="mb-2 mt-4 text-2xl font-medium">Delegações</h2>
            {committeeData.countries.length == 0 && !chair && (
              <div className="text-lg italic">Nenhuma mão levantada</div>
            )}
            <div className="max-h-[70vh] overflow-y-auto flex flex-col gap-1">
            {committeeData.countries.map((country) => (
              <div
                key={country.id}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <button
                  disabled={!chair}
                  className={`w-full rounded-md p-2 transition ${
                    chair ? "hover:bg-gray-300" : ""
                  }`}
                  onClick={() => {
                    if (!chair) return;
                    setSpeaker.mutate(country.id);
                  }}
                >
                  <CountryFlagName country={country} />
                </button>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
      <Modal
        visible={updateSpeechTimeModalVisible}
        onRequestClose={() => setUpdateSpeechTimeModalVisible(false)}
        className="flex flex-col gap-4"
      >
        <h1 className="mb-4 text-3xl font-medium">Atualizar Tempo de Fala</h1>
        <input
          ref={updateSpeechTimeModal}
          className="rounded-md px-4 py-2"
          type="number"
          placeholder="Segundos"
          defaultValue={committeeData.speechTotalTime}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setUpdateSpeechTimeModalVisible(false)}
            className="flex-1 rounded-md bg-red-200 p-2"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!updateSpeechTimeModal.current) return;
              const valueType = z.number().min(0).max(1000);
              const value = valueType.parse(
                parseInt(updateSpeechTimeModal.current.value)
              );
              updateModData.mutate({
                speechTotalTime: value,
              });
              setUpdateSpeechTimeModalVisible(false);
            }}
            className="flex-1 rounded-md bg-emerald-400 p-2"
          >
            Atualizar Tempo
          </button>
        </div>
      </Modal>
    </>
  );
};

export default SingleSpeakerDebateMode;
