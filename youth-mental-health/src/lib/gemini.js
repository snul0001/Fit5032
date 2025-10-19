// src/lib/gemini.js
import { GoogleGenerativeAI } from '@google/generative-ai'

// IMPORTANT: This uses a public key in the browser (OK for dev).
// For production, route via a server proxy (see section 6).
const apiKey = import.meta.env.VITE_GEMINI_API_KEY
if (!apiKey) {
  console.warn('[Gemini] Missing VITE_GEMINI_API_KEY')
}

const genAI = new GoogleGenerativeAI(apiKey)

// Models: flash = cheaper/faster; pro = better reasoning
export const GEMINI_MODEL = 'gemini-1.5-flash'

export function getModel() {
  return genAI.getGenerativeModel({ model: GEMINI_MODEL })
}
