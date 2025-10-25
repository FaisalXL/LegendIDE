#include <iostream>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;
    cout << "Execution test successful!" << endl;
    
    // Simple calculation
    int sum = 0;
    for (int i = 1; i <= 5; i++) {
        sum += i;
    }
    cout << "Sum of 1-5 = " << sum << endl;
    
    return 0;
}