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
import DebouncedInput from "./DebouncedInput";
import Modal from "./Modal";
import Timer from "./Timer";

const buttonIconClass = "w-6 h-6";
const buttonBaseClass = "flex-1 flex justify-center text-white p-2 rounded-lg ";

const UnmoderatedDebateMode = ({
  committeeData,
  chair,
}: {
  chair: boolean;
  committeeData: CommitteeData;
  delegate: (Delegate & { country: Country }) | undefined;
}) => {
  if (committeeData.currentMode !== "unmod")
    throw new Error("Modo não compatível");

  const updateUnmodData = api.committeeData.updateUnmodData.useMutation();

  const [updateSpeechTimeModalVisible, setUpdateSpeechTimeModalVisible] =
    useState(false);

  const updateSpeechTimeModal = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="flex items-start justify-center py-8">
        <div
          className={` flex w-full max-w-3xl flex-col items-stretch gap-4 rounded-xl bg-gray-200 p-6`}
        >
          <div className="flex justify-between">
            <DebouncedInput
              readOnly={!chair}
              customValue={committeeData.topic ?? ""}
              placeholder={"Sem Tópico"}
              type="text"
              className="w-4/5 bg-transparent text-2xl font-medium text-black outline-none placeholder:text-black active:outline-none"
              customOnChange={(newValue) => {
                console.log("fired");
                updateUnmodData.mutate({ topic: newValue });
              }}
            />
          </div>
          <Timer
            totalTime={committeeData.totalTime}
            lastValue={committeeData.lastValue}
            playedAt={committeeData.playedAt}
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
                        updateUnmodData.mutate({
                          lastValue: calculateCurrentTimerValue({
                            lastValue: committeeData.lastValue,
                            playedAt: committeeData.playedAt,
                          }),
                          playedAt: null,
                        });
                      } else {
                        updateUnmodData.mutate({
                          playedAt: new Date(),
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
                      updateUnmodData.mutate({
                        lastValue: committeeData.totalTime,
                        playedAt: null,
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
        </div>
      </div>

      <Modal
        visible={updateSpeechTimeModalVisible}
        onRequestClose={() => setUpdateSpeechTimeModalVisible(false)}
        className="flex flex-col gap-4"
      >
        <h1 className="mb-4 text-3xl font-medium">
          Atualizar Tempo do Debate Não Moderado
        </h1>
        <input
          ref={updateSpeechTimeModal}
          className="rounded-md px-4 py-2"
          type="number"
          placeholder="Segundos"
          defaultValue={committeeData.totalTime}
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
              updateUnmodData.mutate({
                totalTime: value,
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

export default UnmoderatedDebateMode;
