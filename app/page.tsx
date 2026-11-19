"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type TransactionType = "income" | "expense";

type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
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

function isTransaction(value: unknown): value is Transaction {
  if (value === null || typeof value !== "object") return false;
  const transaction = value as Record<string, unknown>;
  return typeof transaction.id === "string" &&
    (transaction.type === "income" || transaction.type === "expense") &&
    typeof transaction.amount === "number" &&
    Number.isSafeInteger(transaction.amount) &&
    transaction.amount > 0 &&
    typeof transaction.category === "string" &&
    typeof transaction.note === "string" &&
    typeof transaction.date === "string";
}

async function responseError(response: Response, fallback: string) {
  const data: unknown = await response.json().catch(() => null);
  if (data !== null && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error;
  }
  return fallback;
}

function Icon({
  name,
  size = 20,
}: {
  name: "wallet" | "up" | "down" | "plus" | "search" | "arrow" | "trash" | "chart" | "calendar" | "spark" | "print" | "close";
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
  }
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ready, setReady] = useState(false);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(expenseCategories[0]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [filter, setFilter] = useState("Semua transaksi");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("Semua waktu");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadTransactions() {
      try {
        const response = await fetch("/api/transactions", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(await responseError(response, "Data transaksi gagal dimuat."));
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isTransaction)) {
          throw new Error("Format data transaksi dari penyimpanan lokal tidak valid.");
        }
        if (active) setTransactions(data);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Data transaksi gagal dimuat.");
        }
      } finally {
        if (active) setReady(true);
      }
    }
    void loadTransactions();
    return () => {
      active = false;
    };
  }, []);

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
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value <= 0) {
      setError("Nominal harus berupa bilangan bulat lebih besar dari Rp0.");
      return;
    }
    if (!date) {
      setError("Tanggal transaksi wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount: value, category, note: note.trim(), date }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "Transaksi gagal disimpan."));
      }
      const saved: unknown = await response.json();
      if (!isTransaction(saved)) {
        throw new Error("Server mengembalikan data transaksi yang tidak valid.");
      }
      setTransactions((current) => [saved, ...current]);
      setAmount("");
      setNote("");
      setDate(today());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Transaksi gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction(id: string) {
    setError("");
    try {
      const response = await fetch(`/api/transactions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await responseError(response, "Transaksi gagal dihapus."));
      }
      setTransactions((current) => current.filter((transaction) => transaction.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Transaksi gagal dihapus.");
    }
  }

  const categories = type === "expense" ? expenseCategories : incomeCategories;
  const balance = totals.income - totals.expense;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Atur Uang beranda">
          <span className="brand-mark"><Icon name="wallet" size={21} /></span>
          <span>atur<span className="brand-light">uang</span><small>CATATAN KEUANGAN</small></span>
        </a>
        <div className="nav-caption">MENU UTAMA</div>
        <a className="nav-link active" href="#dashboard"><span className="nav-icon"><Icon name="chart" /></span>Ringkasan</a>
        <a className="nav-link" href="#transactions"><span className="nav-icon"><Icon name="wallet" /></span>Transaksi</a>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon"><Icon name="spark" size={18} /></span>
            <strong>Langkah kecil,<br />keuangan terkendali.</strong>
            <p>Catat setiap transaksi agar tujuanmu makin dekat.</p>
          </div>
          <div className="privacy-note"><span className="privacy-dot" />Data tersimpan di file lokal aplikasi</div>
        </div>
      </aside>

      <section className="main-area" id="dashboard">
        <header className="topbar">
          <div>
            <div className="breadcrumb">Ruang pribadi <span>/</span> <b>Ringkasan</b></div>
            <h1>Ringkasan keuangan</h1>
          </div>
          <a className="top-date" href="#transactions"><Icon name="calendar" size={17} /> {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date())}</a>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">DASHBOARD</p>
              <h2>Halo, apa kabar keuanganmu? <span>✦</span></h2>
              <p className="welcome-sub">Pantau uang masuk dan keluar, semua dalam satu tempat.</p>
            </div>
            <a className="primary-button" href="#add-transaction"><Icon name="plus" size={18} /> Catat transaksi</a>
          </section>

          <section className="summary-grid" aria-label="Ringkasan keuangan">
            <article className="balance-card">
              <div className="card-label light-label">TOTAL SALDO <span className="balance-icon"><Icon name="wallet" size={19} /></span></div>
              <div className="balance-value">{rupiah.format(balance)}</div>
              <div className="balance-foot"><span className="balance-indicator" /> Akumulasi semua transaksi</div>
              <div className="balance-decoration decoration-one" /><div className="balance-decoration decoration-two" />
            </article>
            <article className="summary-card">
              <div className="summary-head"><span className="summary-icon income-icon"><Icon name="down" size={18} /></span><span className="summary-label">PEMASUKAN</span></div>
              <div className="summary-value">{rupiah.format(totals.income)}</div>
              <div className="summary-foot">Bulan ini <strong className="income-text">{rupiah.format(thisMonth.income)}</strong></div>
            </article>
            <article className="summary-card">
              <div className="summary-head"><span className="summary-icon expense-icon"><Icon name="up" size={18} /></span><span className="summary-label">PENGELUARAN</span></div>
              <div className="summary-value">{rupiah.format(totals.expense)}</div>
              <div className="summary-foot">Bulan ini <strong className="expense-text">{rupiah.format(thisMonth.expense)}</strong></div>
            </article>
          </section>

          <section className="workspace-grid">
            <div className="panel transactions-panel" id="transactions">
              <div className="panel-heading">
                <div><h3>Transaksi</h3><p>Catatan uang masuk dan keluar</p></div>
                <div className="transaction-actions">
                  <span className="transaction-count">{visibleTransactions.length} catatan</span>
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
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="submit-button" type="submit" disabled={!ready || saving}><Icon name="plus" size={18} /> {saving ? "Menyimpan..." : "Simpan transaksi"}</button>
                <p className="form-privacy"><span className="privacy-dot" />Tersimpan di penyimpanan lokal aplikasi</p>
              </form>
            </aside>
          </section>
          <footer className="page-footer"><span>Atur uang, atur masa depan.</span><span>Dibuat untuk kebiasaan finansial yang lebih baik <span className="footer-heart">♥</span></span></footer>
        </div>
      </section>
      {showReport && (
        <div className="modal-backdrop" onClick={(event) => {
          if (event.target === event.currentTarget) setShowReport(false);
        }}>
          <section className="print-report" id="print-report" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <div className="report-toolbar print-hide">
              <span><Icon name="print" size={16} /> Pratinjau laporan</span>
              <div>
                <button className="report-print-button" type="button" onClick={() => window.print()}><Icon name="print" size={15} /> Cetak</button>
                <button className="report-close-button" type="button" onClick={() => setShowReport(false)} aria-label="Tutup pratinjau"><Icon name="close" size={18} /></button>
              </div>
            </div>
            <header className="report-header">
              <div className="report-brand"><span className="report-brand-mark"><Icon name="wallet" size={17} /></span> aturuang</div>
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
            <footer className="report-footer"><span>{transactions.length} transaksi</span><span>Atur uang, atur masa depan.</span></footer>
          </section>
        </div>
      )}
    </main>
  );
}
