import {
  type Chair,
  type Country,
  type Delegate,
  type User,
} from "@prisma/client";
import { signOut } from "next-auth/react";
import Link from "next/link";
import Envelope from "~/icons/Envelope";
import Folder from "~/icons/Folder";
import Home from "~/icons/Home";
import NewsPaper from "~/icons/NewsPaper";
import RaisedHand from "~/icons/RaisedHand";
import SignOut from "~/icons/SignOut";
import Star from "~/icons/Star";
import { api } from "~/utils/api";

const items: Array<{
  name: string;
  href: string;
  Icon: React.FC<{ className?: string }>;
  target?: string;
  visible?: ({
    userData,
  }: {
    userData:
      | (User & {
          chair: Chair | null;
          delegate: (Delegate & { country: Country }) | null;
        })
      | null
      | undefined;
  }) => boolean;
}> = [
  { name: "Início", href: "/", Icon: Home },
  { name: "Moções", href: "/motions", Icon: RaisedHand },
  {
    name: "Falas",
    href: "/speeches",
    Icon: Star,
    visible: ({ userData }) => Boolean(userData?.chair),
  },
  {
    name: "Docs",
    href: "/documents",
    Icon: Folder,
  },
  {
    name: "Imprensa",
    href: "https://ig.me/m/imprensa.debates",
    target: "blank",
    Icon: NewsPaper,
  },
  {
    name: "Correio Elegante",
    href: "https://docs.google.com/forms/d/e/1FAIpQLSfuscbnhfD-PaY6ly1S52rf8LYyNcknAUlAxRYAOSKMFp8F8g/viewform?usp=sf_link",
    target: "blank",
    Icon: Envelope,
  },
  {
    name: "Dele Awards",
    href: "https://docs.google.com/forms/d/e/1FAIpQLScwHOTNhTco3C6hKYWOacNVaNchRgndIVXw3loYHPoIOzJBXg/viewform?usp=sf_link",
    target: "blank",
    Icon: Star,
  },
];

const NavBar = () => {
  const { data: userData } = api.userData.getUserData.useQuery();

  return (
    <div className="fixed flex h-full w-20 flex-col gap-6 overflow-y-auto bg-gray-100 pt-16">
      {items.map(({ href, name, Icon, visible, target }) =>
        !visible || visible({ userData }) ? (
          <Link
            key={href}
            className="flex flex-col items-center text-center leading-snug"
            target={target}
            href={href}
          >
            <Icon className="mb-2 w-10" />
            {name}
          </Link>
        ) : null
      )}
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
