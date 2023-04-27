import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { type NextPage } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { z } from "zod";
import CountryFlagName from "~/components/CountryFlagName";
import Modal from "~/components/Modal";
import { type DocumentData } from "~/server/api/routers/documents";
import { api } from "~/utils/api";

const switcherButtonClass = (active: boolean) =>
  `p-4 transition hover:bg-blue-400/40 border-y-2 border-transparent ${
    active ? " border-b-blue-800" : ""
  }`;

const DocumentsPage: NextPage = () => {
  const { data: documents } = api.documents.getDocuments.useQuery();
  const { data: userData } = api.userData.getUserData.useQuery();

  const utils = useQueryClient();
  const queryKey = getQueryKey(api.documents.getDocuments, undefined, "query");

  api.documents.onDocumentsUpdate.useSubscription(undefined, {
    onData({ type, data }) {
      switch (type) {
        case "full": {
          utils.setQueryData(queryKey, data);
          break;
        }
        case "new": {
          utils.setQueryData(
            queryKey,
            (oldData: Array<DocumentData> | undefined) => {
              if (oldData === undefined) return oldData;
              const newData = [data, ...oldData];
              return newData;
            }
          );
          break;
        }
        case "update": {
          utils.setQueryData(
            queryKey,
            (oldData: Array<DocumentData> | undefined) => {
              if (oldData === undefined) return oldData;
              const newData = oldData.reduce<Array<DocumentData>>(
                (arr, motion) => {
                  if (motion.id !== data.id) return [...arr, motion];
                  return [data, ...arr];
                },
                []
              );
              return newData;
            }
          );
        }
      }
    },
  });

  const [documentsPageTab, updateDocumentsPageTab] = useState<
    "committee" | "own" | "unintroduced"
  >("committee");

  const [introducedDocuments, unintroducedDocuments, ownDocuments] =
    useMemo(() => {
      if (!documents) return [null, null, null];
      const introduced: Array<DocumentData> = [];
      const unintroduced: Array<DocumentData> = [];
      const ownDocs: Array<DocumentData> = [];
      documents.forEach((doc) => {
        if (doc.countryId === userData?.delegate?.countryId) {
          ownDocs.push(doc);
        }
        if (doc.state === "introduced") {
          introduced.push(doc);
        } else {
          unintroduced.push(doc);
        }
      });
      return [introduced, unintroduced, ownDocs];
    }, [documents, userData?.delegate?.countryId]);

  const committeeDocs = useMemo(() => {
    const docs: Record<
      "positionPaper" | "draftResolution" | "ammendment",
      Array<DocumentData>
    > = {
      positionPaper: [],
      draftResolution: [],
      ammendment: [],
    };
    introducedDocuments?.forEach((doc) =>
      docs[doc.type as keyof typeof docs].push(doc)
    );
    return docs;
  }, [introducedDocuments]);

  const splitUnintroducedDocuments = useMemo(() => {
    const docs: Record<
      "sent" | "approved" | "rejected",
      Array<DocumentData>
    > = {
      sent: [],
      approved: [],
      rejected: [],
    };
    if (documentsPageTab !== "unintroduced") return docs;
    unintroducedDocuments?.forEach((doc) => {
      switch (doc.state) {
        case "approved": {
          docs.approved.push(doc);
          break;
        }
        case "rejected": {
          docs.rejected.push(doc);
          break;
        }
        case "sent": {
          docs.sent.push(doc);
          break;
        }
      }
    });
    return docs;
  }, [documentsPageTab, unintroducedDocuments]);
  const [newDocumentModalVisible, setNewDocumentModalVisible] = useState(false);

  console.log(documents);
  console.log(userData);
  if (!documents || !userData) return <div>Loading...</div>;
  return (
    <main className="w-full bg-gray-100">
      <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] w-4/5 flex-col gap-2 overflow-y-auto bg-white px-4 py-4">
        <h1 className="my-8 text-center text-3xl font-medium">Documentos</h1>
        <div className="-mx-4 mb-4 grid grid-cols-2 text-xl">
          {userData.chair && (
            <button
              className={switcherButtonClass(
                documentsPageTab === "unintroduced"
              )}
              onClick={() => updateDocumentsPageTab("unintroduced")}
            >
              Documentos não Introduzidos
            </button>
          )}
          {userData.delegate && (
            <button
              className={switcherButtonClass(documentsPageTab === "own")}
              onClick={() => updateDocumentsPageTab("own")}
            >
              Meus Documentos
            </button>
          )}
          <button
            className={switcherButtonClass(documentsPageTab === "committee")}
            onClick={() => updateDocumentsPageTab("committee")}
          >
            Documentos do Comitê
          </button>
        </div>
        {documentsPageTab === "committee" && (
          <div className="flex flex-col gap-2 rounded-md bg-gray-100 p-2">
            <h2 className="text-2xl">Rascunhos de Resoluções</h2>
            {committeeDocs.draftResolution.map((doc) => (
              <DocumentDisplay key={doc.id} document={doc} />
            ))}
            <h2 className="mt-4 text-2xl">Adendos</h2>
            {committeeDocs.ammendment.map((doc) => (
              <DocumentDisplay key={doc.id} document={doc} />
            ))}
            <h2 className="mt-4 text-2xl">DPOs</h2>
            {committeeDocs.positionPaper.map((doc) => (
              <DocumentDisplay key={doc.id} document={doc} />
            ))}
          </div>
        )}
        {documentsPageTab === "unintroduced" && (
          <div className="grid h-full grid-cols-3 gap-4">
            <div className="flex flex-col gap-4 rounded-md bg-gray-100 p-4 shadow-md">
              <h2 className="text-2xl">Enviados</h2>
              <div className="relative flex max-h-[calc(100vh-23rem)] flex-col gap-2 overflow-y-auto">
                {splitUnintroducedDocuments.sent.map((doc) => (
                  <DocumentDisplay key={doc.id} document={doc} vertical />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-md bg-gray-100 p-4 shadow-md">
              <h2 className="mb-2 text-2xl">Aprovados</h2>
              <div className="relative flex max-h-[calc(100vh-23rem)] flex-col gap-2 overflow-y-auto">
                {splitUnintroducedDocuments.approved.map((doc) => (
                  <DocumentDisplay key={doc.id} document={doc} vertical />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-md bg-gray-100 p-4 shadow-md">
              <h2 className="mb-2 text-2xl">Rejeitados</h2>
              <div className="relative flex max-h-[calc(100vh-23rem)] flex-col gap-2 overflow-y-auto">
                {splitUnintroducedDocuments.rejected.map((doc) => (
                  <DocumentDisplay key={doc.id} document={doc} vertical />
                ))}
              </div>
            </div>
          </div>
        )}
        {documentsPageTab === "own" && (
          <div className="relative flex flex-col gap-2 ">
            {ownDocuments &&
              ownDocuments.map((doc) => (
                <DocumentDisplay key={doc.id} document={doc} />
              ))}
            <button
              className="mt-4 w-full bg-blue-500 p-4 text-center text-white"
              onClick={() => setNewDocumentModalVisible(true)}
            >
              Novo Documento
            </button>
          </div>
        )}
      </div>
      <Modal
        className="flex flex-col gap-4"
        visible={newDocumentModalVisible}
        onRequestClose={() => setNewDocumentModalVisible(false)}
      >
        <NewDocumentModal
          onRequestClose={() => setNewDocumentModalVisible(false)}
        />
      </Modal>
    </main>
  );
};

const DocumentDisplay = ({
  document,
  vertical,
}: {
  document: DocumentData;
  vertical?: boolean;
}) => {
  return (
    <Link
      href={"documents/" + document.id}
      className={`flex ${
        vertical ? "flex-col gap-4" : "items-center gap-8"
      } rounded-md bg-white p-4 shadow-md transition hover:bg-gray-300`}
    >
      <h3 className="text-2xl">{document.title}</h3>
      <CountryFlagName country={document.owner} />
    </Link>
  );
};

const documentTypeNames = {
  positionPaper: "DPO",
  draftResolution: "Rascunho de Resolução",
  ammendment: "Adendo",
};

const NewDocumentModal = ({
  onRequestClose,
}: {
  onRequestClose: () => void;
}) => {
  const createDocument = api.documents.createDocument.useMutation();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("positionPaper");
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);

  const onSubmit = () => {
    const schema = z.object({
      title: z.string().trim().nonempty(),
      type: z.enum(["positionPaper", "draftResolution", "ammendment"]),
      url: z.string().url(),
    });
    const data = schema.parse({ title, type, url });
    createDocument
      .mutateAsync(data)
      .then(() => onRequestClose())
      .catch(() => setError(true));
  };

  return (
    <>
      <h2 className="w-80 text-center text-2xl font-medium">Novo Documento</h2>
      <label className="flex flex-col text-gray-700">
        Título
        <input
          type="text"
          className="rounded-md border border-gray-700/50 p-2 text-lg text-black"
          placeholder="Acordo Bilateral X"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="flex flex-col text-gray-700">
        Tipo do Documento
        <select
          className="rounded-md border border-gray-700/50 bg-white p-2 text-lg text-black"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {Object.entries(documentTypeNames).map(([key, val]) => (
            <option value={key} key={key}>
              {val}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-gray-700">
        Link
        <input
          type="text"
          placeholder="https://docs.google.com/..."
          className={`rounded-md border ${
            error ? "border-red-500/60" : "border-gray-700/50"
          } p-2 text-lg text-black`}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div>
          Garanta que o documento está compartilhado com TODOS na Escola Móbile
        </div>
      </label>
      <button
        onClick={onSubmit}
        className="mt-2 rounded-md bg-green-600 p-4 text-white"
      >
        Criar Documento
      </button>
    </>
  );
};

export default DocumentsPage;
