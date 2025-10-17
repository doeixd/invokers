// test/random-commands.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InvokerManager } from '../src/core';
import { registerRandomCommands, resetRandomSeed } from '../src/commands/random';

describe('Random Commands', () => {
  let invokerInstance: InvokerManager;

  beforeEach(() => {
    // Clear the DOM
    document.body.innerHTML = '';

    // Get singleton instance and reset it
    invokerInstance = InvokerManager.getInstance();
    invokerInstance.reset();

    // Register random commands
    registerRandomCommands(invokerInstance);

    // Ensure listeners are attached for test environment
    invokerInstance.ensureListenersAttached();

    // Reset random seed before each test
    resetRandomSeed();
  });

  afterEach(() => {
    // Clean up
    resetRandomSeed();
  });

  describe('--random:choice', () => {
    it('should pick a random item from a datalist', async () => {
      document.body.innerHTML = `
        <datalist id="colors">
          <option value="red">
          <option value="blue">
          <option value="green">
        </datalist>
        <button id="btn" command="--random:choice:colors" commandfor="output">Pick Color</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      await invokerInstance.executeCommand('--random:choice:colors', 'output', button);

      expect(['red', 'blue', 'green']).toContain(output.textContent);
      expect(['red', 'blue', 'green']).toContain(output.dataset.randomValue);
    });

    it('should pick a random item from a datalist with comma-separated text', async () => {
      document.body.innerHTML = `
        <datalist id="fruits">apple,banana,cherry,date</datalist>
        <button id="btn" command="--random:choice:fruits" commandfor="output">Pick Fruit</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      await invokerInstance.executeCommand('--random:choice:fruits', 'output', button);

      expect(['apple', 'banana', 'cherry', 'date']).toContain(output.textContent);
    });

    it('should pick a random item from a template with comma-separated text', async () => {
      document.body.innerHTML = `
        <template id="animals">dog,cat,bird,fish</template>
        <button id="btn" command="--random:choice:animals" commandfor="output">Pick Animal</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      await invokerInstance.executeCommand('--random:choice:animals', 'output', button);

      expect(['dog', 'cat', 'bird', 'fish']).toContain(output.textContent);
    });

    it('should throw error if list not found', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:choice:nonexistent" commandfor="output">Pick</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      await expect(
        invokerInstance.executeCommand('--random:choice:nonexistent', 'output', button)
      ).rejects.toThrow();
    });

    it('should throw error if no list ID provided', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:choice" commandfor="output">Pick</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      await expect(
        invokerInstance.executeCommand('--random:choice', 'output', button)
      ).rejects.toThrow();
    });
  });

  describe('--random:concat', () => {
    it('should concatenate random choices from multiple lists', async () => {
      document.body.innerHTML = `
        <datalist id="adjectives">big,small,fast</datalist>
        <datalist id="colors">red,blue,green</datalist>
        <datalist id="nouns">car,house,tree</datalist>
        <button id="btn" command="--random:concat:adjectives:colors:nouns"
                data-separator=" "
                commandfor="output">Generate</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      await invokerInstance.executeCommand('--random:concat:adjectives:colors:nouns', 'output', button);

      const text = output.textContent || '';
      const parts = text.split(' ');

      expect(parts.length).toBe(3);
      expect(['big', 'small', 'fast']).toContain(parts[0]);
      expect(['red', 'blue', 'green']).toContain(parts[1]);
      expect(['car', 'house', 'tree']).toContain(parts[2]);
    });

    it('should use default separator (space) if not specified', async () => {
      document.body.innerHTML = `
        <datalist id="words1">hello,hi</datalist>
        <datalist id="words2">world,earth</datalist>
        <button id="btn" command="--random:concat:words1:words2"
                commandfor="output">Generate</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      await invokerInstance.executeCommand('--random:concat:words1:words2', 'output', button);

      expect(output.textContent).toMatch(/^(hello|hi) (world|earth)$/);
    });

    it('should use custom separator', async () => {
      document.body.innerHTML = `
        <datalist id="words1">hello,hi</datalist>
        <datalist id="words2">world,earth</datalist>
        <button id="btn" command="--random:concat:words1:words2"
                data-separator="-"
                commandfor="output">Generate</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      await invokerInstance.executeCommand('--random:concat:words1:words2', 'output', button);

      expect(output.textContent).toMatch(/^(hello|hi)-(world|earth)$/);
    });

    it('should store individual values in dataset', async () => {
      document.body.innerHTML = `
        <datalist id="list1">a</datalist>
        <datalist id="list2">b</datalist>
        <datalist id="list3">c</datalist>
        <button id="btn" command="--random:concat:list1:list2:list3"
                commandfor="output">Generate</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      await invokerInstance.executeCommand('--random:concat:list1:list2:list3', 'output', button);

      expect(output.dataset.randomValue0).toBe('a');
      expect(output.dataset.randomValue1).toBe('b');
      expect(output.dataset.randomValue2).toBe('c');
      expect(output.dataset.randomValue).toBe('a b c');
    });

    it('should throw error if no list IDs provided', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:concat" commandfor="output">Generate</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      await expect(
        invokerInstance.executeCommand('--random:concat', 'output', button)
      ).rejects.toThrow();
    });
  });

  describe('--random:number', () => {
    it('should generate a random number between min and max', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:number:1:10" commandfor="output">Generate</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      await invokerInstance.executeCommand('--random:number:1:10', 'output', button);

      const num = parseInt(output.textContent || '0', 10);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(10);
      expect(output.dataset.randomValue).toBe(String(num));
    });

    it('should generate numbers in the correct range (0 to 1000)', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:number:0:1000" commandfor="output">Generate</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      // Test multiple times to ensure range is correct
      for (let i = 0; i < 10; i++) {
        await invokerInstance.executeCommand('--random:number:0:1000', 'output', button);
        const num = parseInt(output.textContent || '0', 10);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThanOrEqual(1000);
      }
    });

    it('should handle min === max', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:number:5:5" commandfor="output">Generate</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      await invokerInstance.executeCommand('--random:number:5:5', 'output', button);

      expect(output.textContent).toBe('5');
    });

    it('should throw error if min or max missing', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:number:1" commandfor="output">Generate</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      await expect(
        invokerInstance.executeCommand('--random:number:1', 'output', button)
      ).rejects.toThrow();
    });

    it('should throw error if values are not integers', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:number:abc:xyz" commandfor="output">Generate</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      await expect(
        invokerInstance.executeCommand('--random:number:abc:xyz', 'output', button)
      ).rejects.toThrow();
    });

    it('should throw error if min > max', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:number:10:1" commandfor="output">Generate</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      await expect(
        invokerInstance.executeCommand('--random:number:10:1', 'output', button)
      ).rejects.toThrow();
    });
  });

  describe('--random:seed', () => {
    it('should produce reproducible random numbers', async () => {
      document.body.innerHTML = `
        <button id="seed-btn" command="--random:seed:12345" commandfor="">Set Seed</button>
        <button id="num-btn" command="--random:number:1:100" commandfor="output">Generate</button>
        <span id="output"></span>
      `;

      const seedBtn = document.getElementById('seed-btn') as HTMLButtonElement;
      const numBtn = document.getElementById('num-btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      // Set seed and generate first number
      await invokerInstance.executeCommand('--random:seed:12345', '', seedBtn);
      await invokerInstance.executeCommand('--random:number:1:100', 'output', numBtn);
      const firstNum = output.textContent;

      // Reset seed and generate again
      await invokerInstance.executeCommand('--random:seed:12345', '', seedBtn);
      await invokerInstance.executeCommand('--random:number:1:100', 'output', numBtn);
      const secondNum = output.textContent;

      expect(firstNum).toBe(secondNum);
    });

    it('should produce reproducible random choices', async () => {
      document.body.innerHTML = `
        <datalist id="items">apple,banana,cherry,date,elderberry</datalist>
        <button id="seed-btn" command="--random:seed:99999" commandfor="">Set Seed</button>
        <button id="choice-btn" command="--random:choice:items" commandfor="output">Pick</button>
        <span id="output"></span>
      `;

      const seedBtn = document.getElementById('seed-btn') as HTMLButtonElement;
      const choiceBtn = document.getElementById('choice-btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      // Set seed and generate first choice
      await invokerInstance.executeCommand('--random:seed:99999', '', seedBtn);
      await invokerInstance.executeCommand('--random:choice:items', 'output', choiceBtn);
      const firstChoice = output.textContent;

      // Reset seed and generate again
      await invokerInstance.executeCommand('--random:seed:99999', '', seedBtn);
      await invokerInstance.executeCommand('--random:choice:items', 'output', choiceBtn);
      const secondChoice = output.textContent;

      expect(firstChoice).toBe(secondChoice);
    });

    it('should throw error if seed is not a number', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:seed:notanumber" commandfor="">Set Seed</button>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      await expect(
        invokerInstance.executeCommand('--random:seed:notanumber', '', button)
      ).rejects.toThrow();
    });

    it('should throw error if no seed provided', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:seed" commandfor="">Set Seed</button>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      await expect(
        invokerInstance.executeCommand('--random:seed', '', button)
      ).rejects.toThrow();
    });
  });

  describe('--random:uuid', () => {
    it('should generate a valid UUID v4', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:uuid" commandfor="output">Generate UUID</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      await invokerInstance.executeCommand('--random:uuid', 'output', button);

      const uuid = output.textContent || '';

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(output.dataset.randomValue).toBe(uuid);
    });

    it('should generate unique UUIDs', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:uuid" commandfor="output">Generate UUID</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      const uuids = new Set<string>();

      // Generate 10 UUIDs and ensure they're all unique
      for (let i = 0; i < 10; i++) {
        await invokerInstance.executeCommand('--random:uuid', 'output', button);
        uuids.add(output.textContent || '');
      }

      expect(uuids.size).toBe(10);
    });
  });

  describe('--random:store', () => {
    it('should store random choice in dataset with custom key', async () => {
      document.body.innerHTML = `
        <datalist id="colors">red,blue,green</datalist>
        <button id="btn" command="--random:store:colors:myColor" commandfor="output">Store</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--random:store:colors:myColor', 'output', button);

      expect(['red', 'blue', 'green']).toContain(output.dataset.myColor);
      // Should not set textContent, only dataset
      expect(output.textContent).toBe('');
    });

    it('should store random choice in dataset with default key', async () => {
      document.body.innerHTML = `
        <datalist id="fruits">apple,banana,cherry</datalist>
        <button id="btn" command="--random:store:fruits" commandfor="output">Store</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--random:store:fruits', 'output', button);

      expect(['apple', 'banana', 'cherry']).toContain(output.dataset.randomValue);
    });

    it('should throw error if list not found', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:store:nonexistent:key" commandfor="output">Store</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      await expect(
        invokerInstance.executeCommand('--random:store:nonexistent:key', 'output', button)
      ).rejects.toThrow();
    });

    it('should throw error if no list ID provided', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--random:store" commandfor="output">Store</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      await expect(
        invokerInstance.executeCommand('--random:store', 'output', button)
      ).rejects.toThrow();
    });
  });

  describe('Integration tests', () => {
    it('should work with command chaining', async () => {
      document.body.innerHTML = `
        <datalist id="words">hello,world,test</datalist>
        <button id="btn" command="--random:choice:words"
                commandfor="output"
                data-and-then="--class:add:highlighted"
                data-then-target="output">Pick and Highlight</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      await invokerInstance.executeCommand('--random:choice:words', 'output', button);

      expect(['hello', 'world', 'test']).toContain(output.textContent);
      // Note: In real usage, chaining would add the class, but that requires additional commands registered
    });

    it('should generate realistic benchmark-style labels', async () => {
      document.body.innerHTML = `
        <datalist id="adjectives">big,small,fast,slow,bright,dark</datalist>
        <datalist id="colors">red,blue,green,yellow,purple,orange</datalist>
        <datalist id="nouns">car,house,tree,dog,cat,book</datalist>
        <button id="btn" command="--random:concat:adjectives:colors:nouns"
                data-separator=" "
                commandfor="output">Generate Label</button>
        <span id="output"></span>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLSpanElement;

      // Generate 10 labels and verify they all match the expected pattern
      for (let i = 0; i < 10; i++) {
        await invokerInstance.executeCommand('--random:concat:adjectives:colors:nouns', 'output', button);

        const text = output.textContent || '';
        const parts = text.split(' ');

        expect(parts.length).toBe(3);
        expect(['big', 'small', 'fast', 'slow', 'bright', 'dark']).toContain(parts[0]);
        expect(['red', 'blue', 'green', 'yellow', 'purple', 'orange']).toContain(parts[1]);
        expect(['car', 'house', 'tree', 'dog', 'cat', 'book']).toContain(parts[2]);
      }
    });
  });
});
