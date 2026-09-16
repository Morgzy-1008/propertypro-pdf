export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    hasServerKey: Boolean(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)
  });
}
