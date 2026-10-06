"use client";

import React, { useEffect, useState, useRef } from "react";
import { ShieldAlert, UserCog, Edit, Trash2, Plus, X, Search, CheckCircle, Loader2, Building, Store, Eye, EyeOff, KeyRound, User as UserIcon, Shield, Sliders } from "lucide-react";
import { RolePermissionTab } from "@/components/admin/role-permission-tab";
import { UserOverrideTab } from "@/components/admin/user-override-tab";

interface User {
  id: string;
  nik: string | null;
  name: string;
  email: string | null;
  systemRole: "ADMIN" | "USER";
  businessRole: string | null;
  scope: "HO" | "BRANCH" | null;
  branch: string | null;
  status: "ACTIVE" | "INACTIVE";
  source: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "overrides">("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSystemRole, setFilterSystemRole] = useState("");
  const [filterScope, setFilterScope] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [editForm, setEditForm] = useState<Partial<User> & { password?: string; confirmPassword?: string }>({
    name: "",
    nik: "",
    email: "",
    systemRole: "USER",
    businessRole: "tim_toko",
    scope: "BRANCH",
    branch: "",
    status: "ACTIVE",
    password: "",
    confirmPassword: ""
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);

  // Search Branch/Store State
  const [branchQuery, setBranchQuery] = useState("");
  const [branchResults, setBranchResults] = useState<any[]>([]);
  const [isSearchingBranch, setIsSearchingBranch] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [selectedLocationObj, setSelectedLocationObj] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = users;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(u => 
        u.name.toLowerCase().includes(lower) || 
        (u.nik && u.nik.toLowerCase().includes(lower)) ||
        (u.email && u.email.toLowerCase().includes(lower))
      );
    }
    if (filterSystemRole) {
      result = result.filter(u => u.systemRole === filterSystemRole);
    }
    if (filterScope) {
      result = result.filter(u => u.scope === filterScope);
    }
    setFilteredUsers(result);
  }, [users, searchTerm, filterSystemRole, filterScope]);

  // Click outside to close branch dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for branches/stores
  useEffect(() => {
    if (!branchQuery.trim() || branchQuery.length < 2) {
      setBranchResults([]);
      setIsSearchingBranch(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    // Don't search if the query is just showing the selected location label
    if (selectedLocationObj && branchQuery.includes(selectedLocationObj.kode_toko || selectedLocationObj.cabang)) {
      return;
    }

    const delay = setTimeout(async () => {
      setIsSearchingBranch(true);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch(`/api/stores/search?q=${encodeURIComponent(branchQuery)}&limit=15`, {
          signal: abortControllerRef.current.signal
        });
        if (res.ok) {
          const data = await res.json();
          setBranchResults(data.data || []);
          setIsBranchDropdownOpen(true);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Failed to search stores:", err);
        }
      } finally {
        setIsSearchingBranch(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [branchQuery, selectedLocationObj]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        if (res.status === 403) throw new Error("Akses ditolak. Anda bukan Admin.");
        throw new Error("Gagal memuat data user.");
      }
      const json = await res.json();
      setUsers(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormMode("CREATE");
    setEditForm({
      name: "",
      nik: "",
      email: "",
      systemRole: "USER",
      businessRole: "tim_toko",
      scope: "BRANCH",
      branch: "",
      status: "ACTIVE",
      password: "",
      confirmPassword: ""
    });
    setFormError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsResetPasswordOpen(false);
    setBranchQuery("");
    setSelectedLocationObj(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (user: User) => {
    setFormMode("EDIT");
    setEditForm({
      id: user.id,
      name: user.name,
      nik: user.nik,
      email: user.email,
      systemRole: user.systemRole,
      businessRole: user.businessRole,
      scope: user.scope,
      branch: user.branch,
      status: user.status,
      password: "",
      confirmPassword: ""
    });
    setFormError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsResetPasswordOpen(false);
    
    // Resolve location name for edit
    if (user.scope === "BRANCH" && user.branch) {
      setBranchQuery(user.branch); // Fallback
      setIsSearchingBranch(true);
      try {
        const res = await fetch(`/api/stores/search?q=${encodeURIComponent(user.branch)}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            const loc = data.data[0];
            setSelectedLocationObj(loc);
            setBranchQuery(`${loc.kode_toko || loc.cabang} — ${loc.nama_toko || loc.alamat || "Cabang"}`);
          }
        }
      } catch (e) {} finally {
        setIsSearchingBranch(false);
      }
    } else {
      setBranchQuery("");
      setSelectedLocationObj(null);
    }
    
    setIsModalOpen(true);
  };

  const handleLocationSelect = (loc: any) => {
    const code = loc.kode_toko || loc.cabang;
    setSelectedLocationObj(loc);
    setBranchQuery(`${code} — ${loc.nama_toko || "Cabang"}`);
    setEditForm({ ...editForm, branch: code });
    setIsBranchDropdownOpen(false);
  };

  const handleBusinessRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value;
    let newScope: "HO" | "BRANCH" = "BRANCH";
    let newBranch = editForm.branch;

    if (["ho_admin", "gm_ho", "sm_ho"].includes(role)) {
      newScope = "HO";
      newBranch = null;
      setBranchQuery("");
      setSelectedLocationObj(null);
    }

    setEditForm({
      ...editForm,
      businessRole: role,
      scope: newScope,
      branch: newBranch
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Inline validation
    if (!editForm.name?.trim()) {
      setFormError("Nama lengkap wajib diisi.");
      return;
    }
    if (editForm.systemRole !== "ADMIN" && editForm.scope === "BRANCH" && !editForm.branch) {
      setFormError("Cabang atau toko wajib dipilih untuk scope BRANCH.");
      return;
    }
    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      setFormError("Format email tidak valid.");
      return;
    }

    // Password validation for CREATE mode
    if (formMode === "CREATE") {
      if (!editForm.password || !editForm.password.trim()) {
        setFormError("Password wajib diisi.");
        return;
      }
      if (editForm.password.length < 8) {
        setFormError("Password minimal 8 karakter.");
        return;
      }
      if (editForm.password !== editForm.confirmPassword) {
        setFormError("Konfirmasi password tidak sesuai.");
        return;
      }
    }

    // Password validation for EDIT mode
    if (formMode === "EDIT" && isResetPasswordOpen) {
      if (!editForm.password || !editForm.password.trim()) {
        setFormError("Password baru wajib diisi jika ingin mereset password.");
        return;
      }
      if (editForm.password.length < 8) {
        setFormError("Password minimal 8 karakter.");
        return;
      }
      if (editForm.password !== editForm.confirmPassword) {
        setFormError("Konfirmasi password tidak sesuai.");
        return;
      }
    }

    try {
      const isCreate = formMode === "CREATE";
      const url = isCreate ? "/api/admin/users" : `/api/admin/users/${editForm.id}`;
      const method = isCreate ? "POST" : "PATCH";

      const payload: any = { ...editForm };
      if (!isCreate && (!isResetPasswordOpen || !editForm.password)) {
        delete payload.password;
        delete payload.confirmPassword;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Gagal menyimpan data");
      }

      await fetchUsers();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini? Ini hanya akan menghapus user lokal.")) return;
    try {
      setIsDeleting(id);
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Gagal menghapus user");
      }
      await fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-500 dark:text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Memuat data user...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-6 rounded-2xl flex items-center gap-4 max-w-2xl mx-auto shadow-sm border border-red-100 dark:border-red-900/50">
          <ShieldAlert className="w-8 h-8" />
          <div>
            <h2 className="font-bold text-lg">Akses Ditolak</h2>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-sm border border-slate-800 dark:border-slate-700">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Manajemen User & Role</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Pengaturan akses dan ruang lingkup pengguna SPARTA SIAGA</p>
            </div>
          </div>
          {activeTab === "users" && (
            <button 
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Tambah User
            </button>
          )}
        </div>

        {/* 3 Tabs Navigation Bar */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "users"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            User
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "roles"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Shield className="w-4 h-4" />
            Hak Akses Role
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("overrides")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "overrides"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Akses Khusus User
          </button>
        </div>

        {activeTab === "users" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input 
                type="text" 
                placeholder="Cari nama, NIK, atau email..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              />
            </div>
            <select 
              value={filterSystemRole} 
              onChange={e => setFilterSystemRole(e.target.value)}
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua System Role</option>
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>
            <select 
              value={filterScope} 
              onChange={e => setFilterScope(e.target.value)}
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Scope</option>
              <option value="HO">HO</option>
              <option value="BRANCH">BRANCH</option>
            </select>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">User</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Kontak</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">System Role</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Business Role</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Scope / Branch</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-200">{user.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">NIK: {user.nik || "-"}</div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <div className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{user.email || "-"}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">{user.source}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold ${user.systemRole === "ADMIN" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                        {user.systemRole}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {user.systemRole === "ADMIN" ? "-" : user.businessRole}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-xs dark:text-slate-200">
                          {user.systemRole === "ADMIN" ? "-" : user.scope}
                        </span>
                        {user.systemRole !== "ADMIN" && user.scope === "BRANCH" && (
                          <>
                            <span className="text-slate-400 dark:text-slate-600 mx-1">•</span>
                            <span className="text-slate-600 dark:text-slate-400">{user.branch}</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${user.status === "ACTIVE" ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400" : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"}`}>
                        {user.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(user)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors" title="Edit User">
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.source === "LOCAL" && (
                          <button 
                            onClick={() => handleDelete(user.id)} 
                            disabled={isDeleting === user.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors disabled:opacity-50" 
                            title="Delete Local User"
                          >
                            {isDeleting === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="text-slate-400 dark:text-slate-500 mb-2">Belum ada pengguna.</div>
                      <button onClick={handleOpenCreate} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                        + Tambah User
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {activeTab === "roles" && (
          <RolePermissionTab />
        )}

        {activeTab === "overrides" && (
          <UserOverrideTab />
        )}
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-1 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-xl text-slate-900 dark:text-white">
                  {formMode === "CREATE" ? "Tambah User Baru" : "Edit Data User"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Informasi dan hak akses pengguna SPARTA SIAGA</p>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              <form id="user-form" onSubmit={handleSave} className="space-y-8">
                {formError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/50 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Section: Data Pengguna */}
                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Data Pengguna</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Lengkap *</label>
                      <input required value={editForm.name || ""} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-slate-50 hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-slate-100" placeholder="John Doe" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">NIK</label>
                      <input value={editForm.nik || ""} onChange={e => setEditForm({...editForm, nik: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-slate-50 hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-slate-100" placeholder="Mis. 12345678" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email / Username</label>
                    <input type="email" value={editForm.email || ""} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-slate-50 hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-slate-100" placeholder="john.doe@alfamart.com" />
                  </div>

                  {/* Password fields for CREATE mode */}
                  {formMode === "CREATE" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password *</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={editForm.password || ""}
                            onChange={e => setEditForm({...editForm, password: e.target.value})}
                            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-2.5 text-sm bg-slate-50 hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-slate-100"
                            placeholder="Min. 8 karakter"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Konfirmasi Password *</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            value={editForm.confirmPassword || ""}
                            onChange={e => setEditForm({...editForm, confirmPassword: e.target.value})}
                            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-2.5 text-sm bg-slate-50 hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-slate-100"
                            placeholder="Ulangi password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Password Reset for EDIT mode */}
                  {formMode === "EDIT" && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetPasswordOpen(!isResetPasswordOpen);
                          setEditForm({ ...editForm, password: "", confirmPassword: "" });
                        }}
                        className="inline-flex items-center gap-2 text-xs font-bold text-[#1D5AA6] dark:text-blue-400 hover:underline"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        {isResetPasswordOpen ? "Batal Ubah Password" : "Reset / Ubah Password"}
                      </button>

                      {isResetPasswordOpen && (
                        <div className="mt-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3 animate-in fade-in slide-in-from-top-1">
                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Masukkan password baru untuk user ini (minimal 8 karakter).
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password Baru *</label>
                              <div className="relative">
                                <input
                                  type={showPassword ? "text" : "password"}
                                  value={editForm.password || ""}
                                  onChange={e => setEditForm({...editForm, password: e.target.value})}
                                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-2.5 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-slate-100"
                                  placeholder="Min. 8 karakter"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Konfirmasi Password Baru *</label>
                              <div className="relative">
                                <input
                                  type={showConfirmPassword ? "text" : "password"}
                                  value={editForm.confirmPassword || ""}
                                  onChange={e => setEditForm({...editForm, confirmPassword: e.target.value})}
                                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-2.5 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-slate-100"
                                  placeholder="Ulangi password baru"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section: Akses & Peran */}
                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Akses & Peran</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">System Role</label>
                      <select 
                        value={editForm.systemRole || "USER"} 
                        disabled={true}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-70 text-slate-900 dark:text-slate-100"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      <div className="text-[10px] text-slate-500 mt-1">System Role ditentukan otomatis oleh sistem.</div>
                    </div>

                    {editForm.systemRole !== "ADMIN" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Business Role *</label>
                        <select value={editForm.businessRole || ""} onChange={handleBusinessRoleChange} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-slate-100">
                          <option value="ho_admin">HO Admin</option>
                          <option value="gm_ho">GM HO</option>
                          <option value="sm_ho">SM HO</option>
                          <option value="bm">Branch Manager</option>
                          <option value="tim_toko">Tim Toko</option>
                          <option value="sparta_maintenance">Sparta Maintenance</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section: Penempatan */}
                {editForm.systemRole !== "ADMIN" && (
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Penempatan</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Scope</label>
                        <select 
                          value={editForm.scope || "BRANCH"} 
                          disabled={true} 
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-70 text-slate-900 dark:text-slate-100"
                        >
                          <option value="BRANCH">BRANCH (Cabang/Toko)</option>
                          <option value="HO">HO (Head Office)</option>
                        </select>
                        <div className="text-[10px] text-slate-500 mt-1">Scope terisi otomatis dari Business Role.</div>
                      </div>
                      
                      {editForm.scope === "BRANCH" && (
                        <div className="space-y-1.5 relative" ref={dropdownRef}>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cabang / Toko *</label>
                          <div className="relative">
                            <input 
                              placeholder="Cari kode atau nama cabang/toko..." 
                              value={branchQuery} 
                              onChange={e => {
                                setBranchQuery(e.target.value);
                                // clear selected branch if user types manually
                                if (editForm.branch) {
                                  setEditForm({ ...editForm, branch: "" });
                                }
                                setIsBranchDropdownOpen(true);
                              }} 
                              onFocus={() => {
                                if (branchQuery.length >= 2) setIsBranchDropdownOpen(true);
                              }}
                              className={`w-full border ${(!editForm.branch && branchQuery) ? 'border-amber-400' : 'border-slate-200 dark:border-slate-700'} rounded-xl pl-10 pr-4 py-2.5 text-sm bg-slate-50 hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-slate-100`}
                            />
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            
                            {/* Search Dropdown */}
                            {isBranchDropdownOpen && (branchQuery.length >= 2 || isSearchingBranch) && (
                              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto text-sm animate-in fade-in slide-in-from-top-2">
                                {isSearchingBranch ? (
                                  <div className="p-4 text-center text-slate-500 flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Mencari...
                                  </div>
                                ) : branchResults.length > 0 ? (
                                  <ul className="py-1">
                                    {branchResults.map((loc, idx) => {
                                      const code = loc.kode_toko || loc.cabang;
                                      const name = loc.nama_toko || loc.alamat || "Cabang";
                                      return (
                                        <li 
                                          key={idx} 
                                          onClick={() => handleLocationSelect(loc)}
                                          className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex flex-col border-b border-slate-50 dark:border-slate-800/50 last:border-0"
                                        >
                                          <div className="font-bold text-slate-800 dark:text-slate-200">{code}</div>
                                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{name}</div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <div className="p-4 text-center text-slate-500">Lokasi tidak ditemukan</div>
                                )}
                              </div>
                            )}
                          </div>
                          {editForm.scope === "BRANCH" && !editForm.branch && branchQuery && !isBranchDropdownOpen && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-500 mt-1 flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> Silakan pilih dari dropdown suggestion
                            </div>
                          )}
                          {branchQuery.length < 2 && (
                            <div className="text-[10px] text-slate-400 mt-1">Ketik minimal 2 karakter untuk mencari</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section: Status */}
                <div className="space-y-4">
                  <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Status</h3>
                  <div className="space-y-1.5 w-1/2 pr-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status Akun *</label>
                    <select value={editForm.status || "ACTIVE"} onChange={e => setEditForm({...editForm, status: e.target.value as any})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-slate-100">
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">
                Batal
              </button>
              <button type="submit" form="user-form" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
                <CheckCircle className="w-4 h-4" /> {formMode === "CREATE" ? "Simpan User" : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
