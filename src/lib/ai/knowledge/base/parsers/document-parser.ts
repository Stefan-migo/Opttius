import { promises as fs } from 'fs';
import { join } from 'path';

export interface ParsedDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  metadata: DocumentMetadata;
  sections: DocumentSection[];
}

export interface DocumentMetadata {
  createdAt: Date;
  updatedAt: Date;
  version: string;
  author: string;
  maintainer: string;
  lastReviewed: Date;
}

export interface DocumentSection {
  heading: string;
  level: number;
  content: string;
  startPosition: number;
  endPosition: number;
}

export interface ParseOptions {
  extractMetadata?: boolean;
  extractSections?: boolean;
  extractTags?: boolean;
}

export class DocumentParser {
  /**
   * Parse a markdown document into structured content
   */
  async parseDocument(filePath: string, options: ParseOptions = {}): Promise<ParsedDocument> {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = filePath.split('/').pop()?.replace('.md', '') || '';
    
    const parsed: ParsedDocument = {
      id: this.generateDocumentId(filePath),
      title: this.extractTitle(content),
      content,
      category: this.determineCategory(filePath),
      tags: options.extractTags ? this.extractTags(content) : [],
      metadata: options.extractMetadata ? this.extractMetadata(content) : this.getDefaultMetadata(),
      sections: options.extractSections ? this.extractSections(content) : []
    };

    return parsed;
  }

  /**
   * Parse multiple documents from a directory
   */
  async parseDirectory(directoryPath: string, options: ParseOptions = {}): Promise<ParsedDocument[]> {
    const files = await fs.readdir(directoryPath);
    const markdownFiles = files.filter(file => file.endsWith('.md'));
    
    const documents: ParsedDocument[] = [];
    
    for (const file of markdownFiles) {
      try {
        const filePath = join(directoryPath, file);
        const document = await this.parseDocument(filePath, options);
        documents.push(document);
      } catch (error) {
        console.warn(`Failed to parse document ${file}:`, error);
      }
    }
    
    return documents;
  }

  /**
   * Extract title from markdown content (first # heading)
   */
  private extractTitle(content: string): string {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : 'Untitled Document';
  }

  /**
   * Extract sections from markdown content
   */
  private extractSections(content: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    
    const headings: Array<{ level: number; text: string; position: number }> = [];
    
    while ((match = headingRegex.exec(content)) !== null) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        position: match.index
      });
    }
    
    // Create sections between headings
    for (let i = 0; i < headings.length; i++) {
      const current = headings[i];
      const next = headings[i + 1];
      
      const sectionContent = next 
        ? content.substring(current.position, next.position)
        : content.substring(current.position);
      
      sections.push({
        heading: current.text,
        level: current.level,
        content: sectionContent,
        startPosition: current.position,
        endPosition: next ? next.position : content.length
      });
    }
    
    return sections;
  }

  /**
   * Extract tags from content (looking for <!-- tags: tag1, tag2 --> comments)
   */
  private extractTags(content: string): string[] {
    const tagRegex = /<!--\s*tags:\s*([^-->]+)\s*-->/i;
    const match = content.match(tagRegex);
    
    if (match) {
      return match[1]
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);
    }
    
    // Fallback: extract from YAML frontmatter if present
    const yamlRegex = /^---\s*\ntags:\s*\[([^\]]+)\]\s*\n---/m;
    const yamlMatch = content.match(yamlRegex);
    
    if (yamlMatch) {
      return yamlMatch[1]
        .split(',')
        .map(tag => tag.trim().replace(/['"]/g, '').toLowerCase())
        .filter(tag => tag.length > 0);
    }
    
    return [];
  }

  /**
   * Extract metadata from YAML frontmatter
   */
  private extractMetadata(content: string): DocumentMetadata {
    const yamlRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(yamlRegex);
    
    if (match) {
      const yamlContent = match[1];
      const metadata: Partial<DocumentMetadata> = {};
      
      // Simple YAML parser for our use case
      const lines = yamlContent.split('\n');
      for (const line of lines) {
        const [key, value] = line.split(':').map(s => s.trim());
        if (key && value) {
          switch (key.toLowerCase()) {
            case 'createdat':
            case 'created':
              metadata.createdAt = new Date(value);
              break;
            case 'updatedat':
            case 'updated':
              metadata.updatedAt = new Date(value);
              break;
            case 'version':
              metadata.version = value.replace(/['"]/g, '');
              break;
            case 'author':
              metadata.author = value.replace(/['"]/g, '');
              break;
            case 'maintainer':
              metadata.maintainer = value.replace(/['"]/g, '');
              break;
            case 'lastreviewed':
              metadata.lastReviewed = new Date(value);
              break;
          }
        }
      }
      
      return {
        createdAt: metadata.createdAt || new Date(),
        updatedAt: metadata.updatedAt || new Date(),
        version: metadata.version || '1.0.0',
        author: metadata.author || 'System',
        maintainer: metadata.maintainer || 'Documentation Team',
        lastReviewed: metadata.lastReviewed || new Date()
      };
    }
    
    return this.getDefaultMetadata();
  }

  /**
   * Determine document category from file path
   */
  private determineCategory(filePath: string): string {
    const pathParts = filePath.toLowerCase().split('/');
    
    // Look for category indicators in path
    if (pathParts.includes('core-system')) return 'core-system';
    if (pathParts.includes('business-modules')) return 'business-modules';
    if (pathParts.includes('admin-features')) return 'admin-features';
    if (pathParts.includes('integrations')) return 'integrations';
    if (pathParts.includes('troubleshooting')) return 'troubleshooting';
    
    return 'general';
  }

  /**
   * Generate unique document ID from file path
   */
  private generateDocumentId(filePath: string): string {
    return filePath
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get default metadata for documents without explicit metadata
   */
  private getDefaultMetadata(): DocumentMetadata {
    return {
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0',
      author: 'Documentation System',
      maintainer: 'Documentation Team',
      lastReviewed: new Date()
    };
  }
}