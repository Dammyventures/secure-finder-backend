import axios from 'axios'
import { logger } from '../utils/logger'

interface MatchResult {
  itemId: string
  score: number
  reason: string
}

export class AIService {
  private apiKey: string
  private apiUrl: string
  
  constructor() {
    this.apiKey = process.env.AI_API_KEY || ''
    this.apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1'
  }
  
  async findMatches(item: any): Promise<MatchResult[]> {
    try {
      const prompt = this.buildMatchPrompt(item)
      
      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant that helps find matches for lost and found items.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      return this.parseMatches(response.data.choices[0].message.content)
    } catch (error) {
      logger.error('AI match finding failed:', error)
      return []
    }
  }
  
  private buildMatchPrompt(item: any): string {
    return `
      Find potential matches for this ${item.itemType} item:
      
      Title: ${item.title}
      Description: ${item.description}
      Category: ${item.category}
      Location: ${item.location.city}, ${item.location.country}
      Features: ${item.identifyingFeatures?.join(', ') || 'None specified'}
      
      Return matches as JSON array with itemId, score (0-100), and reason.
    `
  }
  
  private parseMatches(content: string): MatchResult[] {
    try {
      const matches = JSON.parse(content)
      return Array.isArray(matches) ? matches : []
    } catch {
      logger.warn('Failed to parse AI matches response')
      return []
    }
  }
}

export const aiService = new AIService()