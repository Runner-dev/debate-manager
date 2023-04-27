import { NextPage } from "next";
import { useMemo, useState } from "react";
import CountryFlagName from "~/components/CountryFlagName";
import { api } from "~/utils/api";
import formatTime from "~/utils/formatTime";
const SpeechesTable: NextPage = () => {
  const { data } = api.speeches.getChairSpeechesTableData.useQuery(undefined, {
    cacheTime: 1 * 60 * 1000,
  });
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedDelegateId, setSelectedDelegateId] = useState("");

  const selectedCountry = useMemo(
    () =>
      (!!selectedCountryId &&
        data?.find(({ id }) => id === selectedCountryId)) ||
      undefined,
    [data, selectedCountryId]
  );
  const selectedDelegate = useMemo(
    () =>
      (selectedCountry &&
        !!selectedDelegateId &&
        selectedCountry.delegates?.find(
          ({ id }) => id === selectedDelegateId
        )) ||
      undefined,
    [selectedCountry, selectedDelegateId]
  );

  const calculatedData = useMemo(() => {
    let countryTime = 0,
      countryTotalRating = 0,
      countryRatingCount = 0;

    let delegateTime = 0,
      delegateTotalRating = 0,
      delegateRatingCount = 0;

    selectedCountry?.speeches.forEach((speech) => {
      countryTime += speech.length || 0;
      if (speech.rating) {
        countryRatingCount++;
        countryTotalRating += speech.rating;
      }
      if (speech.delegateId === selectedDelegateId) {
        delegateTime += speech.length || 0;
        if (speech.rating) {
          delegateRatingCount++;
          delegateTotalRating += speech.rating;
        }
      }
    });

    return {
      country: {
        time: countryTime,
        rating:
          countryRatingCount !== 0
            ? countryTotalRating / countryRatingCount
            : 0,
      },
      delegate: {
        time: delegateTime,
        rating:
          delegateRatingCount !== 0
            ? delegateTotalRating / delegateRatingCount
            : 0,
      },
    };
  }, [selectedCountry, selectedDelegateId]);
  const delegatesMap = useMemo(
    () =>
      selectedCountry?.delegates.reduce(
        (acc, item) => acc.set(item.id, item),
        new Map<string, (typeof selectedCountry.delegates)[number]>()
      ),
    [selectedCountry]
  );

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 p-4 shadow">
      <h1 className="text-2xl font-medium"> Falas de Nação</h1>
      <label className="flex w-full max-w-sm flex-col gap-1 text-gray-700">
        Nação
        <select
          value={selectedCountryId}
          onChange={(e) => setSelectedCountryId(e.target.value)}
          className="rounded-md border border-gray-700 p-2 text-lg"
        >
          <option value=""> Nação Não Selecionada</option>
          {data?.map((country) => (
            <option key={country.id} value={country.id}>
              {country.shortName}
            </option>
          ))}
        </select>
      </label>
      {selectedCountry && (
        <label className="flex w-full max-w-sm flex-col gap-1 text-gray-700">
          Delegado
          <select
            value={selectedDelegateId}
            onChange={(e) => setSelectedDelegateId(e.target.value)}
            className="rounded-md border border-gray-700 p-2 text-lg"
          >
            <option value=""> Delegado Não Selecionada</option>
            {selectedCountry.delegates?.map((delegate) => (
              <option key={delegate.id} value={delegate.id}>
                {delegate.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <h2 className="mt-2 text-xl">Dados</h2>
      <div className="grid grid-cols-3 grid-rows-3 gap-4 text-center">
        <div />
        <div>Tempo Total</div>
        <div>Avaliação</div>
        <div>Nação</div>
        <div>{formatTime(calculatedData.country.time)}</div>
        <div>{calculatedData.country.rating.toFixed(1)}</div>
        <div>Delegado</div>
        <div>{formatTime(calculatedData.delegate.time)}</div>
        <div>{calculatedData.delegate.rating.toFixed(1)}</div>
      </div>
      <h2 className="mt-2 text-xl">Comentários</h2>
      <div className="w-full max-w-md">
        {selectedCountry?.speeches.map(
          ({ id, length, rating, comments, delegateId }) => {
            const delegate = delegateId
              ? delegatesMap?.get(delegateId)
              : undefined;
            return (
              <div className="rounded-md bg-gray-100 p-4 shadow" key={id}>
                <CountryFlagName country={selectedCountry} />
                <label className="mt-4 flex flex-col text-gray-800">
                  Delegado
                  <div className="rounded-md bg-gray-100 p-2 text-lg">
                    {delegate?.name} ({delegate?.user.name})
                  </div>
                </label>

                {!!length && (
                  <label className="mt-4 flex flex-col text-gray-800">
                    Duração
                    <input
                      type="text"
                      readOnly={true}
                      value={formatTime(length)}
                      className="rounded-md bg-gray-100 p-2 text-lg"
                    />
                  </label>
                )}
                <label className="mt-4 flex flex-col text-gray-800">
                  Avaliação (0-10)
                  <input
                    type="text"
                    value={rating?.toString() ?? ""}
                    readOnly
                    className="rounded-md bg-gray-100 p-2 text-lg"
                  />
                </label>

                <label className="mt-4 flex flex-col text-gray-800">
                  Comentários
                  <div className="rounded-md bg-gray-100 p-2 text-lg">
                    {comments}
                  </div>
                </label>
              </div>
            );
          }
        )}
      </div>
    </main>
  );
};

export default SpeechesTable;
