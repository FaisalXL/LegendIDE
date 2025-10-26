#!/usr/bin/env node

function main() {
    console.log("🎮 Simulation Test Started");
    console.log("=" .repeat(50));
    
    // Simulate a simple physics calculation
    const gravity = 9.81; // m/s^2
    const initialVelocity = 20; // m/s
    const angle = 45; // degrees
    
    // Convert angle to radians
    const angleRad = angle * Math.PI / 180;
    
    // Calculate components
    const vx = initialVelocity * Math.cos(angleRad);
    const vy = initialVelocity * Math.sin(angleRad);
    
    console.log("\n📊 Projectile Motion Simulation:");
    console.log(`Initial Velocity: ${initialVelocity} m/s`);
    console.log(`Launch Angle: ${angle}°`);
    console.log(`Horizontal Velocity: ${vx.toFixed(2)} m/s`);
    console.log(`Vertical Velocity: ${vy.toFixed(2)} m/s`);
    
    // Calculate time of flight
    const timeOfFlight = (2 * vy) / gravity;
    console.log(`Time of Flight: ${timeOfFlight.toFixed(2)} seconds`);
    
    // Calculate maximum height
    const maxHeight = (vy * vy) / (2 * gravity);
    console.log(`Maximum Height: ${maxHeight.toFixed(2)} meters`);
    
    // Calculate range
    const range = vx * timeOfFlight;
    console.log(`Range: ${range.toFixed(2)} meters`);
    
    // Simulate trajectory points
    console.log("\n📍 Trajectory Points:");
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
        const t = (timeOfFlight / steps) * i;
        const x = vx * t;
        const y = vy * t - 0.5 * gravity * t * t;
        console.log(`  t=${t.toFixed(2)}s: x=${x.toFixed(2)}m, y=${Math.max(0, y).toFixed(2)}m`);
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("✅ Simulation Complete!");
}

main();
