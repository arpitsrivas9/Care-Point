import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import doctorModel from "../models/doctorModel.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const allowedSpecialities = [
  "General physician",
  "Gynecologist",
  "Dermatologist",
  "Pediatricians",
  "Neurologist",
  "Gastroenterologist",
];

const normalizeSpeciality = (raw) => {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "General physician";

  for (const name of allowedSpecialities) {
    if (s === name.toLowerCase()) return name;
  }

  if (s.includes("gastro") || s.includes("digest") || s.includes("hepato"))
    return "Gastroenterologist";
  if (s.includes("neuro") || s.includes("brain") || s.includes("nerv"))
    return "Neurologist";
  if (s.includes("derma") || s.includes("skin")) return "Dermatologist";
  if (s.includes("gyn") || s.includes("obst") || s.includes("women"))
    return "Gynecologist";
  if (s.includes("pedi") || s.includes("child") || s.includes("kids"))
    return "Pediatricians";

  return "General physician";
};

function parseArgs(argv) {
  const args = { perSpeciality: 5, dryRun: true };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--per" && argv[i + 1]) {
      const n = Number(argv[i + 1]);
      if (Number.isFinite(n) && n > 0) args.perSpeciality = Math.floor(n);
      i++;
    } else if (argv[i] === "--yes") {
      args.dryRun = false;
    }
  }
  return args;
}

async function main() {
  const { perSpeciality, dryRun } = parseArgs(process.argv);

  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in Backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  // Seed script generated emails like `something.N@carepoint.local`.
  const seeded = await doctorModel
    .find({ email: /@carepoint\.local$/i })
    .select("_id email speciality date")
    .sort({ date: 1, _id: 1 })
    .lean();

  const keepIds = new Set();
  const perSpecCounts = new Map();

  for (const d of seeded) {
    const spec = normalizeSpeciality(d.speciality);
    if (!allowedSpecialities.includes(spec)) continue;
    const c = perSpecCounts.get(spec) || 0;
    if (c >= perSpeciality) continue;
    perSpecCounts.set(spec, c + 1);
    keepIds.add(String(d._id));
  }

  const toDeleteIds = seeded
    .map((d) => String(d._id))
    .filter((id) => !keepIds.has(id));

  let deleted = 0;
  if (!dryRun && toDeleteIds.length) {
    const res = await doctorModel.deleteMany({
      _id: { $in: toDeleteIds },
      email: /@carepoint\.local$/i,
    });
    deleted = res.deletedCount || 0;
  }

  const totalAfter = await doctorModel.countDocuments({});
  const seededAfter = await doctorModel.countDocuments({ email: /@carepoint\.local$/i });

  await mongoose.disconnect();

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? "dryRun" : "deleted",
        perSpeciality,
        seededBefore: seeded.length,
        keepSeeded: keepIds.size,
        deleteSeeded: toDeleteIds.length,
        deleted,
        totalAfter,
        seededAfter,
      },
      null,
      2
    )
  );

  if (dryRun) {
    console.log(
      "\nRun again with --yes to actually delete the extra seeded doctors."
    );
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});

