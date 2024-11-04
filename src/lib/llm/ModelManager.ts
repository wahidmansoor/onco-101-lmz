import { SSHKey } from './types';

class ModelManager {
  private static instance: ModelManager;
  private model: any = null;
  private isInitializing = false;
  private apiKey: string;
  
  private status = {
    isReady: false,
    isLoading: false,
    error: null as string | null,
    progress: 0
  };

  private constructor() {
    this.apiKey = import.meta.env.VITE_SSH_KEY;
  }

  public static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  public getStatus() {
    return { ...this.status };
  }

  private async initializeModel() {
    if (this.model) return this.model;
    if (this.isInitializing) return null;

    try {
      this.isInitializing = true;
      this.status = {
        isReady: false,
        isLoading: true,
        error: null,
        progress: 0
      };

      // Initialize Ollama connection
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama2',
          system: 'You are an oncology AI assistant with expertise in cancer treatments and protocols.'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initialize Ollama model');
      }

      this.model = true; // Mark as initialized
      this.status = {
        isReady: true,
        isLoading: false,
        error: null,
        progress: 100
      };

      return this.model;
    } catch (error) {
      this.status = {
        isReady: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Model initialization failed',
        progress: 0
      };
      return null;
    } finally {
      this.isInitializing = false;
    }
  }

  public async generateResponse(prompt: string, context: string) {
    if (!prompt.trim()) {
      return {
        text: '',
        error: 'Empty prompt'
      };
    }

    try {
      await this.initializeModel();

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama2',
          prompt: `Context: ${context}\n\nQuestion: ${prompt}`,
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      const data = await response.json();
      
      return {
        text: data.response,
        metadata: {
          isChemotherapyQuery: this.isChemotherapyQuery(prompt)
        }
      };
    } catch (error) {
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Failed to generate response'
      };
    }
  }

  private isChemotherapyQuery(prompt: string): boolean {
    const keywords = ['chemo', 'chemotherapy', 'protocol', 'regimen', 'treatment'];
    return keywords.some(keyword => prompt.toLowerCase().includes(keyword));
  }
}

export default ModelManager;