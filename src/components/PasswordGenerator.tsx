"use client";

import { useState, useEffect, useRef } from "react";

const excludeLookAlikes = ["I", "l", "1", "O", "0"];

const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(
  ""
);
const numbers = "0123456789".split("");
const symbols = "!@#$%^&*()_+~`|}{[]:;?><,./-=".split("");

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [useLetters, setUseLetters] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [excludeLookalikes, setExcludeLookalikes] = useState(true);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    generatePassword();
  }, []);

  function generatePassword() {
    let charPool: string[] = [];
    if (useLetters) charPool = charPool.concat(letters);
    if (useNumbers) charPool = charPool.concat(numbers);
    if (useSymbols) charPool = charPool.concat(symbols);

    if (excludeLookalikes) {
      charPool = charPool.filter((ch) => !excludeLookAlikes.includes(ch));
    }

    if (charPool.length === 0) {
      setPassword("");
      return;
    }

    let pw = "";
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * charPool.length);
      pw += charPool[idx];
    }
    setPassword(pw);
    setCopied(false);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
  }

  async function copyToClipboard() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    timeoutRef.current = setTimeout(() => setCopied(false), 15000);
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow space-y-6">
      <h2 className="text-xl font-semibold">Password Generator</h2>

      <div>
        <label className="block mb-1 font-medium">Length: {length}</label>
        <input
          type="range"
          min={8}
          max={32}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={useLetters}
            onChange={() => setUseLetters(!useLetters)}
            className="mr-2"
          />
          Include Letters
        </label>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={useNumbers}
            onChange={() => setUseNumbers(!useNumbers)}
            className="mr-2"
          />
          Include Numbers
        </label>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={useSymbols}
            onChange={() => setUseSymbols(!useSymbols)}
            className="mr-2"
          />
          Include Symbols
        </label>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={excludeLookalikes}
            onChange={() => setExcludeLookalikes(!excludeLookalikes)}
            className="mr-2"
          />
          Exclude Look-alikes (I, l, 1, O, 0)
        </label>
      </div>

      <div className="flex items-center space-x-4">
        <input
          type="text"
          readOnly
          value={password}
          className="flex-grow p-2 border rounded bg-gray-100"
        />
        <button
          onClick={copyToClipboard}
          disabled={!password}
          className={`px-4 py-2 rounded text-white ${
            copied ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <button
        onClick={generatePassword}
        className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        Generate Password
      </button>
    </div>
  );
}
