import { type NextPage } from "next";
import { useState } from "react";
import { api } from "~/utils/api";
import { dbSeedSchema } from "~/utils/dbSeed";

const DatabaseData: NextPage = () => {
  const seedDb = api.seedDb.seed.useMutation();
  const [textState, setTextState] = useState("");

  const onClick = () => {
    try {
      const data = dbSeedSchema.parse(JSON.parse(textState));
      seedDb.mutate(data);
    } catch (e: unknown) {
      alert(e);
    }
  };

  return (
    <main>
      <textarea
        placeholder="Dados"
        className="w-full"
        value={textState}
        onChange={(e) => setTextState(e.target.value)}
      ></textarea>
      <button onClick={onClick}>Enviar Dados</button>
    </main>
  );
};

export default DatabaseData;
