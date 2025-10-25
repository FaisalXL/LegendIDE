#!/usr/bin/env ruby

def main
    puts "💎 Hello from Ruby!"
    puts "This is a test of the enhanced run button."
    
    # Simple calculation
    numbers = [1, 2, 3, 4, 5]
    total = numbers.sum
    puts "Sum of #{numbers} = #{total}"
    
    # Map method
    squares = numbers.map { |x| x ** 2 }
    puts "Squares: #{squares}"
    
    # Block example
    puts "Numbers greater than 2:"
    numbers.select { |x| x > 2 }.each { |x| puts "  #{x}" }
    
    puts "Ruby is elegant! ✨"
end

main