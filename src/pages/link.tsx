import { type NextPage } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { api } from "~/utils/api";

const LinkPage: NextPage = () => {
  const [codeValue, setCodeValue] = useState("");
  const linkCode = api.delegateCode.linkCode.useMutation();
  const router = useRouter();
  const [error, setError] = useState(false);
  const { data: userData } = api.userData.getUserData.useQuery();

  if (userData?.delegate || userData?.chair) {
    void router.replace("/");
  }

  const onSubmit = () => {
    linkCode
      .mutateAsync(codeValue)
      .then(() => router.push("/"))
      .catch(() => {
        setError(true);
        setCodeValue("");
      });
  };

  return (
    <main className="flex h-screen w-full items-start justify-center">
      <div className="mt-16 rounded-lg bg-gray-100 p-8">
        <h1 className="mb-8 text-center text-2xl font-medium">
          Escolher Delegado
        </h1>
        <label className="flex flex-col gap-2 text-gray-700">
          Código
          <input
            value={codeValue}
            onChange={(e) => setCodeValue(e.target.value)}
            type="text"
            className={`rounded-md border p-2 text-lg text-black ${
              error
                ? "border-red-500 placeholder:text-red-400/80"
                : "border-gray-600"
            }`}
            placeholder="AT0000"
          />
        </label>
        <button
          className="mt-4 w-full rounded-md bg-blue-500 py-4 text-white"
          onClick={onSubmit}
        >
          Conectar
        </button>
      </div>
    </main>
  );
};

export default LinkPage;
