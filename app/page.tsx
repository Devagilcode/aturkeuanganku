"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type TransactionType = "income" | "expense";

type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
};

type Budget = {
  category: string;
  monthly_limit: number;
};

type SavingsGoal = {
  id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  created_at: string;
};

const expenseCategories = ["Makan", "Bensin", "Jajan", "Main", "Belanja", "Tagihan", "Kebutuhan lain"];
const incomeCategories = ["Gaji", "Freelance", "Bonus", "Hadiah", "Pemasukan lain"];

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false;
  const transaction = value;
  if (typeof transaction.id !== "string" || !transaction.id) return false;
  if (transaction.type !== "income" && transaction.type !== "expense") return false;
  if (typeof transaction.amount !== "number" || !Number.isSafeInteger(transaction.amount) || transaction.amount <= 0) return false;
  const categories = transaction.type === "income" ? incomeCategories : expenseCategories;
  if (typeof transaction.category !== "string" || !categories.includes(transaction.category)) return false;
  if (typeof transaction.note !== "string" || transaction.note.length > 80) return false;
  if (typeof transaction.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) return false;
  const parsedDate = new Date(`${transaction.date}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === transaction.date;
}

function isTransactionList(value: unknown): value is Transaction[] {
  return Array.isArray(value) && value.every(isTransaction);
}

function isBudgetList(value: unknown): value is Budget[] {
  return Array.isArray(value) && value.every((item) =>
    isRecord(item)
    && typeof item.category === "string"
    && expenseCategories.includes(item.category)
    && typeof item.monthly_limit === "number"
    && Number.isSafeInteger(item.monthly_limit)
    && item.monthly_limit > 0,
  );
}

function isSavingsGoalList(value: unknown): value is SavingsGoal[] {
  return Array.isArray(value) && value.every((item) =>
    isRecord(item)
    && typeof item.id === "string"
    && typeof item.title === "string"
    && item.title.trim().length > 0
    && item.title.length <= 60
    && typeof item.target_amount === "number"
    && Number.isSafeInteger(item.target_amount)
    && item.target_amount > 0
    && typeof item.saved_amount === "number"
    && Number.isSafeInteger(item.saved_amount)
    && item.saved_amount >= 0
    && (item.target_date === null || (typeof item.target_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.target_date)))
    && typeof item.created_at === "string",
  );
}

function Icon({
  name,
  size = 20,
}: {
  name: "wallet" | "up" | "down" | "plus" | "search" | "arrow" | "trash" | "chart" | "calendar" | "spark" | "print" | "close" | "home" | "target";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  switch (name) {
    case "wallet":
      return <svg {...common}><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M3 9h18M16 15h.01" /><path d="M6 5V4a2 2 0 0 1 2-2h10" /></svg>;
    case "up":
      return <svg {...common}><path d="M12 19V5m-6 6 6-6 6 6" /></svg>;
    case "down":
      return <svg {...common}><path d="M12 5v14m6-6-6 6-6-6" /></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
    case "arrow":
      return <svg {...common}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
    case "trash":
      return <svg {...common}><path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6" /></svg>;
    case "chart":
      return <svg {...common}><path d="M4 19V5m0 14h17M8 15l4-4 3 2 5-6" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
    case "spark":
      return <svg {...common}><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" /><path d="m19 14 1 2.5 2 1-2 1-1 2.5-1-2.5-2-1 2-1 1-2.5Z" /></svg>;
    case "print":
      return <svg {...common}><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7zM17 11h.01" /></svg>;
    case "close":
      return <svg {...common}><path d="m18 6-12 12M6 6l12 12" /></svg>;
    case "home":
      return <svg {...common}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>;
    case "target":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>;
  }
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><span>D</span><i /></span>;
}

export default function Home() {
  const supabase = useMemo(() => isSupabaseConfigured ? getSupabaseClient() : null, []);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(expenseCategories[0]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [budgetCategory, setBudgetCategory] = useState(expenseCategories[0]);
  const [budgetLimit, setBudgetLimit] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [contributionAmounts, setContributionAmounts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("Semua transaksi");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("Semua waktu");
  const [activeSection, setActiveSection] = useState("home");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showReport, setShowReport] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const authUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      setAuthReady(true);
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setAuthError(`Gagal memeriksa sesi: ${sessionError.message}`);
      const sessionUser = data.session?.user ?? null;
      authUserId.current = sessionUser?.id ?? null;
      setUser(sessionUser);
      setAuthReady(true);
    }).catch((cause: unknown) => {
      if (!active) return;
      setAuthError(cause instanceof Error ? cause.message : "Gagal memeriksa sesi login.");
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      const nextUserId = sessionUser?.id ?? null;
      if (authUserId.current !== nextUserId) {
        setTransactions([]);
        setBudgets([]);
        setSavingsGoals([]);
        setReady(false);
        authUserId.current = nextUserId;
      }
      setUser(sessionUser);
      setAuthReady(true);
      setAuthError("");
      setAuthStatus("");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!authReady) return;
    if (!user || !supabase) {
      setTransactions([]);
      setBudgets([]);
      setSavingsGoals([]);
      setReady(true);
      return;
    }

    let active = true;
    setReady(false);
    setError("");

    void (async () => {
      try {
        const [transactionResult, budgetResult, goalResult] = await Promise.all([
          supabase
            .from("transactions")
            .select("id, type, amount, category, note, date, user_id")
            .order("date", { ascending: false }),
          supabase
            .from("budgets")
            .select("category, monthly_limit")
            .order("category"),
          supabase
            .from("savings_goals")
            .select("id, title, target_amount, saved_amount, target_date, created_at, user_id")
            .order("created_at", { ascending: false }),
        ]);
        if (!active) return;

        const loadErrors: string[] = [];
        if (transactionResult.error) {
          loadErrors.push(`Transaksi: ${transactionResult.error.message}`);
        } else if (transactionResult.data) {
          const loadedTransactions = transactionResult.data.map(({ user_id: _userId, ...transaction }) => transaction);
          if (isTransactionList(loadedTransactions)) setTransactions(loadedTransactions);
          else loadErrors.push("Format data transaksi tidak valid.");
        }

        if (budgetResult.error) {
          loadErrors.push(`Anggaran: ${budgetResult.error.message}`);
        } else if (budgetResult.data) {
          if (isBudgetList(budgetResult.data)) setBudgets(budgetResult.data);
          else loadErrors.push("Format data anggaran tidak valid.");
        }

        if (goalResult.error) {
          loadErrors.push(`Target tabungan: ${goalResult.error.message}`);
        } else if (goalResult.data) {
          const loadedGoals = goalResult.data.map(({ user_id: _userId, ...goal }) => goal);
          if (isSavingsGoalList(loadedGoals)) setSavingsGoals(loadedGoals);
          else loadErrors.push("Format data target tabungan tidak valid.");
        }
        setError(loadErrors.length ? `Sebagian data gagal dimuat. ${loadErrors.join(" ")}` : "");
        setReady(true);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Gagal memuat transaksi.");
        setReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [authReady, user, supabase]);

  useEffect(() => {
    setCategory(type === "expense" ? expenseCategories[0] : incomeCategories[0]);
  }, [type]);

  useEffect(() => {
    if (!showReport) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setShowReport(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showReport]);

  useEffect(() => {
    const sectionIds = ["home", "transactions", "budgets", "goals", "reports"];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: "-18% 0px -65% 0px", threshold: [0, 0.2, 0.5] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [user]);

  const totals = useMemo(() => transactions.reduce(
    (result, transaction) => {
      if (transaction.type === "income") result.income += transaction.amount;
      else result.expense += transaction.amount;
      return result;
    },
    { income: 0, expense: 0 },
  ), [transactions]);

  const thisMonth = useMemo(() => {
    const month = today().slice(0, 7);
    return transactions
      .filter((transaction) => transaction.date.startsWith(month))
      .reduce(
        (result, transaction) => {
          if (transaction.type === "income") result.income += transaction.amount;
          else result.expense += transaction.amount;
          return result;
        },
        { income: 0, expense: 0 },
      );
  }, [transactions]);

  const spendingByCategory = useMemo(() => expenseCategories.map((expenseCategory) => ({
    category: expenseCategory,
    amount: transactions
      .filter((transaction) => transaction.type === "expense"
        && transaction.date.startsWith(today().slice(0, 7))
        && transaction.category === expenseCategory)
      .reduce((total, transaction) => total + transaction.amount, 0),
  })), [transactions]);

  const visibleTransactions = useMemo(() => {
    const currentMonth = today().slice(0, 7);
    return transactions
      .filter((transaction) => {
        if (filter === "Pemasukan" && transaction.type !== "income") return false;
        if (filter === "Pengeluaran" && transaction.type !== "expense") return false;
        if (period === "Bulan ini" && !transaction.date.startsWith(currentMonth)) return false;
        const text = `${transaction.category} ${transaction.note}`.toLowerCase();
        return text.includes(query.trim().toLowerCase());
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [transactions, filter, period, query]);

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !supabase) return;
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value <= 0) {
      setError("Nominal harus berupa bilangan bulat lebih besar dari Rp0.");
      return;
    }
    if (!date) {
      setError("Tanggal transaksi wajib diisi.");
      return;
    }

    setError("");
    setStatus("");
    setReady(false);
    const transaction: Transaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      amount: value,
      category,
      note: note.trim(),
      date,
    };
    try {
      const { error: saveError } = await supabase.from("transactions").insert({
        ...transaction,
        user_id: user.id,
      });
      if (saveError) {
        setError(`Transaksi gagal disimpan: ${saveError.message}`);
        return;
      }
      setTransactions((current) => [transaction, ...current]);
      setAmount("");
      setNote("");
      setDate(today());
    } catch (cause) {
      setError(cause instanceof Error ? `Transaksi gagal disimpan: ${cause.message}` : "Transaksi gagal disimpan.");
    } finally {
      setReady(true);
    }
  }

  async function deleteTransaction(id: string) {
    if (!supabase) return;
    setError("");
    try {
      const { error: deleteError } = await supabase.from("transactions").delete().eq("id", id);
      if (deleteError) {
        setError(`Transaksi gagal dihapus: ${deleteError.message}`);
        return;
      }
      setTransactions((current) => current.filter((transaction) => transaction.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? `Transaksi gagal dihapus: ${cause.message}` : "Transaksi gagal dihapus.");
    }
  }

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !supabase) return;
    const limit = Number(budgetLimit);
    if (!Number.isSafeInteger(limit) || limit <= 0) {
      setError("Batas anggaran harus lebih besar dari Rp0.");
      return;
    }

    setError("");
    setStatus("");
    setSaving(true);
    try {
      const { error: saveError } = await supabase.from("budgets").upsert(
        { user_id: user.id, category: budgetCategory, monthly_limit: limit },
        { onConflict: "user_id,category" },
      );
      if (saveError) {
        setError(`Anggaran gagal disimpan: ${saveError.message}`);
        return;
      }
      setBudgets((current) => [
        ...current.filter((budget) => budget.category !== budgetCategory),
        { category: budgetCategory, monthly_limit: limit },
      ].sort((a, b) => expenseCategories.indexOf(a.category) - expenseCategories.indexOf(b.category)));
      setBudgetLimit("");
      setStatus(`Anggaran ${budgetCategory} berhasil disimpan.`);
    } catch (cause) {
      setError(cause instanceof Error ? `Anggaran gagal disimpan: ${cause.message}` : "Anggaran gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBudget(categoryToDelete: string) {
    if (!supabase) return;
    setError("");
    try {
      const { error: deleteError } = await supabase.from("budgets").delete().eq("category", categoryToDelete);
      if (deleteError) {
        setError(`Anggaran gagal dihapus: ${deleteError.message}`);
        return;
      }
      setBudgets((current) => current.filter((budget) => budget.category !== categoryToDelete));
    } catch (cause) {
      setError(cause instanceof Error ? `Anggaran gagal dihapus: ${cause.message}` : "Anggaran gagal dihapus.");
    }
  }

  async function createSavingsGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !supabase) return;
    const target = Number(goalTarget);
    const title = goalTitle.trim();
    if (!title || title.length > 60 || !Number.isSafeInteger(target) || target <= 0) {
      setError("Isi nama target dan nominal tujuan yang valid.");
      return;
    }

    setError("");
    setStatus("");
    setSaving(true);
    try {
      const { data, error: createError } = await supabase
        .from("savings_goals")
        .insert({
          user_id: user.id,
          title,
          target_amount: target,
          saved_amount: 0,
          target_date: goalDate || null,
        })
        .select("id, title, target_amount, saved_amount, target_date, created_at")
        .single();
      if (createError) {
        setError(`Target tabungan gagal dibuat: ${createError.message}`);
        return;
      }
      if (!data) {
        setError("Target tabungan tidak tersimpan. Coba lagi.");
        return;
      }
      setSavingsGoals((current) => [data, ...current]);
      setGoalTitle("");
      setGoalTarget("");
      setGoalDate("");
      setStatus("Target tabungan berhasil dibuat.");
    } catch (cause) {
      setError(cause instanceof Error ? `Target tabungan gagal dibuat: ${cause.message}` : "Target tabungan gagal dibuat.");
    } finally {
      setSaving(false);
    }
  }

  async function addSavingsContribution(event: FormEvent<HTMLFormElement>, goal: SavingsGoal) {
    event.preventDefault();
    if (!supabase) return;
    const contribution = Number(contributionAmounts[goal.id] ?? "");
    const updatedAmount = goal.saved_amount + contribution;
    if (!Number.isSafeInteger(contribution) || contribution <= 0 || !Number.isSafeInteger(updatedAmount)) {
      setError("Nominal tabungan harus berupa bilangan bulat lebih besar dari Rp0.");
      return;
    }

    setError("");
    setStatus("");
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("savings_goals")
        .update({ saved_amount: updatedAmount })
        .eq("id", goal.id);
      if (updateError) {
        setError(`Tabungan gagal diperbarui: ${updateError.message}`);
        return;
      }
      setSavingsGoals((current) => current.map((item) =>
        item.id === goal.id ? { ...item, saved_amount: updatedAmount } : item,
      ));
      setContributionAmounts((current) => ({ ...current, [goal.id]: "" }));
      setStatus(`Tabungan untuk ${goal.title} berhasil diperbarui.`);
    } catch (cause) {
      setError(cause instanceof Error ? `Tabungan gagal diperbarui: ${cause.message}` : "Tabungan gagal diperbarui.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSavingsGoal(goal: SavingsGoal) {
    if (!supabase) return;
    setError("");
    try {
      const { error: deleteError } = await supabase.from("savings_goals").delete().eq("id", goal.id);
      if (deleteError) {
        setError(`Target tabungan gagal dihapus: ${deleteError.message}`);
        return;
      }
      setSavingsGoals((current) => current.filter((item) => item.id !== goal.id));
    } catch (cause) {
      setError(cause instanceof Error ? `Target tabungan gagal dihapus: ${cause.message}` : "Target tabungan gagal dihapus.");
    }
  }

  async function importTransactions(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setError("");
    setStatus("");
    try {
      const imported: unknown = JSON.parse(await file.text());
      if (!isTransactionList(imported)) {
        throw new Error("File cadangan tidak memiliki format transaksi yang valid.");
      }
      const existingIds = new Set(transactions.map((transaction) => transaction.id));
      const newTransactions: Transaction[] = [];
      for (const transaction of imported) {
        if (existingIds.has(transaction.id)) continue;
        existingIds.add(transaction.id);
        newTransactions.push(transaction);
      }
      if (newTransactions.length === 0) {
        setStatus("Tidak ada transaksi baru di file cadangan.");
        return;
      }
      if (!user || !supabase) throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
      const { error: importError } = await supabase.from("transactions").insert(
        newTransactions.map((transaction) => ({ ...transaction, user_id: user.id })),
      );
      if (importError) {
        throw new Error(`Transaksi gagal diimpor: ${importError.message}`);
      }
      setTransactions((current) => [...newTransactions, ...current]);
      setStatus(`${newTransactions.length} transaksi berhasil diimpor.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "File cadangan gagal dibaca.");
    } finally {
      input.value = "";
    }
  }

  function downloadBackup() {
    const file = new Blob([JSON.stringify(transactions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cadangan-transaksi-${today()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function downloadCsv() {
    const rows = [
      ["Tanggal", "Jenis", "Kategori", "Catatan", "Nominal"],
      ...[...transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((transaction) => [
          transaction.date,
          transaction.type === "income" ? "Pemasukan" : "Pengeluaran",
          transaction.category,
          transaction.note,
          String(transaction.amount),
        ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\r\n")}`;
    const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laporan-daua-${today()}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const categories = type === "expense" ? expenseCategories : incomeCategories;
  const balance = totals.income - totals.expense;
  const userMetadata = user?.user_metadata ?? {};
  const displayName = (typeof userMetadata.full_name === "string" && userMetadata.full_name)
    || (typeof userMetadata.name === "string" && userMetadata.name)
    || user?.email?.split("@")[0]
    || "Pengguna";
  const avatarCandidate = typeof userMetadata.avatar_url === "string"
    ? userMetadata.avatar_url
    : typeof userMetadata.picture === "string" ? userMetadata.picture : "";
  const avatarUrl = avatarCandidate.startsWith("https://") ? avatarCandidate : "";
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  const maxCategorySpend = Math.max(1, ...spendingByCategory.map((item) => item.amount));
  const currentMonthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date());
  const savingsRate = thisMonth.income > 0
    ? Math.max(0, Math.round(((thisMonth.income - thisMonth.expense) / thisMonth.income) * 100))
    : 0;

  async function signInWithGoogle() {
    if (!supabase) return;
    setAuthError("");
    setAuthStatus("");
    setAuthBusy(true);
    const redirectTo = window.location.href.split(/[?#]/, 1)[0];
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (signInError) {
        const providerDisabled = signInError.message.toLowerCase().includes("provider is not enabled");
        setAuthError(providerDisabled
          ? "Login Google belum diaktifkan di Supabase. Buka Authentication → Sign In / Providers, aktifkan Google, lalu isi OAuth Client ID dan Client Secret dari Google Cloud."
          : `Login Google gagal: ${signInError.message}`);
        setAuthBusy(false);
      }
    } catch (cause) {
      setAuthError(cause instanceof Error ? `Login Google gagal: ${cause.message}` : "Login Google gagal.");
      setAuthBusy(false);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthError("");
    setAuthStatus("");
    setAuthBusy(true);

    const emailRedirectTo = window.location.href.split(/[?#]/, 1)[0];
    try {
      const result = authMode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo } })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        setAuthError(result.error.message);
      } else if (authMode === "signup" && !result.data.session) {
        setAuthStatus("Akun dibuat. Periksa email untuk mengonfirmasi alamat sebelum login.");
      } else {
        setAuthStatus(authMode === "signup" ? "Akun berhasil dibuat." : "");
      }
    } catch (cause) {
      setAuthError(cause instanceof Error ? cause.message : "Permintaan login gagal.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setError("");
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setError(`Gagal keluar: ${signOutError.message}`);
    } catch (cause) {
      setError(cause instanceof Error ? `Gagal keluar: ${cause.message}` : "Gagal keluar.");
    }
  }

  if (!authReady) {
    return <main className="auth-page"><section className="auth-card"><BrandMark /><p>Memeriksa sesi login...</p></section></main>;
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <a className="brand auth-brand" href="#" aria-label="DAUA beranda">
            <BrandMark />
            <span>DAUA<small>DEVAGIL ATUR UANG ANDA</small></span>
          </a>
          <p className="eyebrow">RUANG KEUANGAN PRIBADI</p>
          <h1>{authMode === "login" ? "Selamat datang kembali" : "Buat akun baru"}</h1>
          <p className="auth-description">Atur uang dengan lebih tenang. Catatan dan targetmu tersimpan di semua perangkat.</p>
          {!isSupabaseConfigured ? (
            <p className="form-error" role="alert">Login belum dikonfigurasi. Tambahkan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY sesuai panduan SUPABASE_SETUP.md.</p>
          ) : (
            <>
              <button className="google-button" type="button" onClick={signInWithGoogle} disabled={authBusy}>
                <span className="google-mark">G</span> Lanjutkan dengan Google
              </button>
              <div className="auth-divider"><span>atau dengan email</span></div>
              <form className="auth-form" onSubmit={submitAuth}>
                <label className="form-field"><span className="field-label">EMAIL</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" required /></label>
                <label className="form-field"><span className="field-label">KATA SANDI</span><input type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 6 karakter" required /></label>
                {authError && <p className="form-error" role="alert">{authError}</p>}
                {authStatus && <p className="form-status" role="status">{authStatus}</p>}
                <button className="submit-button" type="submit" disabled={authBusy}>{authBusy ? "Memproses..." : authMode === "login" ? "Masuk" : "Buat akun"}</button>
              </form>
              <p className="auth-switch">
                {authMode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
                <button type="button" onClick={() => {
                  setAuthMode(authMode === "login" ? "signup" : "login");
                  setAuthError("");
                  setAuthStatus("");
                }}>{authMode === "login" ? "Buat akun" : "Masuk"}</button>
              </p>
            </>
          )}
          <p className="auth-privacy"><span className="privacy-dot" />Data transaksi hanya dapat dilihat oleh akunmu.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="DAUA beranda">
          <BrandMark />
          <span>DAUA<small>DEVAGIL ATUR UANG ANDA</small></span>
        </a>
        <div className="nav-caption">MENU UTAMA</div>
        <a className={`nav-link ${activeSection === "home" ? "active" : ""}`} href="#home" onClick={() => setActiveSection("home")}><span className="nav-icon"><Icon name="home" /></span>Beranda</a>
        <a className={`nav-link ${activeSection === "transactions" ? "active" : ""}`} href="#transactions" onClick={() => setActiveSection("transactions")}><span className="nav-icon"><Icon name="wallet" /></span>Transaksi</a>
        <a className={`nav-link ${activeSection === "budgets" ? "active" : ""}`} href="#budgets" onClick={() => setActiveSection("budgets")}><span className="nav-icon"><Icon name="chart" /></span>Anggaran</a>
        <a className={`nav-link ${activeSection === "goals" ? "active" : ""}`} href="#goals" onClick={() => setActiveSection("goals")}><span className="nav-icon"><Icon name="target" /></span>Target</a>
        <a className={`nav-link ${activeSection === "reports" ? "active" : ""}`} href="#reports" onClick={() => setActiveSection("reports")}><span className="nav-icon"><Icon name="print" /></span>Laporan</a>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon"><Icon name="spark" size={18} /></span>
            <strong>Langkah kecil,<br />keuangan terkendali.</strong>
            <p>Catat setiap transaksi agar tujuanmu makin dekat.</p>
          </div>
          <div className="privacy-note"><span className="privacy-dot" />Data akun tersimpan aman di cloud</div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div>
            <div className="breadcrumb">DAUA <span>/</span> <b>{activeSection === "budgets" ? "Anggaran" : activeSection === "goals" ? "Target tabungan" : activeSection === "reports" ? "Laporan" : activeSection === "transactions" ? "Transaksi" : "Beranda"}</b></div>
            <h1>Ruang keuanganmu</h1>
          </div>
          <div className="account-actions">
            <div className="profile-chip">
              {avatarUrl ? <img className="profile-avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="profile-avatar profile-initials">{initials}</span>}
              <span className="profile-copy"><strong>{displayName}</strong><small>{user.email}</small></span>
            </div>
            <button className="sign-out-button" type="button" onClick={signOut}>Keluar</button>
            <a className="top-date" href="#transactions"><Icon name="calendar" size={17} /> {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date())}</a>
          </div>
        </header>

        <div className="content">
          <section className="welcome-row" id="home">
            <div>
              <p className="eyebrow">RINGKASAN PRIBADI</p>
              <h2>Halo, {displayName.split(" ")[0]} <span>✦</span></h2>
              <p className="welcome-sub">Pantau arus uang dan capai tujuanmu, satu langkah setiap hari.</p>
            </div>
            <a className="primary-button" href="#add-transaction"><Icon name="plus" size={18} /> Catat transaksi</a>
          </section>

          {(error || status) && <div className={`dashboard-message ${error ? "message-error" : "message-success"}`} role={error ? "alert" : "status"}>{error || status}</div>}

          <section className="summary-grid" aria-label="Ringkasan keuangan">
            <article className="balance-card">
              <div className="card-label light-label">SALDO KESELURUHAN <span className="balance-icon"><Icon name="wallet" size={19} /></span></div>
              <div className="balance-value">{rupiah.format(balance)}</div>
              <div className="balance-foot"><span className="balance-indicator" /> Selisih seluruh pemasukan dan pengeluaran</div>
              <div className="balance-decoration decoration-one" /><div className="balance-decoration decoration-two" />
            </article>
            <article className="summary-card">
              <div className="summary-head"><span className="summary-icon income-icon"><Icon name="down" size={18} /></span><span className="summary-label">PEMASUKAN BULAN INI</span></div>
              <div className="summary-value">{rupiah.format(thisMonth.income)}</div>
              <div className="summary-foot">Total sepanjang waktu <strong className="income-text">{rupiah.format(totals.income)}</strong></div>
            </article>
            <article className="summary-card">
              <div className="summary-head"><span className="summary-icon expense-icon"><Icon name="up" size={18} /></span><span className="summary-label">PENGELUARAN BULAN INI</span></div>
              <div className="summary-value">{rupiah.format(thisMonth.expense)}</div>
              <div className="summary-foot">Total sepanjang waktu <strong className="expense-text">{rupiah.format(totals.expense)}</strong></div>
            </article>
          </section>

          <section className="workspace-grid">
            <div className="panel transactions-panel" id="transactions">
              <div className="panel-heading">
                <div><h3>Transaksi</h3><p>Catatan uang masuk dan keluar</p></div>
                <div className="transaction-actions">
                  <span className="transaction-count">{visibleTransactions.length} catatan</span>
                  <input ref={importInputRef} className="hidden-file-input" type="file" accept="application/json,.json" onChange={importTransactions} aria-label="Pilih file cadangan transaksi" />
                  <button className="report-button" type="button" onClick={() => importInputRef.current?.click()} disabled={!ready}>Impor data</button>
                  <button className="report-button" type="button" onClick={() => setShowReport(true)}><Icon name="print" size={15} /> Pratinjau cetak</button>
                </div>
              </div>
              <div className="toolbar">
                <label className="search-field"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari transaksi..." aria-label="Cari transaksi" /></label>
                <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter jenis transaksi">
                  <option>Semua transaksi</option><option>Pemasukan</option><option>Pengeluaran</option>
                </select>
                <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Filter periode">
                  <option>Semua waktu</option><option>Bulan ini</option>
                </select>
              </div>

              {visibleTransactions.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon"><Icon name="wallet" size={24} /></span>
                  <strong>{transactions.length === 0 ? "Belum ada transaksi" : "Transaksi tidak ditemukan"}</strong>
                  <p>{transactions.length === 0 ? "Mulai catat pemasukan atau pengeluaran pertamamu." : "Coba ubah kata kunci atau filter pencarian."}</p>
                  {transactions.length === 0 && <a href="#add-transaction">Catat transaksi pertama <Icon name="arrow" size={15} /></a>}
                </div>
              ) : (
                <div className="transaction-list">
                  {visibleTransactions.map((transaction) => (
                    <article className="transaction-row" key={transaction.id}>
                      <span className={`transaction-icon ${transaction.type}`}><Icon name={transaction.type === "income" ? "down" : "up"} size={18} /></span>
                      <div className="transaction-details"><strong>{transaction.note || transaction.category}</strong><span>{transaction.note ? transaction.category : transaction.type === "income" ? "Pemasukan" : "Pengeluaran"} <i>·</i> {formatDate(transaction.date)}</span></div>
                      <strong className={`transaction-amount ${transaction.type}`}>{transaction.type === "income" ? "+" : "−"}{rupiah.format(transaction.amount)}</strong>
                      <button className="delete-button" onClick={() => deleteTransaction(transaction.id)} aria-label={`Hapus transaksi ${transaction.note || transaction.category}`} title="Hapus transaksi"><Icon name="trash" size={16} /></button>
                    </article>
                  ))}
                </div>
              )}
              {visibleTransactions.length > 0 && <div className="list-foot">Menampilkan {visibleTransactions.length} transaksi</div>}
            </div>

            <aside className="panel form-panel" id="add-transaction">
              <div className="panel-heading form-heading">
                <div><h3>Catat transaksi</h3><p>Jangan lewatkan satu pun catatan</p></div>
                <span className="form-heading-icon"><Icon name="plus" size={18} /></span>
              </div>
              <form onSubmit={addTransaction}>
                <fieldset className="type-toggle">
                  <legend className="field-label">JENIS TRANSAKSI</legend>
                  <div className="toggle-options">
                    <button className={type === "expense" ? "selected expense-selected" : ""} type="button" onClick={() => setType("expense")}><Icon name="up" size={16} /> Pengeluaran</button>
                    <button className={type === "income" ? "selected income-selected" : ""} type="button" onClick={() => setType("income")}><Icon name="down" size={16} /> Pemasukan</button>
                  </div>
                </fieldset>
                <label className="form-field"><span className="field-label">NOMINAL</span><span className="amount-input"><span>Rp</span><input inputMode="numeric" type="number" min="1" step="1" placeholder="0" value={amount} onChange={(event) => setAmount(event.target.value)} required /></span></label>
                <label className="form-field"><span className="field-label">KATEGORI</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="form-field"><span className="field-label">CATATAN <span className="optional">(opsional)</span></span><input type="text" maxLength={80} placeholder={type === "expense" ? "Contoh: makan siang" : "Contoh: gaji bulan ini"} value={note} onChange={(event) => setNote(event.target.value)} /></label>
                <label className="form-field"><span className="field-label">TANGGAL</span><input type="date" value={date} max={today()} onChange={(event) => setDate(event.target.value)} required /></label>
                <button className="submit-button" type="submit" disabled={!ready}><Icon name="plus" size={18} /> Simpan transaksi</button>
                <p className="form-privacy"><span className="privacy-dot" />Tersimpan aman di akunmu.</p>
              </form>
            </aside>
          </section>

          <section className="panel management-panel" id="budgets">
            <div className="section-heading">
              <div><p className="eyebrow">KENDALIKAN PENGELUARAN</p><h2>Anggaran bulanan</h2><p>Atur batas untuk setiap kategori dan pantau pemakaiannya.</p></div>
              <span className="section-icon"><Icon name="chart" /></span>
            </div>
            <div className="budget-overview">
              <div><span>Total batas anggaran</span><strong>{rupiah.format(budgets.reduce((sum, item) => sum + item.monthly_limit, 0))}</strong></div>
              <div><span>Pengeluaran bulan ini</span><strong className="expense-text">{rupiah.format(thisMonth.expense)}</strong></div>
              <div><span>Kategori dianggarkan</span><strong>{budgets.length} <small>kategori</small></strong></div>
            </div>
            <div className="management-grid">
              <form className="management-form" onSubmit={saveBudget}>
                <h3>Atur batas kategori</h3>
                <label className="form-field"><span className="field-label">KATEGORI</span><select value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value)}>{expenseCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="form-field"><span className="field-label">BATAS PER BULAN (RP)</span><input type="number" inputMode="numeric" min="1" step="1" placeholder="Contoh: 1500000" value={budgetLimit} onChange={(event) => setBudgetLimit(event.target.value)} required /></label>
                <button className="submit-button" type="submit" disabled={saving || !ready}><Icon name="plus" size={17} /> Simpan anggaran</button>
                <p className="management-hint">Menyimpan kategori yang sama akan memperbarui batasnya.</p>
              </form>
              <div className="budget-list">
                {budgets.length === 0 ? (
                  <div className="compact-empty"><span className="empty-icon"><Icon name="chart" /></span><strong>Belum ada anggaran</strong><p>Buat batas bulanan agar pengeluaran lebih terarah.</p></div>
                ) : budgets.map((budget) => {
                  const spent = spendingByCategory.find((item) => item.category === budget.category)?.amount ?? 0;
                  const progress = Math.min(100, Math.round((spent / budget.monthly_limit) * 100));
                  return (
                    <article className="budget-row" key={budget.category}>
                      <div className="budget-row-top"><div><strong>{budget.category}</strong><span>{rupiah.format(spent)} dari {rupiah.format(budget.monthly_limit)}</span></div><button className="delete-button visible-delete" type="button" onClick={() => deleteBudget(budget.category)} aria-label={`Hapus anggaran ${budget.category}`}><Icon name="trash" size={16} /></button></div>
                      <div className={`progress-track ${progress >= 100 ? "progress-over" : progress >= 80 ? "progress-warning" : ""}`}><span style={{ width: `${progress}%` }} /></div>
                      <div className="budget-row-foot"><span>{spent > budget.monthly_limit ? "Melebihi batas" : `Terpakai ${progress}%`}</span><span>Sisa {rupiah.format(Math.max(0, budget.monthly_limit - spent))}</span></div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="panel management-panel" id="goals">
            <div className="section-heading">
              <div><p className="eyebrow">LANGKAH MENUJU IMPIAN</p><h2>Target tabungan</h2><p>Pecah tujuan besar menjadi progres kecil yang bisa dipantau.</p></div>
              <span className="section-icon goal-section-icon"><Icon name="target" /></span>
            </div>
            <div className="management-grid goal-management-grid">
              <form className="management-form" onSubmit={createSavingsGoal}>
                <h3>Buat target baru</h3>
                <label className="form-field"><span className="field-label">NAMA TARGET</span><input type="text" maxLength={60} placeholder="Contoh: Dana darurat" value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} required /></label>
                <label className="form-field"><span className="field-label">NOMINAL TUJUAN (RP)</span><input type="number" inputMode="numeric" min="1" step="1" placeholder="Contoh: 10000000" value={goalTarget} onChange={(event) => setGoalTarget(event.target.value)} required /></label>
                <label className="form-field"><span className="field-label">TANGGAL TARGET <span className="optional">(opsional)</span></span><input type="date" value={goalDate} onChange={(event) => setGoalDate(event.target.value)} /></label>
                <button className="submit-button" type="submit" disabled={saving || !ready}><Icon name="plus" size={17} /> Buat target</button>
              </form>
              <div className="goal-list">
                {savingsGoals.length === 0 ? (
                  <div className="compact-empty"><span className="empty-icon goal-empty-icon"><Icon name="target" /></span><strong>Belum ada target tabungan</strong><p>Buat target pertamamu dan catat progresnya.</p></div>
                ) : savingsGoals.map((goal) => {
                  const progress = Math.min(100, Math.round((goal.saved_amount / goal.target_amount) * 100));
                  return (
                    <article className="goal-card" key={goal.id}>
                      <div className="goal-card-top"><div><h3>{goal.title}</h3><span>{goal.target_date ? `Target ${formatDate(goal.target_date)}` : "Tanpa tanggal target"}</span></div><button className="delete-button visible-delete" type="button" onClick={() => deleteSavingsGoal(goal)} aria-label={`Hapus target ${goal.title}`}><Icon name="trash" size={16} /></button></div>
                      <div className="goal-progress-label"><strong>{rupiah.format(goal.saved_amount)}</strong><span>{rupiah.format(goal.target_amount)}</span></div>
                      <div className="progress-track goal-progress"><span style={{ width: `${progress}%` }} /></div>
                      <div className="goal-card-foot"><span>{progress}% tercapai</span>{progress >= 100 && <strong>Target tercapai!</strong>}</div>
                      {progress < 100 && <form className="contribution-form" onSubmit={(event) => addSavingsContribution(event, goal)}>
                        <input type="number" inputMode="numeric" min="1" step="1" placeholder="Tambah tabungan (Rp)" value={contributionAmounts[goal.id] ?? ""} onChange={(event) => setContributionAmounts((current) => ({ ...current, [goal.id]: event.target.value }))} aria-label={`Nominal tabungan untuk ${goal.title}`} required />
                        <button className="contribution-button" type="submit" disabled={saving}>Tambah</button>
                      </form>}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="panel management-panel report-section" id="reports">
            <div className="section-heading report-section-heading">
              <div><p className="eyebrow">GAMBARAN ARUS KAS</p><h2>Laporan {currentMonthLabel}</h2><p>Ringkas pengeluaran per kategori dan perkembangan tabunganmu.</p></div>
              <div className="report-actions">
                <button className="report-button" type="button" onClick={downloadCsv}>Unduh CSV</button>
                <button className="report-print-button" type="button" onClick={() => setShowReport(true)}><Icon name="print" size={15} /> Cetak laporan</button>
              </div>
            </div>
            <div className="report-insight-grid">
              <article className="report-insight-card"><span>Arus kas bulan ini</span><strong className={thisMonth.income - thisMonth.expense >= 0 ? "income-text" : "expense-text"}>{rupiah.format(thisMonth.income - thisMonth.expense)}</strong><small>{rupiah.format(thisMonth.income)} masuk · {rupiah.format(thisMonth.expense)} keluar</small></article>
              <article className="report-insight-card"><span>Rasio uang tersimpan</span><strong>{savingsRate}%</strong><small>Dari total pemasukan bulan ini</small></article>
              <article className="report-insight-card"><span>Total progres target</span><strong>{rupiah.format(savingsGoals.reduce((sum, goal) => sum + goal.saved_amount, 0))}</strong><small>Di {savingsGoals.length} target tabungan</small></article>
            </div>
            <div className="category-report">
              <div className="category-report-heading"><h3>Pengeluaran per kategori</h3><span>{currentMonthLabel}</span></div>
              {spendingByCategory.every((item) => item.amount === 0) ? (
                <p className="report-empty-inline">Belum ada pengeluaran bulan ini.</p>
              ) : spendingByCategory.filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount).map((item) => (
                <div className="category-bar-row" key={item.category}>
                  <span>{item.category}</span><div className="category-bar-track"><span style={{ width: `${Math.max(4, Math.round((item.amount / maxCategorySpend) * 100))}%` }} /></div><strong>{rupiah.format(item.amount)}</strong>
                </div>
              ))}
            </div>
          </section>

          <footer className="page-footer"><span>DAUA · Devagil Atur Uang Anda</span><span>Rencanakan hari ini, capai tujuan esok <span className="footer-heart">♥</span></span></footer>
        </div>
      </section>
      <nav className="bottom-nav" aria-label="Navigasi utama">
        <a className={activeSection === "home" ? "active" : ""} href="#home" onClick={() => setActiveSection("home")}><Icon name="home" size={19} /><span>Home</span></a>
        <a className={activeSection === "transactions" ? "active" : ""} href="#transactions" onClick={() => setActiveSection("transactions")}><Icon name="wallet" size={19} /><span>Transaksi</span></a>
        <a className={activeSection === "budgets" ? "active" : ""} href="#budgets" onClick={() => setActiveSection("budgets")}><Icon name="chart" size={19} /><span>Anggaran</span></a>
        <a className={activeSection === "goals" ? "active" : ""} href="#goals" onClick={() => setActiveSection("goals")}><Icon name="target" size={19} /><span>Target</span></a>
        <a className={activeSection === "reports" ? "active" : ""} href="#reports" onClick={() => setActiveSection("reports")}><Icon name="print" size={19} /><span>Laporan</span></a>
      </nav>
      {showReport && (
        <div className="modal-backdrop" onClick={(event) => {
          if (event.target === event.currentTarget) setShowReport(false);
        }}>
          <section className="print-report" id="print-report" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <div className="report-toolbar print-hide">
              <span><Icon name="print" size={16} /> Pratinjau laporan</span>
              <div>
                <button className="report-button" type="button" onClick={downloadBackup}>Unduh cadangan</button>
                <button className="report-print-button" type="button" onClick={() => window.print()}><Icon name="print" size={15} /> Cetak</button>
                <button className="report-close-button" type="button" onClick={() => setShowReport(false)} aria-label="Tutup pratinjau"><Icon name="close" size={18} /></button>
              </div>
            </div>
            <header className="report-header">
              <div className="report-brand"><BrandMark /> DAUA</div>
              <p className="report-kicker">LAPORAN KEUANGAN</p>
              <h2 id="report-title">Semua Transaksi</h2>
              <p className="report-date">Dicetak pada {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date())}</p>
            </header>
            <div className="report-summary">
              <div><span>Total pemasukan</span><strong className="income-text">{rupiah.format(totals.income)}</strong></div>
              <div><span>Total pengeluaran</span><strong className="expense-text">{rupiah.format(totals.expense)}</strong></div>
              <div><span>Saldo akhir</span><strong>{rupiah.format(balance)}</strong></div>
            </div>
            {transactions.length === 0 ? (
              <div className="report-empty">Belum ada transaksi untuk ditampilkan.</div>
            ) : (
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Jenis</th><th className="amount-column">Nominal</th></tr></thead>
                  <tbody>
                    {[...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.date)}</td>
                        <td>{transaction.note || transaction.category}</td>
                        <td>{transaction.category}</td>
                        <td>{transaction.type === "income" ? "Pemasukan" : "Pengeluaran"}</td>
                        <td className={`amount-column ${transaction.type}`}>{transaction.type === "income" ? "+" : "−"}{rupiah.format(transaction.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <footer className="report-footer"><span>{transactions.length} transaksi</span><span>DAUA · Devagil Atur Uang Anda</span></footer>
          </section>
        </div>
      )}
    </main>
  );
}
