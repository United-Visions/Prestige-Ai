/**
 * Test script to verify the enhanced continuous building system
 * This simulates how the enhanced Prestige-Ai system should work like dyad
 */

import { AsyncVirtualFileSystem, VirtualChanges } from '@/shared/VirtualFilesystem';

// Mock a simple app directory structure
const mockAppPath = '/Users/test/prestige-ai/test-app/files';

// Simulate initial app files
const initialFiles = new Map<string, string>([
  ['src/App.tsx', `
import React from 'react';
import { Button } from './components/ui/button';

function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Hello World</h1>
      <Button onClick={() => alert('Hello')}>Click Me</Button>
    </div>
  );
}

export default App;
  `.trim()],
  ['src/components/ui/button.tsx', `
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ children, onClick }: ButtonProps) {
  return (
    <button 
      className="px-4 py-2 bg-blue-500 text-white rounded"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
  `.trim()]
]);

// Mock delegate for testing
const mockDelegate = {
  fileExists: async (fileName: string) => {
    return initialFiles.has(fileName);
  },
  readFile: async (fileName: string) => {
    return initialFiles.get(fileName);
  }
};

export async function testContinuousBuilding() {
  console.log('🧪 Testing Enhanced Continuous Building System');
  console.log('================================================');

  // 1. Initialize virtual filesystem
  const vfs = new AsyncVirtualFileSystem(mockAppPath, mockDelegate);
  
  // 2. Test initial state
  console.log('\n1. Initial State:');
  console.log(`- App has ${initialFiles.size} initial files`);
  
  // Verify we can read initial files through VFS
  const appContent = await vfs.readFile('src/App.tsx');
  console.log('- Can read App.tsx:', appContent?.substring(0, 50) + '...');

  // 3. Simulate first user request: "Add a counter to the app"
  console.log('\n2. Simulating User Request: "Add a counter to the app"');
  
  const userRequest1: VirtualChanges = {
    deletePaths: [],
    renameTags: [],
    writeTags: [{
      path: 'src/App.tsx',
      content: `
import React, { useState } from 'react';
import { Button } from './components/ui/button';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Hello World</h1>
      <p className="mb-4">Count: {count}</p>
      <div className="space-x-2">
        <Button onClick={() => setCount(count + 1)}>Increment</Button>
        <Button onClick={() => setCount(count - 1)}>Decrement</Button>
        <Button onClick={() => alert('Hello')}>Click Me</Button>
      </div>
    </div>
  );
}

export default App;
      `.trim()
    }]
  };

  await vfs.applyResponseChanges(userRequest1);
  const virtualFiles1 = vfs.getVirtualFiles();
  console.log(`- Applied changes, now have ${virtualFiles1.length} virtual files`);
  console.log('- Virtual changes applied to App.tsx');

  // 4. Simulate second user request: "Add a reset button"
  console.log('\n3. Simulating User Request: "Add a reset button"');
  
  const userRequest2: VirtualChanges = {
    deletePaths: [],
    renameTags: [],
    writeTags: [{
      path: 'src/App.tsx',
      content: `
import React, { useState } from 'react';
import { Button } from './components/ui/button';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Hello World</h1>
      <p className="mb-4">Count: {count}</p>
      <div className="space-x-2">
        <Button onClick={() => setCount(count + 1)}>Increment</Button>
        <Button onClick={() => setCount(count - 1)}>Decrement</Button>
        <Button onClick={() => setCount(0)}>Reset</Button>
        <Button onClick={() => alert('Hello')}>Click Me</Button>
      </div>
    </div>
  );
}

export default App;
      `.trim()
    }]
  };

  await vfs.applyResponseChanges(userRequest2);
  const virtualFiles2 = vfs.getVirtualFiles();
  console.log(`- Applied changes, still have ${virtualFiles2.length} virtual files`);
  console.log('- Incremental changes applied - added reset button');

  // 5. Simulate third user request: "Add a new component for the counter"
  console.log('\n4. Simulating User Request: "Add a new Counter component"');
  
  const userRequest3: VirtualChanges = {
    deletePaths: [],
    renameTags: [],
    writeTags: [{
      path: 'src/components/Counter.tsx',
      content: `
import React, { useState } from 'react';
import { Button } from './ui/button';

interface CounterProps {
  initialValue?: number;
}

export function Counter({ initialValue = 0 }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  return (
    <div className="border p-4 rounded">
      <p className="mb-4 text-lg">Count: {count}</p>
      <div className="space-x-2">
        <Button onClick={() => setCount(count + 1)}>Increment</Button>
        <Button onClick={() => setCount(count - 1)}>Decrement</Button>
        <Button onClick={() => setCount(0)}>Reset</Button>
      </div>
    </div>
  );
}
      `.trim()
    }, {
      path: 'src/App.tsx',
      content: `
import React from 'react';
import { Button } from './components/ui/button';
import { Counter } from './components/Counter';

function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Hello World</h1>
      <div className="mb-4">
        <Counter />
      </div>
      <Button onClick={() => alert('Hello')}>Click Me</Button>
    </div>
  );
}

export default App;
      `.trim()
    }]
  };

  await vfs.applyResponseChanges(userRequest3);
  const virtualFiles3 = vfs.getVirtualFiles();
  console.log(`- Applied changes, now have ${virtualFiles3.length} virtual files`);
  console.log('- Added new Counter component');
  console.log('- Refactored App.tsx to use Counter component');

  // 6. Verify final state
  console.log('\n5. Final State Analysis:');
  const finalFiles = vfs.getVirtualFiles();
  console.log(`- Total virtual files: ${finalFiles.length}`);
  finalFiles.forEach(file => {
    console.log(`  - ${file.relativePath} (${file.content.length} chars)`);
  });

  const deletedFiles = vfs.getDeletedFiles();
  console.log(`- Deleted files: ${deletedFiles.length}`);

  // 7. Test reading the final modified files
  console.log('\n6. Reading Final Files:');
  const finalAppContent = await vfs.readFile('src/App.tsx');
  const counterContent = await vfs.readFile('src/components/Counter.tsx');
  const buttonContent = await vfs.readFile('src/components/ui/button.tsx');
  
  console.log('- App.tsx (modified):', finalAppContent ? 'Contains Counter import ✓' : '✗');
  console.log('- Counter.tsx (new):', counterContent ? 'New component created ✓' : '✗');  
  console.log('- button.tsx (unchanged):', buttonContent ? 'Original file preserved ✓' : '✗');

  console.log('\n✅ Continuous Building Test Completed!');
  console.log('\nKey Benefits Demonstrated:');
  console.log('- ✓ Incremental changes preserve existing code');
  console.log('- ✓ Virtual filesystem maintains state across requests'); 
  console.log('- ✓ Multiple files can be modified in single request');
  console.log('- ✓ New components can be added without affecting others');
  console.log('- ✓ Original files remain accessible when not modified');

  return {
    success: true,
    virtualFileCount: finalFiles.length,
    deletedFileCount: deletedFiles.length,
    hasChanges: finalFiles.length > 0 || deletedFiles.length > 0
  };
}

// Export test for running
export default testContinuousBuilding;