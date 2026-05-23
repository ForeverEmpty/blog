export const dailyQuote = [
  "真正让我难受的，大概是因为让你看到如此狼狈的自己。",
  "最不忍的恨中藏有最深沉的爱，最残酷的死亡源于最悲悯的审判！",
  "人生的真理，只是藏在平淡无味之中",
];

type SayingResponse = {
  text?: unknown
}

export async function getDailyQuote() {
  const quotes = new Set(dailyQuote);

  if (!import.meta.server) {
    return [...quotes].reverse();
  }

  const baseUrl = "https://uapis.cn";
  const url = `${baseUrl}/api/v1/saying`;

  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url);
      const data = await response.json() as SayingResponse;

      if (typeof data.text === "string" && data.text.trim().length > 0) {
        quotes.add(data.text.trim());
      }
    } catch (error) {
      console.warn(error);
    }
  }

  return [...quotes].reverse();
}

export default dailyQuote;
