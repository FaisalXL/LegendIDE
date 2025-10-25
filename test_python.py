#!/usr/bin/env python3

def main():
    print("🐍 Hello from Python!")
    print("This is a test of the enhanced run button.")
    
    # Simple calculation
    numbers = [1, 2, 3, 4, 5]
    total = sum(numbers)
    print(f"Sum of {numbers} = {total}")
    
    # List comprehension
    squares = [x**2 for x in numbers]
    print(f"Squares: {squares}")

if __name__ == "__main__":
    main()