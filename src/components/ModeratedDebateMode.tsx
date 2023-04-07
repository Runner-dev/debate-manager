import { type Country, type Delegate } from "@prisma/client";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import useTimer from "~/hooks/useTimer";
import Close from "~/icons/Close";
import Pause from "~/icons/Pause";
import Play from "~/icons/Play";
import RaisedHand from "~/icons/RaisedHand";
import Reset from "~/icons/Reset";
import Settings from "~/icons/Settings";
import User from "~/icons/User";
import { type CommitteeData } from "~/server/api/routers/committeeData";
import { api } from "~/utils/api";
import calculateCurrentTimerValue from "~/utils/calculateCurrentTimerValue";
import CountryFlagName from "./CountryFlagName";
import DebouncedInput from "./DebouncedInput";
import Modal from "./Modal";
import Timer from "./Timer";

const buttonIconClass = "w-6 h-6";
const buttonBaseClass = "flex-1 flex justify-center text-white p-2 rounded-lg ";

const ModeratedDebateMode = ({
  committeeData,
  chair,
  delegate,
}: {
  chair: boolean;
  committeeData: CommitteeData;
  delegate: (Delegate & { country: Country }) | undefined;
}) => {
  if (committeeData.currentMode !== "mod")
    throw new Error("Modo não compatível");

  const updateModData = api.committeeData.updateModData.useMutation();
  const raiseHand = api.committeeData.raiseHand.useMutation();
  const lowerHand = api.committeeData.lowerHand.useMutation();
  const setSpeaker = api.committeeData.setSpeaker.useMutation();
  const yieldTime = api.committeeData.yieldTime.useMutation();

  const { formattedCurrentValue: formattedCaucusValue } = useTimer({
    lastValue: committeeData.lastValue,
    playedAt: committeeData.playedAt,
  });

  const [yieldTimeModalVisible, setYieldTimeModalVisible] = useState(false);

  const [updateSpeechTimeModalVisible, setUpdateSpeechTimeModalVisible] =
    useState(false);

  const updateSpeechTimeModal = useRef<HTMLInputElement>(null);
  const alreadyRaised =
    !chair &&
    committeeData.raisedHands.findIndex(
      ({ countryId }) => countryId === delegate?.countryId
    ) !== -1;

  const raisedHandsMap = useMemo(() => {
    const map = new Map<string, boolean>();
    committeeData.raisedHands.forEach(({ countryId }) => {
      map.set(countryId, true);
    });
    return map;
  }, [committeeData.raisedHands]);
  const processedCountries = useMemo(
    () =>
      committeeData.countries
        .map((country) => ({
          ...country,
          raisedHand: raisedHandsMap.get(country.id) === true,
        }))
        .filter(({ raisedHand }) => chair || raisedHand)
        .sort((a, b) => {
          console.log(a, b);
          if (a.raisedHand === b.raisedHand) {
            return ("" + a.shortName).localeCompare(b.shortName);
          } else if (a.raisedHand) {
            return -1;
          } else if (b.raisedHand) {
            return 1;
          }
          throw new Error("Not right");
        }),
    [raisedHandsMap, committeeData.countries, chair]
  );

  return (
    <>
      <div className="grid h-full grid-cols-3 gap-4">
        <div
          className={` col-span-2 flex w-full flex-col items-stretch gap-4 rounded-lg bg-gray-200 p-4`}
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
                updateModData.mutate({ topic: newValue });
              }}
            />
            <button className="rounded-md px-3 py-2 text-2xl font-medium transition hover:bg-gray-300">
              {formattedCaucusValue}
            </button>
          </div>
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
                    onClick={() => setYieldTimeModalVisible(true)}
                    className={buttonBaseClass + "bg-gray-600"}
                  >
                    <User className={buttonIconClass} />
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
        <div className="h-min rounded-lg bg-gray-100 p-4">
          <h2 className="mb-2 mt-4 text-2xl font-medium">
            {chair ? "Países" : "Mãos Levantadas"}
          </h2>
          {committeeData.raisedHands.length == 0 && !chair && (
            <div className="text-lg italic">Nenhuma mão levantada</div>
          )}
          {processedCountries.map(({ raisedHand, ...country }) => (
            <div
              key={country.id}
              className="ml-2 mb-2 flex w-full items-center justify-between gap-2 text-left"
            >
              <button
                disabled={!chair}
                className={`w-full rounded-md p-2 transition ${
                  chair ? "hover:bg-gray-300" : ""
                }`}
                onClick={() => {
                  if (!chair) return;
                  setSpeaker.mutate(country.id);
                  lowerHand.mutate(country.id);
                }}
              >
                <CountryFlagName country={country} />
              </button>
              {chair && (
                <button
                  onClick={() => {
                    if (raisedHand) {
                      lowerHand.mutate(country.id);
                    } else {
                      raiseHand.mutate(country.id);
                    }
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded-md ${
                    raisedHand
                      ? "text-gray-500 hover:text-red-500"
                      : "text-gray-400 hover:text-green-500"
                  }`}
                >
                  <RaisedHand full={raisedHand} className="h-6 w-6" />
                </button>
              )}
            </div>
          ))}
          {chair && (
            <button
              className={`${
                committeeData.acceptingHands ? "bg-red-500" : "bg-emerald-500"
              } mt-8 w-full rounded-lg p-4 text-lg font-medium text-white`}
              onClick={() => {
                updateModData.mutate({
                  acceptingHands: !committeeData.acceptingHands,
                });
              }}
            >
              {committeeData.acceptingHands ? "Fechar" : "Abrir"} levantar mãos
            </button>
          )}
          {!chair &&
            (alreadyRaised ? (
              <button
                className="mt-4 w-full max-w-md rounded-lg bg-red-600 py-3 text-xl text-white disabled:cursor-not-allowed disabled:bg-blue-300"
                onClick={() => {
                  if (!delegate?.countryId) return;
                  lowerHand.mutate(delegate.countryId);
                }}
              >
                Abaixar Mão
              </button>
            ) : (
              committeeData.acceptingHands && (
                <button
                  className="mt-4 w-full max-w-md rounded-lg bg-blue-600 py-3 text-xl text-white disabled:cursor-not-allowed disabled:bg-blue-300"
                  onClick={() => {
                    if (!delegate?.countryId) return;
                    raiseHand.mutate(delegate.countryId);
                  }}
                >
                  Levantar Mão
                </button>
              )
            ))}
        </div>
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
      <Modal
        visible={yieldTimeModalVisible}
        onRequestClose={() => setYieldTimeModalVisible(false)}
      >
        <button
          className="mr-4 -mt-4 self-end"
          onClick={() => {
            setYieldTimeModalVisible(false);
          }}
        >
          <Close className="h-8 w-8 self-end text-black" />
        </button>
        <h1 className="mb-4 px-8 text-3xl font-medium">Ceder Tempo</h1>
        {committeeData.countries.map((country) => (
          <button
            className="px-8 py-4 hover:bg-gray-300"
            key={country.id}
            onClick={() => {
              yieldTime.mutate(country.id);
              setYieldTimeModalVisible(false);
            }}
          >
            <CountryFlagName country={country} />
          </button>
        ))}
      </Modal>
    </>
  );
};

export default ModeratedDebateMode;
