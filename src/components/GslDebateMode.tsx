import { type Country, type Delegate } from "@prisma/client";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import Close from "~/icons/Close";
import Pause from "~/icons/Pause";
import Play from "~/icons/Play";
import Reset from "~/icons/Reset";
import Settings from "~/icons/Settings";
import User from "~/icons/User";
import type { CommitteeData } from "~/server/api/routers/committeeData";
import { api } from "~/utils/api";
import calculateCurrentTimerValue from "~/utils/calculateCurrentTimerValue";
import CountryFlagName from "./CountryFlagName";
import Modal from "./Modal";
import Timer from "./Timer";

const buttonIconClass = "w-6 h-6";
const buttonBaseClass = "flex-1 flex justify-center text-white p-2 rounded-lg ";

const GslDebateMode = ({
  committeeData,
  chair,
  delegate,
}: {
  chair: boolean;
  delegate: (Delegate & { country: Country }) | undefined;
  committeeData: CommitteeData;
}) => {
  if (committeeData.currentMode !== "gsl")
    throw new Error("Modo não compatível");

  const updateGslData = api.committeeData.updateGslData.useMutation();
  const addListParticipant =
    api.committeeData.addGslListParticipant.useMutation();
  const removeListParticipant =
    api.committeeData.removeGslListParticipant.useMutation();
  const yieldTime = api.committeeData.yieldTime.useMutation();
  const nextSpeaker = api.committeeData.nextSpeaker.useMutation();

  const [updateSpeechTimeModalVisible, setUpdateSpeechTimeModalVisible] =
    useState(false);
  const updateSpeechTimeModalInputRef = useRef<HTMLInputElement>(null);

  const [yieldTimeModalVisible, setYieldTimeModalVisible] = useState(false);

  const presentCountries = useMemo(() => {
    return committeeData.countries.filter(({ roll, id }) => {
      const present = roll === "p" || roll === "pv";
      const inList =
        committeeData.listParticipants.findIndex(
          ({ country: { id: listId } }) => listId == id
        ) !== -1;
      return present && !(inList || committeeData.currentSpeaker?.id === id);
    });
  }, [
    committeeData.countries,
    committeeData.listParticipants,
    committeeData.currentSpeaker,
  ]);

  const alreadyInList = useMemo(
    () =>
      !chair &&
      (committeeData.listParticipants.findIndex(
        ({ country: { id: listId } }) => listId === delegate?.countryId
      ) !== -1 ||
        committeeData.currentSpeaker?.id === delegate?.countryId),
    [
      chair,
      committeeData.listParticipants,
      delegate?.countryId,
      committeeData.currentSpeaker,
    ]
  );

  const {
    speechTotalTime: totalTime,
    speechLastValue: lastValue,
    speechPlayedAt: playedAt,
  } = committeeData;

  const { data: userData } = api.userData.getUserData.useQuery();
  const canSignup = useMemo(
    () =>
      committeeData.acceptingSignups &&
      committeeData.countries.filter(
        ({ roll, id }) => roll !== "a" && id === userData?.delegate?.countryId
      ).length > 0,
    [
      committeeData.acceptingSignups,
      committeeData.countries,
      userData?.delegate?.countryId,
    ]
  );

  return (
    <>
      <div className="grid h-full grid-cols-3 items-start gap-4">
        <div
          className={`${
            chair ? "col-span-2" : "col-span-3"
          } flex w-full flex-col items-stretch gap-4 rounded-lg bg-gray-200 p-4`}
        >
          <Timer
            totalTime={totalTime}
            lastValue={lastValue}
            playedAt={playedAt}
            buttons={({ playing }) =>
              chair && (
                <div className="flex w-full gap-2">
                  <button
                    className={
                      buttonBaseClass +
                      `${playing ? "bg-red-500" : "bg-emerald-500"}`
                    }
                    onClick={() => {
                      if (playing) {
                        updateGslData.mutate({
                          speechLastValue: calculateCurrentTimerValue({
                            lastValue,
                            playedAt,
                          }),
                          speechPlayedAt: null,
                        });
                      } else {
                        updateGslData.mutate({
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
                      updateGslData.mutate({
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
                </div>
              )
            }
          />
          <div>
            <div>
              <div className="mb-2 flex justify-between">
                <h2 className="text-2xl font-medium">Orador:</h2>
                {chair && (
                  <button
                    className="rounded-lg bg-blue-600 p-2 text-white disabled:cursor-not-allowed disabled:bg-blue-400"
                    onClick={() => {
                      nextSpeaker.mutate();
                    }}
                  >
                    Próximo Orador
                  </button>
                )}
              </div>
              <div className="ml-2">
                {committeeData.currentSpeaker ? (
                  <CountryFlagName country={committeeData.currentSpeaker} />
                ) : (
                  <div className="text-lg italic">Sem Orador</div>
                )}
              </div>
              <h2 className="mb-2 mt-4 text-2xl font-medium">
                Lista de Oradores
              </h2>
              {committeeData.listParticipants.length == 0 && (
                <div className="text-lg italic">
                  Nenhum participante da lista de oradores
                </div>
              )}
              {committeeData.listParticipants.map(({ country, id }) => (
                <div
                  key={id}
                  className="mb-4 ml-2 flex items-center justify-between gap-4"
                >
                  <CountryFlagName country={country} />
                  {chair && (
                    <button
                      onClick={() => {
                        removeListParticipant.mutate(country.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500 text-white"
                    >
                      <Close className="h-6 w-6" />
                    </button>
                  )}
                </div>
              ))}
              {!chair &&
                (alreadyInList
                  ? committeeData.currentSpeaker?.id !==
                      delegate?.countryId && (
                      <button
                        className="mt-4 w-full max-w-md rounded-lg bg-red-600 py-3 text-xl text-white disabled:cursor-not-allowed disabled:bg-blue-300"
                        onClick={() => {
                          if (!delegate?.countryId) return;
                          removeListParticipant.mutate(delegate.countryId);
                        }}
                      >
                        Sair da Lista de Oradores
                      </button>
                    )
                  : canSignup && (
                      <button
                        className="mt-4 w-full max-w-md rounded-lg bg-blue-600 py-3 text-xl text-white disabled:cursor-not-allowed disabled:bg-blue-300"
                        onClick={() => {
                          if (!delegate?.countryId) return;
                          addListParticipant.mutate(delegate.countryId);
                        }}
                      >
                        Entrar na Lista de Oradores
                      </button>
                    ))}
            </div>
          </div>
        </div>
        {chair && (
          <div className="h-min rounded-lg bg-gray-100 p-4">
            <h2 className="mb-4 text-2xl">Adicionar Delegação à Lista</h2>
            <div className="max-h-[60vh] overflow-y-auto">
              {presentCountries.map((country) => (
                <button
                  key={country.id}
                  className="mb-2 flex w-full items-center justify-between rounded-md p-2 hover:bg-gray-200"
                  onClick={() => addListParticipant.mutate(country.id)}
                >
                  <CountryFlagName country={country} />
                </button>
              ))}
            </div>
            <button
              className={`${
                committeeData.acceptingSignups ? "bg-red-500" : "bg-emerald-500"
              } mt-8 w-full rounded-lg p-4 text-lg font-medium text-white`}
              onClick={() => {
                updateGslData.mutate({
                  acceptingSignups: !committeeData.acceptingSignups,
                });
              }}
            >
              {committeeData.acceptingSignups ? "Fechar" : "Abrir"} Lista de
              Oradores
            </button>
          </div>
        )}
      </div>

      <Modal
        visible={updateSpeechTimeModalVisible}
        onRequestClose={() => setUpdateSpeechTimeModalVisible(false)}
        className="w-96 gap-4"
      >
        <h1 className="mb-4 text-3xl font-medium">Atualizar Tempo de Fala</h1>
        <input
          ref={updateSpeechTimeModalInputRef}
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
              if (!updateSpeechTimeModalInputRef.current) return;
              const valueType = z.number().min(0).max(1000);
              const value = valueType.parse(
                parseInt(updateSpeechTimeModalInputRef.current.value)
              );
              updateGslData.mutate({
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
        className="w-96 "
      >
        <h1 className="mb-4 text-3xl font-medium">Ceder Tempo</h1>
        <div className="flex max-h-[60vh] flex-col overflow-y-auto">
          {committeeData.countries.map((country) => (
            <button
              className="rounded-md py-2 text-left hover:bg-gray-300"
              key={country.id}
              onClick={() => {
                yieldTime.mutate(country.id);
                setYieldTimeModalVisible(false);
              }}
            >
              <CountryFlagName country={country} />
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default GslDebateMode;
