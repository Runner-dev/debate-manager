import { type Speech } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { type NextPage } from "next";
import Link from "next/link";
import CountryFlagName from "~/components/CountryFlagName";
import DebouncedInput from "~/components/DebouncedInput";
import DebouncedTextArea from "~/components/DebouncedTextArea";
import { api } from "~/utils/api";
import formatTime from "~/utils/formatTime";

const SpeechesPage: NextPage = () => {
  const updateSpeech = api.speeches.updateSpeech.useMutation();
  const { data: speeches } = api.speeches.getSpeeches.useQuery();
  const clearSpeeches = api.speeches.clearSpeeches.useMutation();

  const utils = useQueryClient();
  const queryKey = getQueryKey(api.speeches.getSpeeches, undefined, "query");

  api.speeches.onSpeechesUpdate.useSubscription(undefined, {
    onData({ type, data }) {
      switch (type) {
        case "full": {
          utils.setQueryData(queryKey, data);
          break;
        }
        case "new": {
          utils.setQueryData(queryKey, (oldData: Array<Speech> | undefined) => {
            if (oldData === undefined) return oldData;
            const newData = [data, ...oldData];
            return newData;
          });
          break;
        }
        case "update": {
          utils.setQueryData(queryKey, (oldData: Array<Speech> | undefined) => {
            if (oldData === undefined) return oldData;
            const newData = oldData.map((motion) => {
              if (motion.id !== data.id) return motion;
              return data;
            });
            return newData;
          });
        }
      }
    },
  });

  if (!speeches) return <div>Loading...</div>;

  return (
    <main className="max-h-[calc(100vh-3.5rem)] w-full overflow-y-auto bg-gray-100">
      <h1 className="mt-8 mb-2 text-center text-3xl font-medium">Falas</h1>
      <div className="w-full flex items-center justify-center"><Link className="mb-8 text-center underline text-blue-700 hover:text-blue-900 transition" href="/speechesTable">Buscar dados de fala de delegado</Link></div>
      <div className="mx-auto flex max-w-lg flex-col gap-2 px-8 py-4">
        {speeches.map(({ country, delegate, id, length, rating, comments }) => (
          <div className="rounded-md bg-white p-4 shadow" key={id}>
            <CountryFlagName country={country} />
            <label className="mt-4 flex flex-col text-gray-800">
              Delegado
              <select
                value={delegate?.id ?? "unknown"}
                onChange={(e) => {
                  const newDelegateId =
                    e.target.value === "unknown" ? null : e.target.value;
                  updateSpeech.mutate({ id, delegateId: newDelegateId });
                }}
                className="rounded-md bg-gray-100 p-2 text-lg"
              >
                <option value="unknown">Delegado não definido</option>
                {country.delegates.map((delegate) => (
                  <option key={delegate.id} value={delegate.id}>
                    {delegate.name} ({delegate.user.name})
                  </option>
                ))}
              </select>
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
              <DebouncedInput
                type="text"
                customValue={rating?.toString() ?? ""}
                customOnChange={(newValue) => {
                  const newRating = parseInt(newValue);
                  updateSpeech.mutate({ id, rating: newRating });
                }}
                className="rounded-md bg-gray-100 p-2 text-lg"
              />
            </label>

            <label className="mt-4 flex flex-col text-gray-800">
              Comentários
              <DebouncedTextArea
                type="text"
                customValue={comments?.toString() ?? ""}
                customOnChange={(newCommentsValue) => {
                  updateSpeech.mutate({ id, comments: newCommentsValue });
                }}
                className="rounded-md bg-gray-100 p-2 text-lg"
              />
            </label>
          </div>
        ))}
        <button
          className="rounded-md bg-red-500 p-4 text-white"
          onClick={() =>
            confirm("Você tem certeza disso?") && clearSpeeches.mutate()
          }
        >
          Apagar TODAS as falas
        </button>
      </div>
    </main>
  );
};

export default SpeechesPage;
