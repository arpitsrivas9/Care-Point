import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { assets } from "../assets/assets";
import RelatedDoctors from "../components/RelatedDoctors";
import { toast } from "react-toastify";
import axios from "axios";
import SlotSelector from "../components/SlotSelector";
import { FaCalendarAlt } from "react-icons/fa";

const Appointment = () => {
  const { docId } = useParams();
  const { doctors, currencySymbol, token, backendUrl, getDoctorsData } =
    useContext(AppContext);
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const [docInfo, setDocInfo] = useState(null);
  const [docSlots, setDocSlots] = useState([]);
  const [slotIndex, setSlotIndex] = useState(0);
  const [slotTime, setSlotTime] = useState("");
  const [patientNote, setPatientNote] = useState("");
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  const navigate = useNavigate();
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [docSlots]);
  useEffect(() => {
    fetchDocInfo();
  }, [doctors, docId]);

  useEffect(() => {
    getAvailableSlots();
  }, [docInfo, selectedStartDate]);

  const fetchDocInfo = async () => {
    const docInfo = doctors.find((doc) => doc._id === docId);
    setDocInfo(docInfo);
  };

  const checkSlotAvailable = (docInfo, slotDate, slotTime) => {
    if (!docInfo || !docInfo.slots_booked) return true; // if  docinfo is null
    return !docInfo.slots_booked?.[slotDate]?.includes(slotTime);
  };

  const getAvailableSlots = async () => {
    setDocSlots([]);
    setSlotIndex(0);
    setSlotTime("");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDate = new Date(selectedStartDate);
    firstDate.setHours(0, 0, 0, 0);

    const generateSlotDate = (date) =>
      `${date.getDate()}_${date.getMonth() + 1}_${date.getFullYear()}`;

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(firstDate);
      currentDate.setDate(firstDate.getDate() + i);

      const endTime = new Date(currentDate);
      endTime.setHours(21, 0, 0, 0);

      // Set the start time
      if (currentDate.toDateString() === new Date().toDateString()) {
        const now = new Date();
        currentDate.setHours(Math.max(now.getHours() + 1, 10));
        currentDate.setMinutes(now.getMinutes() > 30 ? 30 : 0);
      } else {
        currentDate.setHours(10, 0, 0, 0);
      }

      const timeSlots = [];

      while (currentDate < endTime) {
        const formattedTime = currentDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        const slotDate = generateSlotDate(currentDate);
        const isAvailable = checkSlotAvailable(
          docInfo,
          slotDate,
          formattedTime
        );

        if (isAvailable) {
          timeSlots.push({
            datetime: new Date(currentDate),
            time: isAvailable ? formattedTime : undefined,
          });
        }

        currentDate.setMinutes(currentDate.getMinutes() + 30);
      }

      // If no available slots, add a placeholder
      if (timeSlots.length === 0) {
        timeSlots.push({ datetime: new Date(currentDate), time: false });
      }

      setDocSlots((prev) => [...prev, timeSlots]);
    }
  };

  const formatDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isToday = (date) => date.toDateString() === new Date().toDateString();

  const bookAppointment = async () => {
    if (!token) {
      toast.warn("Login to book appointment");
      return navigate("/login");
    }

    if (!slotTime) {
      return toast.error("Please select the slot time");
    }
    try {
      const date = docSlots[slotIndex][0].datetime;

      let day = date.getDate();
      let month = date.getMonth() + 1;
      let year = date.getFullYear();

      const slotDate = day + "_" + month + "_" + year;

      const { data } = await axios.post(
        backendUrl + "/api/user/book-appointment",
        { docId, slotDate, slotTime, patientNote },
        { headers: { token } }
      );

      if (data.success) {
        toast.success(data.message);
        setPatientNote("");
        getDoctorsData();
        navigate("/my-appointments");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log("error:", error);
      toast.error(error.message);
    }
  };

  const nextAvailableSlot = docSlots
    .flat()
    .find((slot) => slot?.time && slot?.datetime);

  return (
    docInfo && (
      <div>
        {/* --------------Doctor Details ----------------- */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <img
              className="bg-primary w-full sm:max-w-72 rounded-lg  "
              src={docInfo.image}
              alt=""
            />
          </div>

          <div className="flex-1 border border-gray-400 rounded-lg p-8 py-7 bg-white mx-2 sm:mx-0 mt-[80px] sm:mt-0">
            {/* --------------- Doc info name , degree , experience      --------------- */}
            <p className="flex items-center gap-2 text-2xl font-medium text-gray-900">
              {docInfo.name}
              <img className="w-5" src={assets.verified_icon} alt="" />
            </p>
            <div className="flex items-center gap-2 text-sm mt-1 text-gray-600">
              <p>
                {docInfo.degree} - {docInfo.speciality}
              </p>
              <button className=" py-0.5 px-2 border text-xs rounded-full">
                {docInfo.experience}{" "}
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                  docInfo.available
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {docInfo.available ? "Available for booking" : "Currently unavailable"}
              </span>
              <span className="text-sm text-gray-500">
                {docInfo.available && nextAvailableSlot
                  ? `Next available: ${daysOfWeek[nextAvailableSlot.datetime.getDay()]} ${nextAvailableSlot.datetime.getDate()}, ${nextAvailableSlot.time}`
                  : "Please check another doctor or try again later."}
              </span>
            </div>

            {/* ------------- Doctor Avbout */}
            <div>
              <p className="flex items-center gap-1 text-sm font-medium text-gray-900mt-3">
                About <img src={assets.info_icon} alt="" />
              </p>
              <p className="text-sm text-gray-500 max-w-[700px] mt-1">
                {docInfo.about}
              </p>
            </div>
            <p className="text-gray-500 font-medium mt-4">
              Appointment fee:{" "}
              <span className="text-gray-600">
                {currencySymbol}
                {docInfo.fees}
              </span>{" "}
            </p>
          </div>
        </div>

        {/* ---------- Booking slots */}

        <div className="sm:ml-72 sm:pl-4 mt-4 font-medium text-gray-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>Booking slots</p>
            <div className="relative w-fit">
              <button
                onClick={() => setShowCalendar((prev) => !prev)}
                className="flex items-center gap-2 text-primary"
              >
                <FaCalendarAlt />
                Show More Dates
              </button>
              {showCalendar && (
                <input
                  type="date"
                  min={formatDateInputValue(new Date())}
                  value={formatDateInputValue(selectedStartDate)}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    if (!Number.isNaN(date.getTime())) {
                      setSelectedStartDate(date);
                      setShowCalendar(false);
                    }
                  }}
                  className="absolute right-0 top-8 z-10 rounded border border-gray-300 bg-white px-3 py-2 shadow"
                />
              )}
            </div>
          </div>

          <div className="flex gap-3 items-center w-full overflow-x-scroll mt-4 pb-2">
            {docSlots.length &&
              docSlots.map((item, index) => (
                <div
                  onClick={() => setSlotIndex(index)}
                  className={`relative min-w-28 cursor-pointer rounded-xl border px-4 py-5 text-center transition-all ${
                    slotIndex === index
                      ? "bg-primary text-white border-primary shadow"
                      : "border-gray-200 bg-white text-gray-800"
                  }`}
                  key={index}
                >
                  {item[0] && isToday(item[0].datetime) && (
                    <span
                      className={`absolute left-2 top-2 rounded px-2 py-0.5 text-xs ${
                        slotIndex === index
                          ? "bg-white text-primary"
                          : "bg-green-500 text-white"
                      }`}
                    >
                      Today
                    </span>
                  )}
                  <p className="mt-2 text-3xl font-medium">
                    {item[0] && item[0].datetime.getDate()}
                  </p>
                  <p className="text-base">
                    {item[0] && daysOfWeek[item[0].datetime.getDay()]}
                  </p>
                </div>
              ))}
          </div>

          <SlotSelector
            docSlots={docSlots}
            slotIndex={slotIndex}
            slotTime={slotTime}
            setSlotTime={setSlotTime}
          />

          <div className="mt-5 max-w-2xl">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tell the doctor your problem
            </label>
            <textarea
              value={patientNote}
              onChange={(e) => setPatientNote(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Write symptoms, concerns, or anything the doctor should know before the appointment."
              className="w-full resize-none rounded border border-gray-300 px-4 py-3 text-sm text-gray-700 outline-primary"
            />
            <p className="mt-1 text-xs text-gray-400">
              {patientNote.length}/500 characters
            </p>
          </div>
          <button
            onClick={bookAppointment}
            disabled={!docInfo.available}
            className={`text-sm font-light px-14 py-3 rounded-full my-5 ${
              docInfo.available
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            Book an appointment
          </button>
        </div>

        {/* ------------------listing related doctors */}
        <RelatedDoctors docId={docId} speciality={docInfo.speciality} />
      </div>
    )
  );
};

export default Appointment;
