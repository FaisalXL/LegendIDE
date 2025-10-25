package main

import (
    "fmt"
)

func main() {
    fmt.Println("🐹 Hello from Go!")
    fmt.Println("This is a test of the enhanced run button.")
    
    // Simple calculation
    numbers := []int{1, 2, 3, 4, 5}
    total := 0
    for _, num := range numbers {
        total += num
    }
    fmt.Printf("Sum of %v = %d\n", numbers, total)
    
    // Squares using a slice
    squares := make([]int, len(numbers))
    for i, num := range numbers {
        squares[i] = num * num
    }
    fmt.Printf("Squares: %v\n", squares)
    
    // Goroutine example (simple)
    fmt.Println("Go is fast and concurrent! 🚀")
}