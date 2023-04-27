import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import DebouncedInput from "~/components/DebouncedInput";
import DebouncedTextArea from "~/components/DebouncedTextArea";
import ChevronLeft from "~/icons/ChevronLeft";
import NewTab from "~/icons/NewTab";
import { api } from "~/utils/api";

const documentTypeNames = {
  positionPaper: "DPO",
  draftResolution: "Rascunho de Resolução",
  ammendment: "Adendo",
};

const documentStateNames = {
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Rejeitado",
  introduced: "Introduzido ao Comitê",
};
const documentStateColors = {
  sent: "text-blue-600",
  approved: "text-green-600",
  rejected: "text-red-600",
  introduced: "text-black",
};

const SpecificDocumentPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;

  if (typeof id !== "string") throw new Error("Input mismatch");
  const { data: documentData } = api.documents.getDocument.useQuery(id);
  const { data: userData } = api.userData.getUserData.useQuery();
  const utils = useQueryClient();
  const queryKey = getQueryKey(api.documents.getDocument, id, "query");
  const updateDocument = api.documents.updateDocument.useMutation();
  const deleteDocument = api.documents.deleteDocument.useMutation();

  api.documents.onDocumentUpdate.useSubscription(id, {
    onData(doc) {
      utils.setQueryData(queryKey, doc);
    },
  });

  const editable =
    userData?.chair ||
    (userData?.delegate?.countryId === documentData?.countryId &&
      documentData?.state !== "approved");
  console.log(documentData);

  if (!documentData) return <div>Loading...</div>;
  const docUrl = new URL(documentData.url);
  docUrl.searchParams.append("embedded", "true");
  docUrl.searchParams.append("pid", "explorer");
  docUrl.searchParams.append("efh", "false");
  docUrl.searchParams.append("a", "v");
  docUrl.searchParams.append("chrome", "false");

  return (
    <main className="w-full bg-gray-100">
      <div className="mx-auto flex w-4/5 flex-col gap-2 overflow-y-auto bg-white px-4 py-4">
        <button onClick={() => router.back()}>
          <ChevronLeft className="h-16 w-16 p-2" />
        </button>
        <DebouncedInput
          className="mb-4 mt-8 text-center text-3xl font-medium"
          customValue={documentData.title}
          readOnly={!editable}
          customOnChange={(value) => {
            if (editable)
              updateDocument.mutate({ id: documentData.id, title: value });
          }}
        />
        <select
          className={`w-full bg-white text-center text-2xl ${
            editable ? "" : "pointer-events-none"
          }`}
          value={documentData.type}
          onChange={(e) => {
            if (!editable) return;
            const value = e.target.value as keyof typeof documentTypeNames;
            updateDocument.mutate({
              id: documentData.id,
              type: value,
            });
          }}
        >
          {Object.entries(documentTypeNames).map(([key, val]) => (
            <option value={key} key={key}>
              {val}
            </option>
          ))}
        </select>
        <select
          className={`w-full bg-white text-center text-2xl ${
            userData?.chair ? "" : "pointer-events-none"
          } ${
            documentStateColors[
              documentData.state as keyof typeof documentStateColors
            ]
          }`}
          value={documentData.state}
          onChange={(e) => {
            if (!userData?.chair) return;
            const value = e.target.value as keyof typeof documentStateNames;
            updateDocument.mutate({
              id: documentData.id,
              state: value,
            });
          }}
        >
          {Object.entries(documentStateNames).map(([key, val]) => (
            <option value={key} key={key}>
              {val}
            </option>
          ))}
        </select>
        <div className="relative mt-4 h-full w-full">
          <iframe className="aspect-square w-full" src={docUrl.toString()} />
          <a
            href={documentData.url}
            className="absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-blue-500 p-4 text-white hover:bg-blue-700"
          >
            <NewTab className="h-6 w-6" />
          </a>
        </div>
        {(userData?.chair ||
          documentData.countryId === userData?.delegate?.countryId) && (
          <>
            <h3>Comentários</h3>
            <DebouncedTextArea
              className="rounded-md border border-gray-500 p-2"
              customValue={documentData.comments}
              readOnly={!userData.chair}
              customOnChange={(newValue) => {
                if (userData?.chair)
                  updateDocument.mutate({
                    id: documentData.id,
                    comments: newValue,
                  });
              }}
            />
          </>
        )}
        {editable && (
          <button
            className="mt-2 w-full bg-red-500 p-2 text-center text-white"
            onClick={() => {
              void deleteDocument
                .mutateAsync(documentData.id)
                .then(() => router.push("/documents"));
            }}
          >
            Apagar Documento
          </button>
        )}
      </div>
    </main>
  );
};

export default SpecificDocumentPage;
