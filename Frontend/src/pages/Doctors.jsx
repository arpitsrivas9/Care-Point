import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import MoveUpOnRender from "../components/MoveUpOnRender";

const Doctors = () => {
  const { speciality } = useParams();
  const { doctors } = useContext(AppContext);
  const [filterDoc, setFilterDoc] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [specialities, setSpecialities] = useState([]);
  const navigate = useNavigate();

  const allowedSpecialities = [
    "General physician",
    "Gynecologist",
    "Dermatologist",
    "Pediatricians",
    "Neurologist",
    "Gastroenterologist",
  ];

  const selectedSpeciality = speciality
    ? decodeURIComponent(speciality)
    : "";

  const normalizeSpeciality = (raw) => {
    const s = String(raw || "").trim().toLowerCase();
    if (!s) return "General physician";

    // If it already matches one of our allowed list, keep it.
    for (const name of allowedSpecialities) {
      if (s === name.toLowerCase()) return name;
    }

    // Keyword mapping for Kaggle/Zocdoc-like specialities
    if (s.includes("gastro") || s.includes("digest") || s.includes("hepato"))
      return "Gastroenterologist";
    if (s.includes("neuro") || s.includes("brain") || s.includes("nerv"))
      return "Neurologist";
    if (s.includes("derma") || s.includes("skin"))
      return "Dermatologist";
    if (s.includes("gyn") || s.includes("obst") || s.includes("women"))
      return "Gynecologist";
    if (s.includes("pedi") || s.includes("child") || s.includes("kids"))
      return "Pediatricians";

    return "General physician";
  };

  const withDisplaySpeciality = (list) =>
    (list || []).map((d) => ({
      ...d,
      displaySpeciality: normalizeSpeciality(d?.speciality),
    }));

  const limitPerSpeciality = (list, limit) => {
    const counts = new Map();
    const out = [];

    for (const doc of list || []) {
      const key = String(doc?.displaySpeciality || doc?.speciality || "").trim();
      if (!key) continue;
      const c = counts.get(key) || 0;
      if (c >= limit) continue;
      counts.set(key, c + 1);
      out.push(doc);
    }

    return out;
  };

  const applyFilter = () => {
    const docsWithDisplay = withDisplaySpeciality(doctors);

    if (selectedSpeciality) {
      setFilterDoc(
        docsWithDisplay
          .filter((doc) => doc.displaySpeciality === selectedSpeciality)
          .slice(0, 5)
      );
    } else {
      const allowed = docsWithDisplay.filter((d) =>
        allowedSpecialities.includes(d.displaySpeciality)
      );
      setFilterDoc(limitPerSpeciality(allowed, 5));
    }
  };

  useEffect(() => {
    applyFilter();
  }, [doctors, selectedSpeciality]);

  useEffect(() => {
    setSpecialities(allowedSpecialities);
  }, [doctors]);

  const goToSpeciality = (name) => {
    if (!name) return navigate("/doctors");
    if (selectedSpeciality === name) return navigate("/doctors");
    navigate(`/doctors/${encodeURIComponent(name)}`);
  };

  return (
    <div>
      <p className="text-gray-600">Browse through the doctors specialist.</p>
      <div className="flex">
        <div className="flex items-start gap-5 mt-5">
          <button
            className={`py-1 px-3 border rounded text-sm transition-all sm:hidden ${
              showFilter ? " bg-primary text-white " : ""
            }`}
            onClick={() => setShowFilter((prev) => !prev)}
          >
            Filter
          </button>
          <div
            className={`flex-col gap-4 text-sm text-gray-600  ${
              showFilter ? "flex" : "hidden sm:flex"
            }`}
          >
            {specialities.map((name) => (
              <p
                key={name}
                onClick={() => goToSpeciality(name)}
                className={`w-[91vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${
                  selectedSpeciality === name ? "bg-indigo-100 text-black" : ""
                }`}
              >
                {name}
              </p>
            ))}
          </div>
        </div>

        <div className="w-full m-4">
          <MoveUpOnRender>
            <div className="w-full grid grid-cols-[repeat(auto-fill,minmax(190px,220px))] gap-4 gap-y-6">
              {filterDoc.map((item, index) => (
                <div
                  onClick={() => navigate(`/appointment/${item._id}`)}
                  className="border border-blue-200 rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-500"
                  key={index}
                >
                  <img
                    className="h-56 w-full bg-blue-50 object-cover object-top"
                    src={item.image}
                    alt=""
                  />
                  <div className="p-4">
                    <div
                      className={`flex items-center gap-2 text-sm text-center ${
                        item.available ? " text-green-500" : "text-gray-500"
                      } `}
                    >
                      <p
                        className={`w-2 h-2 ${
                          item?.available ? " bg-green-500" : "bg-gray-500"
                        }  rounded-full`}
                      ></p>{" "}
                      <p>{item.available ? "Available" : "Not Available"}</p>
                    </div>
                    <p className="text-gray-900 text-lg font-medium ">
                      {item.name}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {item.displaySpeciality || item.speciality}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </MoveUpOnRender>
        </div>
      </div>
    </div>
  );
};

export default Doctors;
