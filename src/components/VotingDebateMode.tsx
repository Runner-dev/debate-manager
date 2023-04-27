import { type Country, type Delegate, type Vote } from "@prisma/client";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import Reset from "~/icons/Reset";
import Settings from "~/icons/Settings";
import { type CommitteeData } from "~/server/api/routers/committeeData";
import { api } from "~/utils/api";
import CountryFlagName from "./CountryFlagName";
import DebouncedInput from "./DebouncedInput";
import Modal from "./Modal";

const VotingDebateMode = ({
  committeeData,
  chair,
  delegate,
}: {
  chair: boolean;
  committeeData: CommitteeData;
  delegate: (Delegate & { country: Country }) | undefined;
}) => {
  if (committeeData.currentMode !== "voting")
    throw new Error("Modo não compatível");

  const updateVotingData = api.committeeData.updateVotingData.useMutation();
  const clearVotes = api.committeeData.clearVotes.useMutation();
  const createVote = api.committeeData.vote.useMutation();

  const [updateVotingTypeModalVisible, setUpdateVotingTypeModalVisible] =
    useState(true);

  const updateVotingTypeModalSelect = useRef<HTMLSelectElement>(null);

  const votesMap = useMemo(() => {
    const map = new Map<string, Vote & { country: Country }>();
    committeeData.votes.forEach((vote) => {
      map.set(vote.countryId, vote);
    });
    return map;
  }, [committeeData.votes]);

  const countriesWithVotes = useMemo(() => {
    return committeeData.countries
      .map((country) => {
        const vote = votesMap.get(country.id);
        return { ...country, vote };
      })
      .filter(({ roll }) => roll !== "a");
  }, [committeeData.countries, votesMap]);

  const actualCurrentIndex =
    committeeData.currentCountryIndex % committeeData.countries.length;

  const currentCountry = countriesWithVotes[actualCurrentIndex];

  const incrementCurrentCountry = () => {
    let next = actualCurrentIndex + 1;

    if (next === committeeData.countries.length) next = 0;

    updateVotingData.mutate({ currentCountryIndex: next });
  };

  const voteHandlerFactory = (vote: "for" | "against" | "abstain") => () => {
    if (!currentCountry) return;
    const countryId = chair ? currentCountry.id : delegate?.countryId;
    if (!countryId) return;
    createVote.mutate({ countryId, vote });
  };

  const results = useMemo(() => {
    return committeeData.votes.reduce(
      (prev, vote) => {
        switch (vote.vote) {
          case "for": {
            return { ...prev, for: prev.for + 1 };
          }
          case "against": {
            return { ...prev, against: prev.against + 1 };
          }
          case "abstain": {
            return { ...prev, abstain: prev.abstain + 1 };
          }
          default: {
            return prev;
          }
        }
      },
      {
        for: 0,
        against: 0,
        abstain: 0,
      }
    );
  }, [committeeData.votes]);

  const percentageVoted = Math.round(
    (committeeData.votes.length / countriesWithVotes.length) * 100
  );

  const canAbstain = chair
    ? currentCountry?.roll !== "pv"
    : delegate?.country.roll !== "pv";

  const delegateCanVote =
    committeeData.openToDelegateVotes &&
    delegate &&
    countriesWithVotes.findIndex(({ id }) => id === delegate.countryId) !==
      -1 &&
    !votesMap.get(delegate.countryId);

  return (
    <>
      <div className="grid h-full grid-cols-3 gap-4">
        <div
          className={` flex w-full flex-col items-stretch gap-4 rounded-lg bg-gray-200 p-4`}
        >
          {chair && (
            <>
              <h2 className="text-3xl">Controles</h2>
              <button
                onClick={() => {
                  updateVotingData.mutate({
                    openToDelegateVotes: !committeeData.openToDelegateVotes,
                  });
                }}
                className={`rounded-md p-2 text-center text-white ${
                  committeeData.openToDelegateVotes
                    ? "bg-red-700"
                    : "bg-green-700"
                }`}
              >
                {committeeData.openToDelegateVotes ? "Fechar" : "Abrir"} votos
                de delegados
              </button>
              <div className="flex gap-4">
                <button
                  onClick={() => clearVotes.mutate()}
                  className="flex  flex-1 items-center justify-center rounded-md bg-yellow-500 p-2 text-white"
                >
                  <Reset className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setUpdateVotingTypeModalVisible(true)}
                  className="flex flex-1 items-center justify-center rounded-md bg-gray-400 p-2 text-white"
                >
                  <Settings className="h-6 w-6" />
                </button>
              </div>
            </>
          )}
          <h2 className="text-3xl">Resultados</h2>
          <div>
            <div className="flex h-12 w-full overflow-hidden rounded-lg border border-gray-600 bg-gray-100">
              <div
                className="bg-green-700"
                style={{
                  width: `${
                    (results.for / committeeData.countries.length) * 100
                  }%`,
                }}
              />
              <div
                className="bg-red-700"
                style={{
                  width: `${
                    (results.against / committeeData.countries.length) * 100
                  }%`,
                }}
              />
              <div
                className="bg-yellow-600"
                style={{
                  width: `${
                    (results.abstain / committeeData.countries.length) * 100
                  }%`,
                }}
              />
            </div>
            <div className="px-2">{percentageVoted}% votaram </div>
            <div className="mt-4 flex flex-col gap-2 text-lg">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-green-700 p-1 text-white">
                  {(
                    (results.for / committeeData.countries.length) *
                    100
                  ).toFixed(1)}
                  %
                </div>
                A Favor
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-red-700 p-1 text-white">
                  {(
                    (results.against / committeeData.countries.length) *
                    100
                  ).toFixed(1)}
                  %
                </div>
                Contra
              </div>
              {results.abstain > 0 ||
                (committeeData.type === "substantial" && (
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-yellow-600 p-1 text-white">
                      {(
                        (results.abstain / committeeData.countries.length) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                    Se Abstiveram
                  </div>
                ))}
            </div>
          </div>
        </div>
        <div
          className={` col-span-2 flex w-full flex-col items-stretch gap-4 rounded-lg bg-gray-200 p-4`}
        >
          <DebouncedInput
            readOnly={!chair}
            customValue={committeeData.topic ?? ""}
            placeholder={"Sem Tópico"}
            type="text"
            className="w-4/5 bg-transparent text-2xl font-medium text-black outline-none placeholder:text-black active:outline-none"
            customOnChange={(newValue) => {
              console.log("fired");
              updateVotingData.mutate({ topic: newValue });
            }}
          />
          {(chair || delegateCanVote) && (
            <div className="flex items-center gap-4 rounded-lg bg-gray-100 p-4">
              {chair && (
                <div className="flex w-2/5 flex-none flex-col items-center gap-4 p-8">
                  {currentCountry && (
                    <>
                      <img
                        className="h-28 w-28 rounded-full object-cover shadow-lg"
                        alt={`Bandeira ${currentCountry.name}`}
                        src={currentCountry.flag}
                        srcSet={`${currentCountry.flag.replace(
                          "h40",
                          "h120"
                        )} 3x`}
                      />
                      <div className="text-center text-2xl">
                        {currentCountry.name}
                      </div>
                    </>
                  )}
                </div>
              )}
              <div
                className={`flex w-full gap-4 text-xl text-white ${
                  chair ? "flex-col" : ""
                }`}
              >
                <div className="flex max-h-20 gap-4">
                  <button
                    onClick={voteHandlerFactory("for")}
                    className={`max-h-16 rounded-lg bg-green-500 px-10 py-3 ${
                      chair ? "flex-1" : ""
                    }`}
                  >
                    A Favor
                  </button>
                  {committeeData.type === "substantial" && (
                    <button
                      disabled={canAbstain}
                      onClick={voteHandlerFactory("abstain")}
                      className={`max-h-16 w-max flex-1 rounded-lg bg-yellow-500 px-10 py-3 ${
                        chair ? "flex-1" : ""
                      }`}
                    >
                      Se Abster
                    </button>
                  )}
                </div>
                <div className="flex max-h-20 gap-4">
                  <button
                    onClick={voteHandlerFactory("against")}
                    className="flex-1 rounded-lg bg-red-500 px-10 py-3"
                  >
                    Contra
                  </button>
                  {committeeData.type === "substantial" && chair && (
                    <button
                      onClick={() => {
                        incrementCurrentCountry();
                      }}
                      className="max-h-16 flex-1 rounded-lg bg-gray-500 px-10 py-3"
                    >
                      Pular
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          <div>
            <h1 className="text-3xl ">Votos</h1>
            <div className="flex flex-col gap-2">
              {countriesWithVotes.map(({ vote, ...country }, k) => (
                <button
                  onClick={() =>
                    updateVotingData.mutate({ currentCountryIndex: k })
                  }
                  key={country.id}
                  className="flex gap-4"
                  disabled={!chair}
                >
                  <CountryFlagName country={country} />
                  {(() => {
                    const voteVal = vote?.vote;
                    let val: string | null = null;
                    let color: string | null = null;
                    switch (voteVal) {
                      case "for": {
                        val = "A Favor";
                        color = "bg-green-700";
                        break;
                      }
                      case "abstain": {
                        val = "Se Absteve";
                        color = "bg-yellow-600";
                        break;
                      }
                      case "against": {
                        val = "Contra";
                        color = "bg-red-700";
                        break;
                      }
                    }
                    if (!val || !color) return null;
                    return (
                      <div className={`${color} rounded-md p-2 text-white`}>
                        {val}
                      </div>
                    );
                  })()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        visible={chair && updateVotingTypeModalVisible}
        onRequestClose={() => setUpdateVotingTypeModalVisible(false)}
        className="flex flex-col gap-4"
      >
        <h1 className="mb-4 text-3xl font-medium">Atualizar Tipo da Votação</h1>
        <select
          defaultValue={committeeData.type}
          ref={updateVotingTypeModalSelect}
          className="mb-4 rounded-lg p-4 text-xl"
        >
          <option value="procedural">Procedimental</option>
          <option value="substantial">Substantiva</option>
        </select>
        <div className="flex gap-2">
          <button
            onClick={() => setUpdateVotingTypeModalVisible(false)}
            className="flex-1 rounded-md bg-red-200 p-2"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!updateVotingTypeModalSelect.current) return;
              const valueType = z.enum(["procedural", "substantial"]);
              const value = valueType.parse(
                updateVotingTypeModalSelect.current.value
              );
              updateVotingData.mutate({
                type: value,
              });
              setUpdateVotingTypeModalVisible(false);
            }}
            className="flex-1 rounded-md bg-emerald-400 p-2"
          >
            Atualizar Tipo
          </button>
        </div>
      </Modal>
    </>
  );
};

export default VotingDebateMode;
