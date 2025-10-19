// src/lib/searchContent.js
import { getFirestore, collection, getDocs } from 'firebase/firestore'

// Pull a small snapshot of your content to feed as context.
export async function getContextSnapshots(limitPerType = 12) {
  const db = getFirestore()
  const out = { resources: [], services: [] }

  // resources: title, topics/tags/category, short content/snippet if you have it
  try {
    const rs = await getDocs(collection(db, 'resources'))
    out.resources = rs.docs.slice(0, limitPerType).map(d => {
      const x = d.data()
      const topics = Array.isArray(x.topics) ? x.topics
                    : Array.isArray(x.tags) ? x.tags
                    : x.category ? [x.category] : []
      const snippet = x.snippet || x.summary || x.content?.slice?.(0, 300) || ''
      return {
        id: d.id,
        title: x.title || 'Untitled',
        topics,
        readingTime: x.readingTime ?? x.readTime ?? x.readingMinutes ?? x.minutes ?? null,
        snippet
      }
    })
  } catch (e) {
    console.warn('[RAG] resources fetch failed', e)
  }

  // services: name, address, phone, tags/category if present
  try {
    const ss = await getDocs(collection(db, 'services'))
    out.services = ss.docs.slice(0, limitPerType).map(d => {
      const x = d.data()
      const tags = Array.isArray(x.tags) ? x.tags : x.category ? [x.category] : []
      return {
        id: d.id,
        name: x.name || 'Service',
        address: x.address || '',
        phone: x.phone || x.tel || '',
        tags
      }
    })
  } catch (e) {
    console.warn('[RAG] services fetch failed', e)
  }

  return out
}

// VERY light keyword filter to pick the most relevant bits.
// If you later add embeddings, swap this with a vector similarity lookup.
export function selectRelevantChunks(query, ctx, perType = 5) {
  const q = (query || '').toLowerCase()

  function scoreText(t) {
    if (!t) return 0
    let s = 0
    for (const tok of q.split(/\s+/)) {
      if (!tok) continue
      if (t.includes(tok)) s += 1
    }
    return s
  }

  const resScored = (ctx.resources || []).map(r => ({
    item: r,
    score: scoreText(
      [r.title, (r.topics||[]).join(' '), r.snippet].join(' ').toLowerCase()
    )
  })).sort((a,b) => b.score - a.score).slice(0, perType).map(x => x.item)

  const svcScored = (ctx.services || []).map(s => ({
    item: s,
    score: scoreText(
      [s.name, (s.tags||[]).join(' '), s.address, s.phone].join(' ').toLowerCase()
    )
  })).sort((a,b) => b.score - a.score).slice(0, perType).map(x => x.item)

  return { resources: resScored, services: svcScored }
}
