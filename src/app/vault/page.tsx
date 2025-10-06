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

  return (
    <div className="container vault">
      <div
        className="flex"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <h1>Your Vault</h1>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            router.push("/auth/login");
          }}
        >
          Sign Out
        </button>
      </div>

      <div className="flex" style={{ marginBottom: "15px", gap: "10px" }}>
        <button onClick={exportVault} style={{ flexGrow: 1 }}>
          Export Vault
        </button>
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          onChange={importVault}
          style={{ display: "none" }}
          id="file-input"
        />
        <label
          htmlFor="file-input"
          style={{
            backgroundColor: "#0070f3",
            color: "white",
            padding: "10px 20px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Import Vault
        </label>
      </div>

      <input
        type="text"
        placeholder="Search vault..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: "8px", marginBottom: "15px" }}
      />

      <div className="vault-form">
        <h2>{editingItem ? "Edit Vault Item" : "Add New Vault Item"}</h2>
        <input
          type="text"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <input
          type="text"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          type="text"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <input
          type="text"
          placeholder="URL"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
        />
        <textarea
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={saveItem} style={{ flexGrow: 1 }}>
            {editingItem ? "Update Item" : "Add Item"}
          </button>
          {editingItem && (
            <button onClick={resetForm} style={{ flexGrow: 1 }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: "15%" }}>Title</th>
            <th style={{ width: "15%" }}>Username</th>
            <th style={{ width: "25%" }}>Password</th>
            <th style={{ width: "15%" }}>URL</th>
            <th style={{ width: "20%" }}>Notes</th>
            <th style={{ width: "10%" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredVault.map((item) => (
            <tr key={item._id}>
              <td>{item.title}</td>
              <td>{item.username}</td>
              <td>
                {item.password}
                <button
                  className="copy-btn"
                  onClick={() => copyPassword(item._id, item.password)}
                >
                  {copiedId === item._id ? "Copied!" : "Copy"}
                </button>
              </td>
              <td>{item.url}</td>
              <td>{item.notes}</td>
              <td>
                <button onClick={() => onEdit(item)}>Edit</button>
                <button onClick={() => deleteItem(item._id)}>Delete</button>
              </td>
            </tr>
          ))}
          {filteredVault.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "10px" }}>
                No matching vault items.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  async function exportVault() {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }
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
    if (!token) {
      router.push("/auth/login");
      return;
    }
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
}
