import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import AppBar from "./AppBar";
import NavBar from "./NavBar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { data: sessionData } = useSession();
  const { data: userData } = api.userData.getUserData.useQuery();
  if (!sessionData) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-gray-200">
        <div className="flex flex-col gap-8 rounded-lg bg-white p-8">
          <h1 className="text-2xl font-medium">Site do Debatendo</h1>
          <button
            className="w-full rounded-md bg-blue-500 py-2 text-white"
            onClick={() => void signIn()}
          >
            Fazer Login
          </button>
        </div>
      </main>
    );
  }

  if (router.pathname.endsWith("link")) {
    return <>{children}</>;
  }

  if (
    userData &&
    !userData.delegate &&
    !userData.chair &&
    !router.pathname.endsWith("databaseData")
  ) {
    void router.push("/link");
  }

  return (
    <div className="flex h-screen">
      <div className="h-screen w-20 overflow-y-auto">
        <NavBar />
      </div>
      <div className="flex w-full flex-col">
        <AppBar />
        {children}
      </div>
    </div>
  );
};

export default Layout;
