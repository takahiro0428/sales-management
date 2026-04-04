import { getGenerativeModel } from 'firebase/vertexai'
import { PRODUCT_CATEGORIES } from './useProducts'

export interface AiSuggestion {
  category: string
  tags: string[]
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

  return { suggestCategoryAndTags }
}
