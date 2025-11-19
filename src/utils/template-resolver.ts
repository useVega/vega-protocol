/**
 * Template Resolver Utility
 * Resolves template strings like {{node.output}} with actual values
 */

export class TemplateResolver {
  /**
   * Resolve template string with context
   * Example: "{{crawler.output}}" -> actual output value
   */
  resolve(template: string | any, context: Record<string, any>): any {
    if (typeof template !== 'string') {
      return template;
    }

    // Check if it's a template string
    const templatePattern = /\{\{([^}]+)\}\}/g;
    
    if (!templatePattern.test(template)) {
      return template;
    }

    // Reset regex
    templatePattern.lastIndex = 0;

    // If entire string is a template, return the value directly
    const fullMatch = template.match(/^\{\{([^}]+)\}\}$/);
    if (fullMatch) {
      return this.getNestedValue(context, fullMatch[1].trim());
    }

    // Otherwise, replace templates within the string
    return template.replace(templatePattern, (match, path) => {
      const value = this.getNestedValue(context, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Resolve all templates in an object
   */
  resolveObject(obj: Record<string, any>, context: Record<string, any>): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        resolved[key] = this.resolve(value, context);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        resolved[key] = this.resolveObject(value, context);
      } else if (Array.isArray(value)) {
        resolved[key] = value.map(item => 
          typeof item === 'string' ? this.resolve(item, context) : item
        );
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Get nested value from object using dot notation
   * Example: "node1.output.data" -> context.node1.output.data
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}
