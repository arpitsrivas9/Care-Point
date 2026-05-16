import { useState } from "react";

const quickReplies = [
  "How do I book?",
  "Can I cancel?",
  "Payment help",
  "Doctor availability",
];

const getBotReply = (message) => {
  const text = message.toLowerCase();

  if (text.includes("book") || text.includes("appointment")) {
    return "Open a doctor's profile, choose an available date and time, add your problem note, then click Book an appointment.";
  }

  if (text.includes("cancel")) {
    return "Go to My Appointments and use Cancel Appointment before the visit is completed.";
  }

  if (text.includes("pay") || text.includes("payment") || text.includes("razorpay")) {
    return "After booking, open My Appointments and click Pay Online. If payment fails, you can try again from the same appointment.";
  }

  if (text.includes("available") || text.includes("time") || text.includes("slot")) {
    return "Doctor availability is shown on the doctor profile. Green means available, red means currently unavailable. Only open slots can be selected.";
  }

  if (text.includes("note") || text.includes("problem") || text.includes("symptom")) {
    return "Use the problem note below the slot selector to describe symptoms. Urgent words like severe pain, fever, bleeding, or breathing issue are marked high priority for staff.";
  }

  return "I can help with booking, cancellation, payment, doctor availability, and appointment notes. Please ask your question in a few words.";
};

const AppointmentChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi, I can help with appointment booking questions.",
    },
  ]);

  const sendMessage = (messageText = input) => {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { from: "user", text: trimmed },
      { from: "bot", text: getBotReply(trimmed) },
    ]);
    setInput("");
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {isOpen && (
        <div className="mb-3 w-[min(22rem,calc(100vw-2rem))] rounded-lg border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="font-semibold text-gray-800">Care Point Help</p>
              <p className="text-xs text-gray-500">Appointment assistant</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full px-2 py-1 text-gray-500 hover:bg-gray-100"
            >
              x
            </button>
          </div>

          <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  message.from === "user"
                    ? "ml-auto bg-primary text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 border-t px-4 py-3">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                onClick={() => sendMessage(reply)}
                className="rounded-full border px-3 py-1 text-xs text-gray-600 hover:border-primary hover:text-primary"
              >
                {reply}
              </button>
            ))}
          </div>

          <div className="flex gap-2 border-t p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about appointments..."
              className="min-w-0 flex-1 rounded border px-3 py-2 text-sm outline-primary"
            />
            <button
              onClick={() => sendMessage()}
              className="rounded bg-primary px-4 py-2 text-sm text-white"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-white shadow-lg"
      >
        Help
      </button>
    </div>
  );
};

export default AppointmentChatbot;
