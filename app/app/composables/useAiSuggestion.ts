import { getGenerativeModel } from 'firebase/vertexai'
import { PRODUCT_CATEGORIES } from './useProducts'

export interface AiSuggestion {
  category: string
  tags: string[]
}

export interface AiImageSuggestion extends AiSuggestion {
  name: string
  description: string
  price: number
}

export const useAiSuggestion = () => {
  const { $vertexAI } = useNuxtApp()
  const config = useRuntimeConfig()

  const suggestCategoryAndTags = async (
    name: string,
    description: string,
  ): Promise<AiSuggestion> => {
    try {
      const modelName = config.public.vertexAiModel || 'gemini-2.5-flash'
      const model = getGenerativeModel($vertexAI, { model: modelName })

      const prompt = `あなたはフリーマーケット商品のカテゴリ分類とタグ付けの専門家です。
以下の商品情報から、最適なカテゴリとタグを提案してください。

商品名: ${name}
説明: ${description || 'なし'}

カテゴリは以下から1つ選んでください:
${PRODUCT_CATEGORIES.join(', ')}

タグは商品の特徴を表す短いキーワードを3〜5個提案してください。

以下のJSON形式で回答してください（JSONのみ、他のテキストは不要）:
{"category": "カテゴリ名", "tags": ["タグ1", "タグ2", "タグ3"]}`

      const result = await model.generateContent(prompt)
      const text = result.response.text()

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return { category: 'その他', tags: [] }
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Validate category
      const category = PRODUCT_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : 'その他'

      // Validate tags
      const tags = Array.isArray(parsed.tags)
        ? parsed.tags.filter((t: unknown) => typeof t === 'string' && t.length > 0).slice(0, 5)
        : []

      return { category, tags }
    } catch (e) {
      console.warn('[AI Suggestion] カテゴリ・タグの自動生成に失敗しました:', e)
      return { category: 'その他', tags: [] }
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(',')[1]
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const suggestFromImage = async (file: File): Promise<AiImageSuggestion> => {
    try {
      const modelName = config.public.vertexAiModel || 'gemini-2.5-flash'
      const model = getGenerativeModel($vertexAI, { model: modelName })

      const base64Data = await fileToBase64(file)

      const prompt = `あなたはフリーマーケット商品の分析専門家です。
この商品画像を分析して、以下の情報を提案してください。

カテゴリは以下から1つ選んでください:
${PRODUCT_CATEGORIES.join(', ')}

タグは商品の特徴を表す短いキーワードを3〜5個提案してください。
価格はフリーマーケットでの一般的な販売価格（日本円）を参考値として提案してください。

以下のJSON形式で回答してください（JSONのみ、他のテキストは不要）:
{"name": "商品名", "description": "商品の説明文（2〜3文）", "price": 500, "category": "カテゴリ名", "tags": ["タグ1", "タグ2", "タグ3"]}`

      const result = await model.generateContent([
        { inlineData: { mimeType: file.type, data: base64Data } },
        { text: prompt },
      ])
      const text = result.response.text()

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return { name: '', description: '', price: 0, category: 'その他', tags: [] }
      }

      const parsed = JSON.parse(jsonMatch[0])

      const name = typeof parsed.name === 'string' ? parsed.name : ''
      const description = typeof parsed.description === 'string' ? parsed.description : ''
      const price = typeof parsed.price === 'number' && parsed.price >= 0 ? Math.round(parsed.price) : 0
      const category = PRODUCT_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : 'その他'
      const tags = Array.isArray(parsed.tags)
        ? parsed.tags.filter((t: unknown) => typeof t === 'string' && t.length > 0).slice(0, 5)
        : []

      return { name, description, price, category, tags }
    } catch (e) {
      console.warn('[AI Suggestion] 画像からの自動生成に失敗しました:', e)
      throw e
    }
  }

  return { suggestCategoryAndTags, suggestFromImage }
}
