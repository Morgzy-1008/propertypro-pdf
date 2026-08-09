export default function handler(req, res) {
  res.status(200).json({
    gemini: process.env.GEMINI_API_KEY,
    vite_gemini: process.env.VITE_GEMINI_API_KEY
  });
}
