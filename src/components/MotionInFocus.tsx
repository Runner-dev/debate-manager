import { api } from "~/utils/api";
import { motionNames, type TypedMotion } from "~/utils/motion";

const h3ClassName = "text-2xl";
const divClassName = "p-2 bg-gray-200 mt-2 border-gray-600 border-1 rounded-md";

const MotionInFocus = ({
  motion,
  chair,
}: {
  motion: TypedMotion;
  chair: boolean;
}) => {
  const deleteMotion = api.motions.deleteMotion.useMutation();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-3xl font-medium">
        Moção para {motionNames[motion.type]}
      </h2>
      {"topic" in motion && (
        <div>
          <h3 className={h3ClassName}>Tópico</h3>
          <div className={divClassName}>{motion.topic}</div>
        </div>
      )}
      {"duration" in motion && (
        <div>
          <h3 className={h3ClassName}>Duração</h3>
          <div className={divClassName}>{motion.duration}</div>
        </div>
      )}
      {"speechDuration" in motion && (
        <div>
          <h3 className={h3ClassName}>Duração da Fala</h3>
          <div className={divClassName}>{motion.speechDuration}</div>
        </div>
      )}
      {"note" in motion && (
        <div>
          <h3 className={h3ClassName}>Explicação</h3>
          <div className={divClassName}>{motion.note}</div>
        </div>
      )}
      {chair && (
        <div className="mt-8 grid w-full grid-cols-2 gap-4 text-center text-white">
          <div className="rounded-md bg-red-500 p-4">
            <button onClick={() => deleteMotion.mutate(motion.id)}>
              Apagar
            </button>
          </div>
          <div className="rounded-md bg-green-500 p-4">
            <button onClick={() => deleteMotion.mutate(motion.id)}>
              Aceitar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MotionInFocus;
