#!/usr/bin/env node

function main() {
    console.log("🚀 Hello from JavaScript!");
    console.log("This is a test of the enhanced run button.");
    
    // Simple calculation
    const numbers = [1, 2, 3, 4, 5];
    const total = numbers.reduce((sum, num) => sum + num, 0);
    console.log(`Sum of [${numbers.join(', ')}] = ${total}`);
    
    // Map function
    const squares = numbers.map(x => x ** 2);
    console.log(`Squares: [${squares.join(', ')}]`);
    
    // Arrow function and template literals
    const greet = (name) => `Hello, ${name}!`;
    console.log(greet("World"));
}

main();