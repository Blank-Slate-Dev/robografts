// robografts/app/api/analyse/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are RoboGrafts AI — a medical computer vision system for robotic FUE (Follicular Unit Extraction) hair transplant procedures.

CRITICAL FUE CLINICAL RULES:
- FUE extracts follicles INDIVIDUALLY one by one — never the strip/FUT method
- Safe extraction limit: no more than 50% of follicles in any zone may be extracted
- The remaining 50% MUST be left in place so the donor area does not look sparse after surgery
- Extracted follicles must be evenly distributed across the donor zone — never cluster extractions in one area
- This even spacing rule is what makes FUE look natural post-operatively

IMAGE QUALITY ASSESSMENT:
Before detecting follicles, assess the image quality and set image_quality accordingly:
- "Good": Clean, sharp, well-lit dermoscopy or macro image — follicles clearly visible
- "Fair": Slightly blurry, low contrast, or minor artifacts — detection possible but reduced accuracy
- "Poor": Heavily blurred, watermarked, compressed, or non-scalp image — detection unreliable

CONFIDENCE RULES:
- Only include follicles you can detect with 75% confidence or higher
- Do not guess or estimate follicles in unclear areas — omit them entirely
- A follicle must show a visible hair shaft or follicle opening to be included
- Position x_percent and y_percent at the BASE of the follicle/hair shaft, not the tip

When given a scalp image, detect every clearly visible follicle and return ONLY a valid JSON object:

{
  "image_quality": "<Good|Fair|Poor>",
  "image_quality_notes": "<string — brief note on image quality issues if any>",
  "follicles": [
    {
      "id": <number>,
      "x_percent": <number 0-100>,
      "y_percent": <number 0-100>,
      "angle": <number in degrees>,
      "viable": <boolean>,
      "extract": <boolean — true for max 50% evenly spaced, false for leave-in-place>,
      "confidence": <number 75-100 — only include if 75 or above>
    }
  ],
  "density": "<Low|Medium|High>",
  "density_score": <number 0-100>,
  "avg_angle": <number in degrees>,
  "scalp_condition": "<Healthy|Fair|Poor>",
  "recommended_action": "<string — reference individual FUE extraction and donor preservation>",
  "zones": [
    {
      "id": <number>,
      "label": "<string>",
      "density": "<Low|Medium|High>",
      "viable": <boolean>,
      "extraction_rate": <number 0-50>,
      "notes": "<string>"
    }
  ],
  "summary": "<string — 2-3 sentences covering follicle count, extraction plan, and donor preservation>",
  "warnings": ["<string>"]
}

Return ONLY the JSON object, no other text, no markdown fences.`

interface RawFollicle {
  id: number
  x_percent: number
  y_percent: number
  angle: number
  viable: boolean
  extract: boolean
  confidence: number
}

// Enforce minimum spacing between extract dots
// Two extract follicles cannot be within 5% of each other (image percentage units)
function enforceExtractSpacing(follicles: RawFollicle[]): RawFollicle[] {
  const MIN_SPACING = 5 // percent units
  const result = [...follicles]
  const extractSelected: RawFollicle[] = []

  // Sort by confidence descending — keep highest confidence extractions first
  const sorted = result.sort((a, b) => b.confidence - a.confidence)

  for (const f of sorted) {
    if (!f.extract) continue

    // Check distance to all already-confirmed extract follicles
    const tooClose = extractSelected.some(selected => {
      const dx = f.x_percent - selected.x_percent
      const dy = f.y_percent - selected.y_percent
      return Math.sqrt(dx * dx + dy * dy) < MIN_SPACING
    })

    if (tooClose) {
      // Demote to leave-in-place
      const idx = result.findIndex(r => r.id === f.id)
      if (idx !== -1) result[idx] = { ...result[idx], extract: false }
    } else {
      extractSelected.push(f)
    }
  }

  return result
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = await req.json()

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 }
          },
          {
            type: 'text',
            text: 'Analyse this scalp image. First assess image quality. Then detect all follicles you can identify with 75%+ confidence. Create an optimal FUE extraction plan selecting max 50% for extraction, evenly spaced to preserve donor density.'
          }
        ]
      }]
    })

    const text = response.content.find(b => b.type === 'text')?.text ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Filter to only follicles with confidence >= 75 (enforce server-side too)
    const rawFollicles: RawFollicle[] = (parsed.follicles ?? []).filter(
      (f: RawFollicle) => f.confidence >= 75
    )

    // Enforce minimum spacing between extract dots
    const follicles = enforceExtractSpacing(rawFollicles)

    // Calculate all counts server-side
    const follicle_count = follicles.length
    const viable_count = follicles.filter(f => f.viable).length
    const extract_count = follicles.filter(f => f.extract).length
    const leave_count = follicle_count - extract_count
    const viable_percentage = follicle_count > 0 ? Math.round((viable_count / follicle_count) * 100) : 0
    const extraction_rate = follicle_count > 0 ? Math.round((extract_count / follicle_count) * 100) : 0

    // Add image quality warning if needed
    const warnings = parsed.warnings ?? []
    if (parsed.image_quality === 'Poor') {
      warnings.unshift('⚠ Poor image quality detected — results may be unreliable. Use a dermoscope or high resolution macro image for accurate detection.')
    } else if (parsed.image_quality === 'Fair') {
      warnings.unshift('Image quality is fair — some follicles may have been omitted due to low confidence. Higher resolution imaging recommended.')
    }

    return NextResponse.json({
      ...parsed,
      follicles,
      follicle_count,
      viable_count,
      extract_count,
      leave_count,
      viable_percentage,
      extraction_rate,
      warnings
    })

  } catch (err) {
    console.error('Analysis error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
