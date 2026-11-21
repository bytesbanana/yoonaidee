export function buildAnalysisQueuedFlex() {
  return {
    type: "flex",
    altText: "Yoo Nai Dee กำลังค้นหาที่อยู่ให้คุณ",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: "Yoo Nai Dee", weight: "bold", size: "md", color: "#111827", flex: 1 },
          { type: "text", text: "SEARCHING", size: "xs", color: "#2563EB", align: "end", flex: 0 },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: "กำลังค้นหาที่อยู่ที่ใช่ 🏡", weight: "bold", size: "lg", wrap: true },
          { type: "text", text: "AI กำลังวิเคราะห์ค่าเช่า การเดินทาง และไลฟ์สไตล์ที่เหมาะกับคุณ", size: "sm", color: "#6B7280", wrap: true },
          { type: "text", text: "กำลังวิเคราะห์ข้อมูล...", size: "sm", color: "#2563EB", wrap: true },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [{
          type: "button",
          style: "primary",
          color: "#06C755",
          action: {
            type: "uri",
            label: "ดูสถานะการค้นหา",
            uri: "https://miniapp.line.me/2012621103-OpONnNqR",
          },
        }],
      },
    },
  } as const;
}

export type IntakeLineMessage = ReturnType<typeof buildAnalysisQueuedFlex> | { type: "text"; text: string };
