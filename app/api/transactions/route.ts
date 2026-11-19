import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

type TransactionType = "income" | "expense";

type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
};

const categories = {
  income: ["Gaji", "Freelance", "Bonus", "Hadiah", "Pemasukan lain"],
  expense: ["Makan", "Bensin", "Jajan", "Main", "Belanja", "Tagihan", "Kebutuhan lain"],
} as const;
const dataPath = join(process.cwd(), "data", "transactions.json");
let mutationQueue: Promise<void> = Promise.resolve();

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !value.id) return false;
  if (value.type !== "income" && value.type !== "expense") return false;
  if (typeof value.amount !== "number" || !Number.isSafeInteger(value.amount) || value.amount <= 0) return false;
  if (typeof value.category !== "string" || !categories[value.type].some((category) => category === value.category)) return false;
  if (typeof value.note !== "string" || value.note.length > 80) return false;
  return typeof value.date === "string" && isValidDate(value.date);
}

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function readTransactions(): Promise<Transaction[]> {
  let contents: string;
  try {
    contents = await readFile(dataPath, "utf8");
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return [];
    throw error;
  }

  const data: unknown = JSON.parse(contents);
  if (!Array.isArray(data) || !data.every(isTransaction)) {
    throw new Error("Stored transaction data has an invalid format.");
  }
  return data;
}

async function writeTransactions(transactions: Transaction[]) {
  const directory = join(process.cwd(), "data");
  await mkdir(directory, { recursive: true });
  const temporaryPath = `${dataPath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(transactions, null, 2), "utf8");
  await rename(temporaryPath, dataPath);
}

function serverError(message: string, error: unknown) {
  console.error(message, error);
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    return Response.json(await readTransactions(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return serverError("Data transaksi gagal dibaca dari penyimpanan lokal.", error);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Data transaksi tidak valid." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ error: "Data transaksi tidak valid." }, { status: 400 });
  }

  const type = body.type;
  const amount = body.amount;
  const category = body.category;
  const date = body.date;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (
    (type !== "income" && type !== "expense") ||
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    typeof category !== "string" ||
    !categories[type].some((item) => item === category) ||
    typeof date !== "string" ||
    !isValidDate(date) ||
    note.length > 80
  ) {
    return Response.json({ error: "Periksa kembali jenis, nominal, kategori, catatan, dan tanggal transaksi." }, { status: 400 });
  }

  const transaction: Transaction = {
    id: randomUUID(),
    type,
    amount,
    category,
    note,
    date,
  };

  try {
    await serialize(async () => {
      const current = await readTransactions();
      await writeTransactions([...current, transaction]);
    });
    return Response.json(transaction, { status: 201 });
  } catch (error) {
    return serverError("Transaksi gagal disimpan. Periksa ruang penyimpanan perangkat.", error);
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "ID transaksi wajib diisi." }, { status: 400 });
  }

  try {
    const deleted = await serialize(async () => {
      const current = await readTransactions();
      const remaining = current.filter((transaction) => transaction.id !== id);
      if (remaining.length === current.length) return false;
      await writeTransactions(remaining);
      return true;
    });
    if (!deleted) {
      return Response.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return serverError("Transaksi gagal dihapus dari penyimpanan lokal.", error);
  }
}
