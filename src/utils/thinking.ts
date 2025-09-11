// Browser-safe thinking utilities

export function supportsThinking(model: string): boolean {
  // Check if the model supports thinking capabilities
  return model.includes('claude') || model.includes('gpt-4');
}

export function extractThinking(content: string): { thinking: string; response: string } {
  // Extract thinking blocks from response
  const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/g;
  const matches = content.match(thinkingRegex);
  
  if (!matches) {
    return { thinking: '', response: content };
  }
  
  const thinking = matches.map(match => 
    match.replace(/<\/?thinking>/g, '').trim()
  ).join('\n\n');
  
  const response = content.replace(thinkingRegex, '').trim();
  
  return { thinking, response };
}