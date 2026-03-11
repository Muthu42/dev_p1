
const STATIC_MESSAGES: string[] = [
  "With every sunrise, my love for you grows a little deeper, and every sunset reminds me how lucky I am to have you.",
  "Our special day isn't just a date on the calendar—it's the moment my world quietly chose you, and never looked back.",
  "You are my favorite story, my soft place to land, and the gentle reason my heart keeps learning new ways to love.",
  "In the quiet between heartbeats, I find you—steady, warm, and endlessly mine.",
  "If I could choose again, in every lifetime, in every universe, it would still be you, every single time.",
  "You turned ordinary days into constellations of tiny miracles, and I never want to stop tracing them with you.",
  "Love is no longer a word to me; it's the way you say my name, the way you hold my hand, the way you stay.",
  "Our love is a slow, beautiful poem the universe keeps writing—line by line, glance by glance, touch by touch.",
  "No matter how much time passes, the safest place I know will always be the space between your arms and your heartbeat.",
  "Thank you for being my once-in-a-lifetime kind of love—the one that feels like home, hope, and forever all at once."
];

export const generateRomanticMessage = async (name: string, date: string): Promise<string> => {
  const base = STATIC_MESSAGES[Math.floor(Math.random() * STATIC_MESSAGES.length)];

  const namePart = name?.trim() ? ` ${name.trim()},` : "";
  const datePart = date?.trim()
    ? ` On ${new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}, our story found another beautiful reason to last forever.`
    : "";

  return `${namePart}${namePart ? " " : ""}${base}${datePart}`;
};
