import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import doctorModel from "../models/doctorModel.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const DEFAULT_PASSWORD = "Doctor@1234";
const DEFAULT_IMAGE = "https://placehold.co/600x600?text=Doctor";
const DEFAULT_LIMIT = 300;
const DEFAULT_BATCH_SIZE = 200;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && c === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      // ignore empty trailing lines
      if (row.some((v) => String(v || "").trim() !== "")) rows.push(row);
      row = [];
      continue;
    }

    field += c;
  }

  row.push(field);
  if (row.some((v) => String(v || "").trim() !== "")) rows.push(row);
  return rows;
}

function pickColumnIndex(headers, candidates) {
  const normalized = headers.map((h) => String(h || "").trim().toLowerCase());
  for (const candidate of candidates) {
    const idx = normalized.findIndex((h) => h === candidate);
    if (idx !== -1) return idx;
  }
  // looser contains match
  for (const candidate of candidates) {
    const idx = normalized.findIndex((h) => h.includes(candidate));
    if (idx !== -1) return idx;
  }
  return -1;
}

function slugifyEmailLocal(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40) || "doctor";
}

function safeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanText(value) {
  return String(value || "")
    .replace(/Â\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseArgs(argv) {
  const args = { csvPath: argv[2] || "data/doctors.csv", limit: DEFAULT_LIMIT };
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--limit" && argv[i + 1]) {
      const n = Number(argv[i + 1]);
      if (Number.isFinite(n) && n > 0) args.limit = Math.floor(n);
      i++;
    }
  }
  return args;
}

async function main() {
  const { csvPath: csvPathArg, limit } = parseArgs(process.argv);
  const csvPath = path.isAbsolute(csvPathArg)
    ? csvPathArg
    : path.join(process.cwd(), csvPathArg);

  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in Backend/.env");
  }

  if (!fs.existsSync(csvPath)) {
    throw new Error(
      `CSV not found at ${csvPath}. Put a Kaggle doctors CSV there (or pass a path as the first argument).`
    );
  }

  const raw = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(raw);
  if (rows.length < 2) throw new Error("CSV has no data rows.");

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const idxName = pickColumnIndex(headers, ["name", "doctor_name", "full_name"]);
  const idxEmail = pickColumnIndex(headers, ["email", "e-mail", "mail"]);
  const idxSpeciality = pickColumnIndex(headers, [
    "speciality",
    "specialty",
    "department",
    "field",
  ]);
  const idxDegree = pickColumnIndex(headers, ["degree", "qualification", "education"]);
  const idxExperience = pickColumnIndex(headers, ["experience", "years_experience", "years"]);
  const idxAbout = pickColumnIndex(headers, ["about", "bio", "description", "profile"]);
  const idxFees = pickColumnIndex(headers, ["fees", "fee", "price", "consultation_fee"]);
  const idxImage = pickColumnIndex(headers, ["image", "photo", "picture", "avatar", "img"]);

  await mongoose.connect(process.env.MONGO_URI);

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

  const docs = [];

  const useRows = dataRows.slice(0, Math.min(limit, dataRows.length));

  for (let i = 0; i < useRows.length; i++) {
    const r = useRows[i];
    const name =
      cleanText(idxName !== -1 ? r[idxName] : "") || `Doctor ${i + 1}`;
    const speciality =
      cleanText(idxSpeciality !== -1 ? r[idxSpeciality] : "") ||
      "General physician";
    const degree = cleanText(idxDegree !== -1 ? r[idxDegree] : "") || "MBBS";

    const experienceRaw = idxExperience !== -1 ? r[idxExperience] : "";
    const experienceYears = Math.max(0, Math.min(50, safeNumber(experienceRaw, 5)));
    const experience = `${experienceYears} Years`;

    const about =
      cleanText(idxAbout !== -1 ? r[idxAbout] : "") ||
      "Experienced doctor focused on patient-first care and clear guidance.";

    const fees = Math.max(100, Math.min(5000, safeNumber(idxFees !== -1 ? r[idxFees] : "", 500)));

    const image = cleanText(idxImage !== -1 ? r[idxImage] : "") || DEFAULT_IMAGE;

    const email =
      cleanText(idxEmail !== -1 ? r[idxEmail] : "") ||
      `${slugifyEmailLocal(name)}.${i + 1}@carepoint.local`;

    const doctorData = {
      name,
      email,
      password: hashedPassword,
      image,
      speciality,
      degree,
      experience,
      about,
      available: true,
      fees,
      address: { line1: "Care Point Clinic", line2: "City Center" },
      date: Date.now(),
      slots_booked: {},
    };

    docs.push(doctorData);
  }

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < docs.length; i += DEFAULT_BATCH_SIZE) {
    const batch = docs.slice(i, i + DEFAULT_BATCH_SIZE);
    try {
      const res = await doctorModel.insertMany(batch, { ordered: false });
      inserted += res.length;
    } catch (err) {
      // insertMany with ordered:false can throw but still insert many docs.
      const insertedCount =
        typeof err?.insertedDocs?.length === "number"
          ? err.insertedDocs.length
          : 0;
      inserted += insertedCount;

      // Most likely duplicates by unique email, count the rest as skipped.
      skipped += Math.max(0, batch.length - insertedCount);
    }
  }

  await mongoose.disconnect();
  console.log(
    JSON.stringify(
      { inserted, skipped, totalRows: dataRows.length, limitUsed: useRows.length },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
