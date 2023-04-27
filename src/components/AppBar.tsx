import { type Country, type Point } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { useMemo, useState } from "react";
import ChevronLeft from "~/icons/ChevronLeft";
import Close from "~/icons/Close";
import Flag from "~/icons/Flag";
import User from "~/icons/User";
import { api } from "~/utils/api";
import formatTime from "~/utils/formatTime";
import CountryFlagName from "./CountryFlagName";
import StrippedModal from "./StrippedModal";

const pointNames = {
  personalPrivilege: "Privilégio Pessoal",
  information: "Informação",
  order: "Ordem",
  response: "Direito a Resposta",
};

const AppBar = () => {
  const { data: points } = api.points.getPoints.useQuery();
  const { data: userData } = api.userData.getUserData.useQuery();
  const { data: stats } = api.stats.getUserStats.useQuery(undefined, {
    enabled: !!userData?.delegate,
    cacheTime: 1 * 60 * 1000,
  });
  const [appbarExpanded, setAppBarExpanded] = useState(false);
  const deletePoint = api.points.deletePoint.useMutation();
  const { data: countriesData } = api.countries.getCountries.useQuery(
    undefined,
    {
      enabled: !userData?.delegate,
    }
  );
  const { data: countryData } = api.countries.getOwnCountry.useQuery(
    undefined,
    {
      enabled: !!userData?.delegate,
    }
  );
  const utils = useQueryClient();
  const countriesQueryKey = getQueryKey(
    api.countries.getCountries,
    undefined,
    "query"
  );
  const countryQueryKey = getQueryKey(
    api.countries.getOwnCountry,
    undefined,
    "query"
  );

  const committeeDataQuery = getQueryKey(
    api.committeeData.getCommitteeData,
    undefined,
    "query"
  );

  api.countries.onCountriesUpdate.useSubscription(undefined, {
    onData({ type, data }) {
      void utils.invalidateQueries(committeeDataQuery);
      switch (type) {
        case "full": {
          utils.setQueryData(countriesQueryKey, data);
          break;
        }
        case "update": {
          utils.setQueryData(
            countriesQueryKey,
            (oldData: Array<Country> | undefined) => {
              if (!oldData) return undefined;
              return oldData.map((country) =>
                country.id === data.id ? data : country
              );
            }
          );
          break;
        }
      }
    },
    enabled: !userData?.delegate,
  });

  api.countries.onOwnCountryUpdate.useSubscription(undefined, {
    onData(country) {
      utils.setQueryData(countryQueryKey, country);
    },
    enabled: !!userData?.delegate,
  });

  const queryKey = getQueryKey(api.points.getPoints, undefined, "query");
  api.points.onPointsUpdate.useSubscription(undefined, {
    onData({ type, data }) {
      switch (type) {
        case "full": {
          utils.setQueryData(queryKey, data);
          break;
        }
        case "new": {
          utils.setQueryData(
            queryKey,
            (oldData: Array<Point & { country: Country }> | undefined) => {
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
            (oldData: Array<Point & { country: Country }> | undefined) => {
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
            (oldData: Array<Point & { country: Country }> | undefined) => {
              if (oldData === undefined) return oldData;
              const newData = oldData.filter((motion) => motion.id !== data);
              return newData;
            }
          );
        }
      }
    },
  });

  const countryPoints = useMemo(
    () =>
      userData?.delegate &&
      points &&
      points.filter(
        (point) => point.countryId === userData.delegate?.countryId
      ),
    [userData, points]
  );

  const updateCountry = api.countries.updateCountry.useMutation();

  return (
    <>
      <div className="pt-14" />
      <div className="fixed right-0 top-0 z-30 flex h-14 w-full items-center justify-end bg-gray-200 px-4 shadow-md">
        {stats && (
          <>
            <div className="flex items-center gap-1 rounded-md bg-gray-100 p-2">
              <Flag className="h-5 w-5" />
              <span>{formatTime(stats.country)}</span>
            </div>
            <div className="flex items-center gap-1 rounded-md bg-gray-100 p-2">
              <User className="h-5 w-5" />
              <span>{formatTime(stats.delegate)}</span>
            </div>
          </>
        )}
        <button
          onClick={() => setAppBarExpanded((x) => !x)}
          className="flex gap-2"
        >
          {userData?.chair && points && points?.length > 0 && (
            <div className="inline-block rounded-full bg-red-500 px-3 py-1 text-white">
              {points.length}
            </div>
          )}
          <ChevronLeft
            className={`h-8 w-8 transition duration-300 ${
              appbarExpanded ? "-rotate-90 transform" : ""
            }`}
          />
        </button>
      </div>
      <StrippedModal
        blocking={appbarExpanded}
        onRequestClose={() => setAppBarExpanded(false)}
      >
        <div
          className={`absolute left-16 right-0 top-14 grid grid-cols-2 gap-4 bg-white p-4 shadow-lg transition duration-300 ${
            appbarExpanded ? "" : "-translate-y-full transform"
          }`}
        >
          <div className="rounded-md bg-gray-100 p-4 ">
            <h2 className="mb-4 text-center text-3xl font-medium">
              Lista de Chamada
            </h2>
            {userData?.delegate && countryData && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  className={`rounded-md border border-red-500 py-2 text-center ${
                    countryData.roll === "a" ? "bg-red-500 text-white" : ""
                  }`}
                  onClick={() =>
                    updateCountry.mutate({
                      id: countryData.id,
                      roll: "a",
                    })
                  }
                >
                  Ausente
                </button>
                <button
                  className={`rounded-md border border-green-700 py-2 text-center ${
                    countryData.roll === "p" ? "bg-green-700 text-white" : ""
                  }`}
                  onClick={() =>
                    updateCountry.mutate({
                      id: countryData.id,
                      roll: "p",
                    })
                  }
                >
                  Presente
                </button>
                <button
                  className={`rounded-md border border-green-500 py-2 text-center ${
                    countryData.roll === "pv" ? "bg-green-500 text-white" : ""
                  }`}
                  onClick={() =>
                    updateCountry.mutate({
                      id: countryData.id,
                      roll: "pv",
                    })
                  }
                >
                  Presente e Votante
                </button>
              </div>
            )}
            {userData?.chair && countriesData && (
              <ul className="flex max-h-[50vh] flex-col overflow-y-auto">
                {countriesData.map((country, i) => (
                  <li
                    key={country.id}
                    className={`flex justify-between gap-2 rounded-md p-2 ${
                      i % 2 == 0 ? "bg-gray-200" : ""
                    }`}
                  >
                    <CountryFlagName country={country} small />
                    <div className="flex items-center gap-2">
                      <button
                        className={`rounded-md border border-red-500 px-2 py-1 text-center ${
                          country.roll === "a" ? "bg-red-500 text-white" : ""
                        }`}
                        onClick={() =>
                          updateCountry.mutate({
                            id: country.id,
                            roll: "a",
                          })
                        }
                      >
                        A
                      </button>
                      <button
                        className={`rounded-md border border-green-700 px-2 py-1 text-center ${
                          country.roll === "p" ? "bg-green-700 text-white" : ""
                        }`}
                        onClick={() =>
                          updateCountry.mutate({
                            id: country.id,
                            roll: "p",
                          })
                        }
                      >
                        P
                      </button>
                      <button
                        className={`rounded-md border border-green-500 px-2 py-1 text-center ${
                          country.roll === "pv" ? "bg-green-500 text-white" : ""
                        }`}
                        onClick={() =>
                          updateCountry.mutate({
                            id: country.id,
                            roll: "pv",
                          })
                        }
                      >
                        PV
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-md bg-gray-100 p-4">
            <h2 className="mb-4 text-center text-3xl font-medium">Pontos</h2>
            {userData?.chair && points && (
              <ul>
                {points?.map((point) => (
                  <li
                    className="flex w-full items-center gap-8 rounded-md bg-white p-2 text-xl"
                    key={point.id}
                  >
                    {pointNames[point.type as keyof typeof pointNames]}
                    <CountryFlagName country={point.country} small />
                    <button
                      onClick={() => deletePoint.mutate(point.id)}
                      className="ml-auto justify-self-end rounded-md bg-red-500 p-1 text-white"
                    >
                      <Close className="h-6 w-6" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {userData?.delegate && countryPoints && (
              <div className="grid grid-cols-4 gap-2">
                <PointButton
                  countryPoints={countryPoints}
                  type="personalPrivilege"
                />
                <PointButton countryPoints={countryPoints} type="information" />
                <PointButton countryPoints={countryPoints} type="order" />
                <PointButton countryPoints={countryPoints} type="response" />
              </div>
            )}
          </div>
        </div>
      </StrippedModal>
    </>
  );
};

const PointButton = ({
  type,
  countryPoints,
}: {
  type: keyof typeof pointNames;
  countryPoints: Array<Point>;
}) => {
  const currentPoint = countryPoints.filter(
    ({ type: pointType }) => pointType === type
  )[0];
  const deletePoint = api.points.deletePoint.useMutation();
  const createPoint = api.points.createPoint.useMutation();

  return (
    <button
      className={`rounded-md border border-solid border-yellow-500 py-2 text-center ${
        currentPoint ? "bg-yellow-600 text-white" : ""
      }`}
      onClick={() => {
        if (currentPoint) {
          deletePoint.mutate(currentPoint.id);
        } else {
          createPoint.mutate({ type });
        }
      }}
    >
      {pointNames[type]}
    </button>
  );
};

export default AppBar;
