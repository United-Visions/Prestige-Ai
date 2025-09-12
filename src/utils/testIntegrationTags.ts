// Test utility to verify integration tag parsing
// This can be used to debug why integration UI components disappear

export function testTagParsing(response: string) {
  console.group('🧪 Testing Integration Tag Parsing');
  
  const originalResponse = response;
  console.log('Original response:', originalResponse);
  
  // Simulate the parsing logic from continuousAgentProcessor
  let chatContent = response;
  
  // Remove thinking tags
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  chatContent = chatContent.replace(thinkRegex, '').trim();
  console.log('After removing thinking tags:', chatContent);
  
  // Remove prestige-write tags
  const writeRegex = /<prestige-write path="([^"]+)" description="([^"]*)">([\s\S]*?)<\/prestige-write>/g;
  chatContent = chatContent.replace(writeRegex, '').trim();
  console.log('After removing write tags:', chatContent);
  
  // Remove other operational tags
  const renameRegex = /<prestige-rename from="([^"]+)" to="([^"]+)"><\/prestige-rename>/g;
  chatContent = chatContent.replace(renameRegex, '').trim();
  
  const deleteRegex = /<prestige-delete path="([^"]+)"><\/prestige-delete>/g;
  chatContent = chatContent.replace(deleteRegex, '').trim();
  
  const dependencyRegex = /<prestige-add-dependency packages="([^"]+)"><\/prestige-add-dependency>/g;
  chatContent = chatContent.replace(dependencyRegex, '').trim();
  
  const commandRegex = /<prestige-command type="([^"]+)"><\/prestige-command>/g;
  chatContent = chatContent.replace(commandRegex, '').trim();
  
  const summaryRegex = /<prestige-chat-summary>([\s\S]*?)<\/prestige-chat-summary>/;
  chatContent = chatContent.replace(summaryRegex, '').trim();
  
  console.log('Final chatContent (should preserve integration tags):', chatContent);
  
  // Check specifically for integration tags
  const integrationRegex = /<prestige-add-integration[^>]*>/g;
  const integrationTags = chatContent.match(integrationRegex) || [];
  console.log('Integration tags found in final content:', integrationTags);
  
  console.groupEnd();
  
  return {
    originalResponse,
    finalChatContent: chatContent,
    integrationTagsFound: integrationTags.length,
    hasIntegrationTags: integrationTags.length > 0
  };
}

// Test with sample content
export function runIntegrationTagTests() {
  console.log('🚀 Running Integration Tag Tests');
  
  const testCases = [
    {
      name: 'Basic Integration Tag',
      content: 'I need authentication. <prestige-add-integration provider="supabase"></prestige-add-integration> Please set this up.'
    },
    {
      name: 'Integration with Thinking',
      content: '<think>User wants auth</think>You need Supabase: <prestige-add-integration provider="supabase"></prestige-add-integration>'
    },
    {
      name: 'Integration with File Operations',
      content: `
<prestige-write path="test.js">console.log('test');</prestige-write>
You also need: <prestige-add-integration provider="supabase"></prestige-add-integration>
<prestige-command type="restart"></prestige-command>
      `
    }
  ];
  
  testCases.forEach(testCase => {
    console.log(`\n--- Testing: ${testCase.name} ---`);
    const result = testTagParsing(testCase.content);
    console.log(`Integration tags preserved: ${result.hasIntegrationTags}`);
  });
}

// Export for easy debugging in browser console
(window as any).testIntegrationTags = { testTagParsing, runIntegrationTagTests };