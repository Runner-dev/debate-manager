import { signIn, useSession } from "next-auth/react";
import AppBar from "./AppBar";
import NavBar from "./NavBar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { data: sessionData } = useSession();
  if (!sessionData) {
    return <button onClick={() => void signIn()}>Fazer Login</button>;
  }

  return (
    <div className="flex h-screen">
      <div className="h-full w-16">
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
