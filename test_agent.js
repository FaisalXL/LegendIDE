#!/usr/bin/env node

function main() {
    console.log("🤖 Hello from test_agent.js!");
    console.log("This is a test file for the agent system.");
    
    // Test basic functionality
    const testData = {
        name: "Agent Test",
        timestamp: new Date().toISOString(),
        status: "running"
    };
    
    console.log("Test Data:", JSON.stringify(testData, null, 2));
    
    // Simple test operations
    const numbers = [10, 20, 30, 40, 50];
    const sum = numbers.reduce((acc, val) => acc + val, 0);
    const average = sum / numbers.length;
    
    console.log(`Numbers: [${numbers.join(', ')}]`);
    console.log(`Sum: ${sum}`);
    console.log(`Average: ${average}`);
    
    console.log("✅ Test completed successfully!");
}

main();
