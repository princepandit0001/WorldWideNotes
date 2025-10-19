// SIMPLE JSONBIN TEST - Basic functionality test
console.log('🧪 Simple JSONBin test script loaded');

// Simple test function
async function simpleJSONBinTest() {
    console.log('🧪 Starting simple JSONBin test...');
    
    const masterKey = '$2a$10$IFTGqeii/sqpc0hKBuRC..1n7Xame/tYb95uWW2s/.v4ZlqnfUufO';
    const binId = '68f462e1d0ea881f40ab293d';
    const apiUrl = 'https://api.jsonbin.io/v3';
    
    try {
        // Test 1: Basic API availability
        console.log('🧪 Test 1: Checking JSONBin API availability...');
        const basicResponse = await fetch('https://api.jsonbin.io/v3', {
            method: 'GET'
        });
        console.log('✅ JSONBin API is available');
        
        // Test 2: Bin access
        console.log('🧪 Test 2: Testing bin access...');
        const headers = {
            'Content-Type': 'application/json',
            'X-Master-Key': masterKey
        };
        
        const binResponse = await fetch(`${apiUrl}/b/${binId}/latest`, {
            method: 'GET',
            headers: headers
        });
        
        console.log('📡 Bin response status:', binResponse.status);
        
        if (binResponse.ok) {
            const data = await binResponse.json();
            console.log('✅ Bin access successful!');
            console.log('📄 Bin data:', data);
            return { success: true, data: data };
        } else {
            const errorText = await binResponse.text();
            console.error('❌ Bin access failed:', binResponse.status, errorText);
            return { success: false, error: `${binResponse.status}: ${errorText}` };
        }
        
    } catch (error) {
        console.error('❌ JSONBin test failed:', error);
        return { success: false, error: error.message };
    }
}

// Make it globally available
window.simpleJSONBinTest = simpleJSONBinTest;

console.log('🧪 Simple JSONBin test ready!');