import React, { useState, useMemo } from "react";
import { api } from "~/utils/api";
import {
  baseMotionSchema,
  motionNames,
  motionSchemas,
  type MotionTypes,
} from "~/utils/motion";
import Modal from "./Modal";

const NewMotionModal = ({
  visible,
  onRequestClose,
}: {
  visible: boolean;
  onRequestClose: () => void;
}) => {
  const createMotion = api.motions.createMotion.useMutation();

  const [type, setMotionType] = useState<MotionTypes>("moderated");
  const currentMotionSchema = useMemo(() => motionSchemas[type], [type]);

  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(300);
  const [speechDuration, setSpeechDuration] = useState(60);
  const [note, setNote] = useState("");
  const reset = () => {
    setTopic("");
    setDuration(300);
    setSpeechDuration(60);
    setNote("");
    setMotionType("moderated");
  };

  const actualOnRequestClose = () => {
    reset();
    onRequestClose();
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={actualOnRequestClose}
      className="flex w-4/5 max-w-md flex-col gap-4"
    >
      <h1 className="mb-4 text-4xl font-medium">Nova Moção</h1>
      <label className="flex flex-col text-gray-700">
        Tipo de Moção
        <select
          className="rounded-lg p-2 text-lg text-black"
          value={type}
          onChange={(e) => {
            setMotionType(e.target.value as MotionTypes);
          }}
        >
          {Object.entries(motionNames).map(([key, value]) => (
            <option value={key} key={key}>
              {value}
            </option>
          ))}
        </select>
      </label>
      {"topic" in currentMotionSchema.shape && (
        <label key={"topic"} className="flex flex-col text-gray-700">
          Tópico
          <input
            className="rounded-lg p-2 text-lg text-black"
            type="text"
            placeholder="Tópico"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>
      )}
      {"duration" in currentMotionSchema.shape && (
        <label key="duration" className="flex flex-col text-gray-700">
          Duração
          <input
            className="rounded-lg p-2 text-lg text-black"
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
          />
        </label>
      )}
      {"speechDuration" in currentMotionSchema.shape && (
        <label key="speechDuration" className="flex flex-col text-gray-700">
          Duração da Fala
          <input
            className="rounded-lg p-2 text-lg text-black"
            type="number"
            value={speechDuration}
            onChange={(e) => setSpeechDuration(parseInt(e.target.value))}
          />
        </label>
      )}
      {"note" in currentMotionSchema.shape && (
        <label className="flex flex-col text-gray-700">
          Explicação
          <textarea
            className="rounded-lg p-2 text-lg text-black"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      )}
      <button
        onClick={() => {
          const data = baseMotionSchema.parse({
            type,
            note,
            duration,
            speechDuration,
            topic,
          });
          createMotion.mutate(data);
          actualOnRequestClose();
        }}
        className="w-full rounded-md bg-green-600 p-4 text-white"
      >
        Criar Moção
      </button>
    </Modal>
  );
};

export default NewMotionModal;
