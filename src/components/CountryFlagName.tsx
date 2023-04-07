import { type Country } from "@prisma/client";

const CountryFlagName = ({
  country,
  small = false,
  inverted = false,
}: {
  country: Country;
  small?: boolean;
  inverted?: boolean;
}) => {
  return (
    <div className={`flex items-center ${small ? "gap-2" : "gap-4"} text-xl`}>
      {inverted && country.shortName}
      <img
        className={`${
          small ? "h-6 w-6" : "h-10 w-10"
        } rounded-full object-cover shadow-md`}
        src={country.flag}
      />
      {!inverted && country.shortName}
    </div>
  );
};
export default CountryFlagName;
