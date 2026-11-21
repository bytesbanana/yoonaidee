type IntakeFlexInput = {
  reply: string;
  language: "th" | "en";
  needsClarification: boolean;
};

const headings = {
  th: { question: "ขอข้อมูลเพิ่มเติม", update: "ความต้องการที่พัก" },
  en: { question: "One more detail", update: "Housing preferences" },
};

export function buildIntakeFlex({ reply, language, needsClarification }: IntakeFlexInput) {
  const title = headings[language][needsClarification ? "question" : "update"];
  return {
    type: "flex",
    // Bound the notification preview without splitting a Unicode code point.
    altText: Array.from(reply).slice(0, 500).join(""),
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        spacing: "md",
        contents: [
          { type: "text", text: title, size: "md", weight: "bold", color: "#166534", wrap: true },
          { type: "text", text: reply, size: "sm", color: "#1C1917", wrap: true },
        ],
      },
    },
  } as const;
}

export type IntakeLineMessage = ReturnType<typeof buildIntakeFlex> | { type: "text"; text: string };
