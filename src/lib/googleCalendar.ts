/**
 * Helpers para gerar URLs de "Adicionar ao Google Calendar" (sem OAuth).
 * Abre o Google Calendar com os campos pré-preenchidos para o usuário confirmar.
 */

interface CalendarEventInput {
  title: string;
  description?: string | null;
  date: string; // YYYY-MM-DD
  time?: string | null; // HH:MM ou HH:MM:SS
  durationMinutes?: number; // padrão 60
  location?: string | null;
}

/**
 * Formata uma data/hora para o padrão do Google Calendar.
 * - Com hora: 20250115T143000  (local time, sem sufixo Z)
 * - Sem hora (dia inteiro): 20250115
 */
function formatGCalDate(date: string, time?: string | null): string {
  const datePart = date.split("-").join("");
  if (!time) return datePart;
  const [h = "00", m = "00", s = "00"] = time.split(":");
  return `${datePart}T${h.padStart(2, "0")}${m.padStart(2, "0")}${(s || "00").padStart(2, "0")}`;
}

function addMinutesToTime(time: string, minutes: number): { date: string; time: string } {
  const [h = "0", m = "0"] = time.split(":");
  const total = parseInt(h) * 60 + parseInt(m) + minutes;
  const newH = Math.floor(total / 60) % 24;
  const dayOffset = Math.floor(total / 60 / 24);
  const newM = total % 60;
  return {
    date: dayOffset > 0 ? "next" : "same",
    time: `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`,
  };
}

function addDaysToISODate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  const { title, description, date, time, durationMinutes = 60, location } = event;

  let startStr: string;
  let endStr: string;

  if (time) {
    startStr = formatGCalDate(date, time);
    const { date: dateOffset, time: endTime } = addMinutesToTime(time, durationMinutes);
    const endDate = dateOffset === "next" ? addDaysToISODate(date, 1) : date;
    endStr = formatGCalDate(endDate, endTime);
  } else {
    // Evento de dia inteiro: end deve ser o dia seguinte (exclusivo)
    startStr = formatGCalDate(date);
    endStr = formatGCalDate(addDaysToISODate(date, 1));
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startStr}/${endStr}`,
  });

  if (description) params.append("details", description);
  if (location) params.append("location", location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function openInGoogleCalendar(event: CalendarEventInput): void {
  const url = buildGoogleCalendarUrl(event);
  window.open(url, "_blank", "noopener,noreferrer");
}
