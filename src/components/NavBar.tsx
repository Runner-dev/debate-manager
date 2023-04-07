import { signOut } from "next-auth/react";
import Link from "next/link";
import Home from "~/icons/Home";
import RaisedHand from "~/icons/RaisedHand";
import SignOut from "~/icons/SignOut";

const items: Array<{
  name: string;
  href: string;
  Icon: React.FC<{ className?: string }>;
}> = [
  { name: "Início", href: "/", Icon: Home },
  { name: "Moções", href: "/motions", Icon: RaisedHand },
];

const NavBar = () => {
  return (
    <div className="flex h-full flex-col gap-8 bg-gray-100 pt-16">
      {items.map(({ href, name, Icon }) => (
        <Link key={href} className="flex flex-col items-center" href={href}>
          <Icon className="mb-2 w-10" />
          {name}
        </Link>
      ))}
      <button
        onClick={() => void signOut()}
        className="flex flex-col items-center"
      >
        <SignOut className="w-10" />
        Sair
      </button>
    </div>
  );
};

export default NavBar;
