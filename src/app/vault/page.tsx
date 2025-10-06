"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { encrypt, decrypt } from "@/lib/crypto";

interface VaultItem {
  _id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
}

export default function Vault() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vault, setVault] = useState<VaultItem[]>([]);
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [form, setForm] = useState({
    title: "",
    username: "",
    password: "",
    url: "",
    notes: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
    } else {
      fetchVault(token);
    }
  }, [router]);

  async function fetchVault(token: string) {
    setLoading(true);
    const res = await fetch("/api/vault", {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await res.json();
    if (res.ok) {
      const decrypted = data.map((item: VaultItem) => ({
        ...item,
        title: decrypt(item.title),
        username: decrypt(item.username),
        password: decrypt(item.password),
        url: decrypt(item.url),
        notes: decrypt(item.notes),
      }));
      setVault(decrypted);
    } else {
      router.push("/auth/login");
    }
    setLoading(false);
  }

  function resetForm() {
    setForm({
      title: "",
      username: "",
      password: "",
      url: "",
      notes: "",
    });
    setEditingItem(null);
  }

  function onEdit(item: VaultItem) {
    setEditingItem(item);
    setForm({
      title: item.title,
      username: item.username,
      password: item.password,
      url: item.url,
      notes: item.notes,
    });
  }

  async function saveItem() {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const encryptedItem = {
      title: encrypt(form.title),
      username: encrypt(form.username),
      password: encrypt(form.password),
      url: encrypt(form.url),
      notes: encrypt(form.notes),
    };

    let res;
    if (editingItem) {
      res = await fetch("/api/vault", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ _id: editingItem._id, ...encryptedItem }),
      });
    } else {
      res = await fetch("/api/vault", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(encryptedItem),
      });
    }

    if (res.ok) {
      resetForm();
      fetchVault(token);
    } else {
      alert("Failed to save item");
    }
  }

  async function deleteItem(id: string) {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    if (!confirm("Delete this item?")) return;

    const res = await fetch(`/api/vault?id=${id}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (res.ok) {
      fetchVault(token);
    } else {
      alert("Failed to delete item");
    }
  }

  const filteredVault = vault.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.username.toLowerCase().includes(search.toLowerCase()) ||
      item.url.toLowerCase().includes(search.toLowerCase())
  );

  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyPassword(id: string, password: string) {
    await navigator.clipboard.writeText(password);
    setCopiedId(id);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 15000);
  }

  async function exportVault() {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/auth/login");

    const res = await fetch("/api/vault/export", {
      headers: { Authorization: "Bearer " + token },
    });

    if (!res.ok) {
      alert("Failed to export vault");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vault-export.json";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function importVault(e: React.ChangeEvent<HTMLInputElement>) {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/auth/login");

    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    let entries;
    try {
      entries = JSON.parse(text);
    } catch {
      alert("Invalid JSON file");
      return;
    }

    const res = await fetch("/api/vault/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(entries),
    });

    if (res.ok) {
      alert("Vault imported successfully");
      fetchVault(token);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      alert("Failed to import vault");
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your Vault</h1>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={() => {
            localStorage.removeItem("token");
            router.push("/auth/login");
          }}
        >
          Sign Out
        </button>
      </div>

      <div className="flex justify-between mb-4">
        <button
          onClick={exportVault}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Export Vault
        </button>
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          onChange={importVault}
          className="hidden"
          id="vault-import"
        />
        <label
          htmlFor="vault-import"
          className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Import Vault
        </label>
      </div>

      <input
        type="text"
        placeholder="Search vault..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-6 p-2 border rounded"
      />

      <div className="mb-6 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">
          {editingItem ? "Edit Vault Item" : "Add New Vault Item"}
        </h2>
        <input
          type="text"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          type="text"
          placeholder="URL"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          className="w-full mb-2 p-2 border rounded"
        />
        <textarea
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full mb-2 p-2 border rounded"
          rows={3}
        />
        <div className="flex space-x-4">
          <button
            onClick={saveItem}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            {editingItem ? "Update Item" : "Add Item"}
          </button>
          {editingItem && (
            <button
              onClick={resetForm}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-4 py-2">Title</th>
              <th className="border border-gray-300 px-4 py-2">Username</th>
              <th className="border border-gray-300 px-4 py-2">Password</th>
              <th className="border border-gray-300 px-4 py-2">URL</th>
              <th className="border border-gray-300 px-4 py-2">Notes</th>
              <th className="border border-gray-300 px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVault.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">
                  {item.title}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {item.username}
                </td>
                <td className="border border-gray-300 px-4 py-2 break-words max-w-xs">
                  {item.password}
                  <button
                    onClick={() => copyPassword(item._id, item.password)}
                    className="ml-2 text-sm text-blue-600 hover:underline"
                  >
                    {copiedId === item._id ? "Copied!" : "Copy"}
                  </button>
                </td>
                <td className="border border-gray-300 px-4 py-2">{item.url}</td>
                <td className="border border-gray-300 px-4 py-2 break-words max-w-xs">
                  {item.notes}
                </td>
                <td className="border border-gray-300 px-4 py-2 space-x-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteItem(item._id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredVault.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-500">
                  No matching vault items.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
